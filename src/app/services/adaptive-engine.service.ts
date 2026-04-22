import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { ActivityService } from './activity.service';
import { DietService } from './diet.service';
import { AuthService } from './auth.service';
import { AdaptiveHistoryPoint, DailyAdaptiveState, GoalPrediction, MacroAdjustment, RecoveryStatus, WorkoutIntensity } from '../models/adaptive.model';
import { User, WeeklyProgress } from '../models/user.model';
import { DailyDietPlan } from '../models/diet.model';

@Injectable({
  providedIn: 'root'
})
export class AdaptiveEngineService {
  /** Current day's adaptive state (drives AI coach card). */
  todayAdaptiveState = signal<DailyAdaptiveState | null>(null);

  /** Recent fatigue history for lightweight trend visualization. */
  fatigueHistory = signal<AdaptiveHistoryPoint[]>([]);

  private readonly STORAGE_KEY_PREFIX = 'adaptive_state_';

  constructor(
    private storage: StorageService,
    private activityService: ActivityService,
    private dietService: DietService,
    private authService: AuthService
  ) {
    this.loadTodayState();
    this.loadFatigueHistory();
  }

  private get todayKey(): string {
    const today = new Date().toISOString().split('T')[0];
    return `${this.STORAGE_KEY_PREFIX}${today}`;
  }

  private async loadTodayState() {
    const stored = await this.storage.get<DailyAdaptiveState>(this.todayKey);
    if (stored) {
      this.todayAdaptiveState.set(stored);
    } else {
      // Initialize with default, using current activity/diet snapshots
      const initial = this.buildState(null);
      this.todayAdaptiveState.set(initial);
      await this.storage.set(this.todayKey, initial);
    }
  }

  /** User manually logs last night's sleep (in hours). */
  async setTodaySleep(hours: number) {
    const sanitized = Number.isFinite(hours) && hours > 0 && hours < 16 ? hours : 7;
    const updated = this.buildState(sanitized);
    this.todayAdaptiveState.set(updated);
    await this.storage.set(this.todayKey, updated);
    await this.loadFatigueHistory();
  }

  /** Recompute using last known sleep (if any). Useful after big data changes. */
  async recompute() {
    const current = this.todayAdaptiveState();
    const hours = current?.sleepHours ?? null;
    const updated = this.buildState(hours);
    this.todayAdaptiveState.set(updated);
    await this.storage.set(this.todayKey, updated);
    await this.loadFatigueHistory();
  }

  private buildState(sleepHours: number | null): DailyAdaptiveState {
    const today = new Date().toISOString().split('T')[0];

    const activity = this.activityService.todayActivity();
    const weekly = this.activityService.weeklyProgress();
    const dietPlan = this.dietService.todayPlan();

    const fatigueScore = this.computeFatigueScore(
      sleepHours,
      activity.activeMinutes,
      weekly?.days.map(d => d.workoutsCompleted) || []
    );
    const recoveryStatus = this.getRecoveryStatus(fatigueScore);
    const workoutRecommendation = this.getWorkoutRecommendation(fatigueScore, recoveryStatus);
    const dietRecommendation = this.getDietRecommendation(dietPlan, fatigueScore);

    const overtraining = this.detectOvertraining(
      fatigueScore,
      activity.activeMinutes,
      weekly,
      dietPlan
    );

    const user = this.authService.currentUser();
    const goalPrediction = this.buildGoalPrediction(user, weekly, dietPlan);

    const summaryMessage = this.buildSummaryMessage(recoveryStatus, workoutRecommendation.intensity, dietRecommendation);

    return {
      date: today,
      sleepHours,
      fatigueScore,
      recoveryStatus,
      workoutRecommendation,
      dietRecommendation,
      summaryMessage,
      overtraining,
      goalPrediction
    };
  }

  private computeFatigueScore(
    sleepHours: number | null,
    todayActiveMinutes: number,
    weeklyWorkouts: number[]
  ): number {
    // Start from neutral
    let score = 50;

    const sleep = sleepHours ?? 7; // assume decent if unknown

    // Sleep effect
    if (sleep < 6) {
      score += (6 - sleep) * 8; // strong penalty
    } else if (sleep >= 6 && sleep <= 8) {
      score -= (sleep - 6) * 5; // better recovery
    } else if (sleep > 8) {
      score -= 8; // cap benefit
    }

    // Recent workload: last 3 days workouts volume
    const last3 = weeklyWorkouts.slice(-3);
    const recentWorkouts = last3.reduce((sum, w) => sum + w, 0);
    if (recentWorkouts >= 5) {
      score += 15; // heavy block
    } else if (recentWorkouts >= 3) {
      score += 8;
    } else if (recentWorkouts === 0) {
      score -= 5; // extra fresh
    }

    // Today's activity (if already high before planning)
    if (todayActiveMinutes > 60) {
      score += 10;
    } else if (todayActiveMinutes < 20) {
      score -= 5;
    }

    // Clamp
    if (score < 0) score = 0;
    if (score > 100) score = 100;

    return score;
  }

  private getRecoveryStatus(score: number): RecoveryStatus {
    if (score >= 70) return 'under-recovered';
    if (score <= 35) return 'fresh';
    return 'balanced';
  }

  private getWorkoutRecommendation(score: number, status: RecoveryStatus): DailyAdaptiveState['workoutRecommendation'] {
    let intensity: WorkoutIntensity;
    let label: string;
    let description: string;

    if (score >= 85) {
      intensity = 'rest';
      label = 'Full Recovery Day';
      description = 'Prioritize rest, light walking, and mobility. Avoid structured training today.';
    } else if (status === 'under-recovered') {
      intensity = 'light';
      label = 'Light Recovery Workout';
      description = 'Focus on low-intensity cardio, stretching, or yoga to promote recovery.';
    } else if (status === 'balanced') {
      intensity = 'moderate';
      label = 'Standard Training Day';
      description = 'Perform your regular workout at moderate intensity with controlled volume.';
    } else {
      intensity = 'intense';
      label = 'Performance Day';
      description = 'You are well recovered—schedule a challenging workout or progression session.';
    }

    return { intensity, label, description };
  }

  private getDietRecommendation(plan: DailyDietPlan | null, fatigueScore: number): DailyAdaptiveState['dietRecommendation'] {
    let proteinAdjustment: MacroAdjustment = 'maintain';
    let calorieAdjustment: MacroAdjustment = 'maintain';
    let notes = 'Maintain your current balanced meal plan.';

    if (plan) {
      const { totalCalories, targetCalories } = plan;

      // Calorie guidance against target
      if (totalCalories < targetCalories * 0.9) {
        calorieAdjustment = 'increase';
      } else if (totalCalories > targetCalories * 1.1) {
        calorieAdjustment = 'reduce';
      }

      // Protein estimation from meals (if macros provided)
      let proteinGrams = 0;
      for (const meal of plan.meals) {
        for (const item of meal.items) {
          if (item.protein) {
            proteinGrams += item.protein;
          }
        }
      }

      // Heuristic: aim for at least ~1.4g/kg assuming 70kg if unknown
      const assumedWeight = 70;
      const targetProtein = assumedWeight * 1.4;
      if (proteinGrams < targetProtein * 0.9) {
        proteinAdjustment = 'increase';
      } else if (proteinGrams > targetProtein * 1.4) {
        proteinAdjustment = 'reduce';
      }
    }

    // Adjust message by fatigue state
    if (fatigueScore >= 70) {
      notes = 'Increase lean protein and micronutrient-dense foods to support recovery. Stay well hydrated.';
    } else if (fatigueScore <= 35) {
      notes = 'You are fresh—ensure sufficient carbs around your workout to fuel performance.';
    }

    return { proteinAdjustment, calorieAdjustment, notes };
  }

  private async loadFatigueHistory(days: number = 7) {
    const dates: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const history: AdaptiveHistoryPoint[] = [];
    for (const date of dates) {
      const key = `${this.STORAGE_KEY_PREFIX}${date}`;
      const state = await this.storage.get<DailyAdaptiveState>(key);
      if (state) {
        history.push({
          date,
          fatigueScore: state.fatigueScore,
          isOvertrainingRisk: state.overtraining?.isAtRisk ?? false
        });
      }
    }

    this.fatigueHistory.set(history);
  }

  /**
   * Rule-based smart fatigue / overtraining detection.
   * Heuristic: high fatigue + rising workload + low energy intake and/or dropping weekly volume.
   */
  private detectOvertraining(
    fatigueScore: number,
    todayActiveMinutes: number,
    weekly: WeeklyProgress | null,
    dietPlan: DailyDietPlan | null
  ): DailyAdaptiveState['overtraining'] {
    let isAtRisk = false;
    let message: string | null = null;

    // Approximate "performance" as average daily workouts / active minutes trend
    let avgWorkouts = 0;
    let last3Workouts = 0;
    if (weekly) {
      const days = weekly.days;
      if (days.length) {
        avgWorkouts = days.reduce((sum: any, d: { workoutsCompleted: any; }) => sum + d.workoutsCompleted, 0) / days.length;
        const last3 = days.slice(-3);
        last3Workouts = last3.reduce((sum: any, d: { workoutsCompleted: any; }) => sum + d.workoutsCompleted, 0) / Math.max(last3.length, 1);
      }
    }

    // Diet context
    let caloriesLow = false;
    if (dietPlan) {
      const { totalCalories, targetCalories } = dietPlan;
      if (totalCalories < targetCalories * 0.8) {
        caloriesLow = true; // significantly below target
      }
    }

    // Core rule: very high fatigue + longer sessions + low calories
    const longSession = todayActiveMinutes >= 75;
    const workloadUp = last3Workouts > avgWorkouts + 0.3; // meaningful bump in frequency

    if (fatigueScore >= 80 && longSession && caloriesLow) {
      isAtRisk = true;
    } else if (fatigueScore >= 70 && workloadUp && caloriesLow) {
      isAtRisk = true;
    }

    if (isAtRisk) {
      message = '⚠️ You are overtraining. Take rest.';
    }

    return { isAtRisk, message };
  }

  /**
   * Simple goal prediction: estimate days to reach a target weight
   * based on current weight, weekly workout consistency, and diet balance.
   */
  private buildGoalPrediction(
    user: User | null,
    weekly: WeeklyProgress | null,
    dietPlan: DailyDietPlan | null
  ): GoalPrediction | null {
    if (!user || typeof user.weight !== 'number' || user.weight <= 0) {
      return null;
    }

    const currentWeight = user.weight;

    // Choose a simple target around 70kg when above, or a modest change otherwise
    let targetWeight = currentWeight;
    if (currentWeight > 72) {
      targetWeight = 70;
    } else if (currentWeight > 60) {
      targetWeight = Math.round(currentWeight - 3);
    } else {
      targetWeight = Math.round(currentWeight + 3);
    }

    if (targetWeight === currentWeight) {
      return null;
    }

    // Workout consistency from weekly data
    let avgWorkoutsPerWeek = 0;
    if (weekly && weekly.days.length) {
      const totalWorkouts = weekly.days.reduce((sum, d) => sum + d.workoutsCompleted, 0);
      avgWorkoutsPerWeek = totalWorkouts / weekly.days.length * 7; // scale to 7 days
    }

    // Diet adherence: how close to target calories
    let dietScore = 0.5; // neutral
    if (dietPlan) {
      const { totalCalories, targetCalories } = dietPlan;
      if (targetCalories > 0) {
        const ratio = totalCalories / targetCalories;
        if (ratio >= 0.9 && ratio <= 1.1) {
          dietScore = 1;
        } else if (ratio >= 0.75 && ratio <= 1.25) {
          dietScore = 0.7;
        } else {
          dietScore = 0.4;
        }
      }
    }

    // Consistency factor 0–1
    const workoutScore = Math.min(avgWorkoutsPerWeek / 4, 1); // 4+ structured workouts/week is "high"
    const consistency = Math.max(0.1, (workoutScore * 0.6) + (dietScore * 0.4));

    // Expected weekly change (kg/week), capped to safe values
    const losingWeight = targetWeight < currentWeight;
    const maxRate = losingWeight ? 0.8 : 0.4; // faster for loss than gain
    const kgPerWeek = Math.max(0.1, consistency * maxRate);

    const kgToChange = Math.abs(currentWeight - targetWeight);
    const weeks = kgToChange / kgPerWeek;
    const days = Math.round(weeks * 7);

    const clampedDays = Math.min(Math.max(days, 7), 365);

    let confidence: GoalPrediction['confidence'] = 'medium';
    if (consistency >= 0.8) {
      confidence = 'high';
    } else if (consistency <= 0.3) {
      confidence = 'low';
    }

    const directionText = losingWeight ? 'reach' : 'build up to';
    const message = `You can ${directionText} ${targetWeight}kg in about ${clampedDays} days if you keep this routine.`;

    return {
      targetWeightKg: targetWeight,
      estimatedDays: clampedDays,
      confidence,
      message
    };
  }

  private buildSummaryMessage(
    status: RecoveryStatus,
    intensity: WorkoutIntensity,
    diet: DailyAdaptiveState['dietRecommendation']
  ): string {
    const workoutPart =
      intensity === 'rest'
        ? 'Today is best used as a recovery day.'
        : intensity === 'light'
        ? 'Today do a light, recovery-focused workout.'
        : intensity === 'moderate'
        ? 'Today is suitable for a solid, moderate workout.'
        : 'You are ready for a high‑intensity or progression workout.';

    const dietPart =
      diet.proteinAdjustment === 'increase'
        ? 'Increase your protein intake slightly and keep meals evenly spaced.'
        : diet.calorieAdjustment === 'reduce'
        ? 'Slightly reduce overall calories while keeping protein adequate.'
        : 'Keep your current calorie intake and focus on whole foods.';

    const recoveryPart =
      status === 'under-recovered'
        ? 'Your recent load and/or sleep suggest higher fatigue—prioritize recovery.'
        : status === 'fresh'
        ? 'You appear well recovered and ready to push a bit harder.'
        : 'You are in a balanced state—stay consistent with training and nutrition.';

    return `${workoutPart} ${dietPart} ${recoveryPart}`;
  }
}
