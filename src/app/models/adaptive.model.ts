export type WorkoutIntensity = 'rest' | 'light' | 'moderate' | 'intense';

export type RecoveryStatus = 'under-recovered' | 'balanced' | 'fresh';

export type MacroAdjustment = 'increase' | 'maintain' | 'reduce';

export interface DailyAdaptiveState {
  /** ISO date for the day this recommendation applies to */
  date: string;
  /** User-reported sleep for the previous night (in hours) */
  sleepHours: number | null;
  /** 0 (no fatigue) → 100 (very fatigued/overreached) */
  fatigueScore: number;
  recoveryStatus: RecoveryStatus;

  workoutRecommendation: {
    intensity: WorkoutIntensity;
    label: string;
    description: string;
  };

  dietRecommendation: {
    proteinAdjustment: MacroAdjustment;
    calorieAdjustment: MacroAdjustment;
    notes: string;
  };

  /** Human-friendly daily summary combining workout, diet and recovery. */
  summaryMessage: string;

  /** Smart fatigue / overtraining detection */
  overtraining: {
    isAtRisk: boolean;
    message: string | null;
  };

  /** Predictive goal estimation based on current behavior. */
  goalPrediction: GoalPrediction | null;
}

export interface AdaptiveHistoryPoint {
  date: string;
  fatigueScore: number;
  isOvertrainingRisk: boolean;
}

export interface GoalPrediction {
  targetWeightKg: number;
  estimatedDays: number;
  confidence: 'low' | 'medium' | 'high';
  message: string;
}