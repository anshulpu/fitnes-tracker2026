import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  signal,
  untracked
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
  IonIcon, IonButton, IonProgressBar, IonModal, IonInput, IonLabel,
  IonItem, IonList, IonFab, IonFabButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  fastFood,
  cafe,
  pizza,
  restaurant,
  add,
  close,
  checkmark,
  trash,
  sparkles,
  barChart,
  water,
  flame,
  calendarOutline,
  trophy,
  remove
} from 'ionicons/icons';
import { Chart, type ChartConfiguration, registerables } from 'chart.js';
import { DietService } from '../services/diet.service';
import { MealType, MealItem } from '../models/diet.model';

Chart.register(...registerables);

type GoalType = 'weight-loss' | 'muscle-gain' | 'maintain';

interface HistoryDay {
  date: string;
  calories: number;
  targetCalories: number;
  waterGlasses: number;
  goalMet: boolean;
}

@Component({
  selector: 'app-diet',
  templateUrl: './diet.page.html',
  styleUrls: ['./diet.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonIcon, IonButton, IonProgressBar, IonModal,
    IonInput, IonLabel, IonItem, IonList, IonFab, IonFabButton
  ]
})
export class DietPage implements AfterViewInit, OnDestroy {
  @ViewChild('weeklyCanvas') weeklyCanvas?: ElementRef<HTMLCanvasElement>;

  todayPlan = this.dietService.todayPlan;
  isModalOpen = signal(false);
  isHistoryModalOpen = signal(false);
  selectedMealType = signal<MealType>('breakfast');

  mealTypes: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
  goals: Array<{ key: GoalType; label: string; targetCalories: number; proteinTarget: number }> = [
    { key: 'weight-loss', label: 'Weight Loss', targetCalories: 1700, proteinTarget: 125 },
    { key: 'muscle-gain', label: 'Muscle Gain', targetCalories: 2400, proteinTarget: 165 },
    { key: 'maintain', label: 'Maintain', targetCalories: 2000, proteinTarget: 140 }
  ];

  selectedGoal = signal<GoalType>('maintain');
  waterGlasses = signal(0);
  readonly waterTarget = 8;
  private readonly historySeeded = signal(false);
  historyData = signal<HistoryDay[]>([]);

  itemName = signal('');
  calories = signal<number>(0);
  protein = signal<number>(0);
  carbs = signal<number>(0);
  fats = signal<number>(0);

  private weeklyChart: Chart | null = null;

  calorieProgress = computed(() => {
    const plan = this.todayPlan();
    if (!plan || plan.targetCalories <= 0) return 0;
    return Math.min(plan.totalCalories / plan.targetCalories, 1);
  });

  remainingCalories = computed(() => {
    const plan = this.todayPlan();
    if (!plan) return 0;
    return Math.max(plan.targetCalories - plan.totalCalories, 0);
  });

  totalProtein = computed(() => {
    const plan = this.todayPlan();
    if (!plan) return 0;

    return plan.meals.reduce((sum, meal) => {
      const mealProtein = meal.items.reduce((itemSum, item) => itemSum + (item.protein ?? 0), 0);
      return sum + mealProtein;
    }, 0);
  });

  proteinTarget = computed(() => {
    const goal = this.goals.find(g => g.key === this.selectedGoal());
    return goal?.proteinTarget ?? 140;
  });

  proteinProgress = computed(() => {
    const target = this.proteinTarget();
    if (target <= 0) return 0;
    return Math.min(this.totalProtein() / target, 1);
  });

  waterProgress = computed(() => Math.min(this.waterGlasses() / this.waterTarget, 1));

  streakCount = computed(() => this.calculateStreak(this.historyData()));

  weeklyLabels = computed(() => this.historyData().slice(-7).map(day => this.formatShortDate(day.date)));
  weeklyCalories = computed(() => this.historyData().slice(-7).map(day => day.calories));
  weeklyTargets = computed(() => this.historyData().slice(-7).map(day => day.targetCalories));

  smartSuggestion = computed(() => this.getSmartSuggestion());

  constructor(private dietService: DietService) {
    addIcons({
      fastFood,
      cafe,
      pizza,
      restaurant,
      add,
      close,
      checkmark,
      trash,
      sparkles,
      barChart,
      water,
      flame,
      calendarOutline,
      trophy,
      remove
    });

    effect(() => {
      const plan = this.todayPlan();
      if (!plan) return;

      if (!this.historySeeded()) {
        untracked(() => this.seedHistory(plan.targetCalories));
        this.historySeeded.set(true);
      }

      untracked(() => this.syncTodayHistory(plan.totalCalories, plan.targetCalories));
      this.syncSelectedGoalWithTarget(plan.targetCalories);
      untracked(() => this.refreshWeeklyChart());
    });

    effect(() => {
      const waterCount = this.waterGlasses();
      untracked(() => this.updateTodayWater(waterCount));
    });
  }

  ngAfterViewInit(): void {
    this.createWeeklyChart();
    this.refreshWeeklyChart();
  }

  ngOnDestroy(): void {
    this.weeklyChart?.destroy();
    this.weeklyChart = null;
  }

  getMealIcon(type: MealType): string {
    const icons: Record<MealType, string> = {
      breakfast: 'cafe',
      lunch: 'restaurant',
      snacks: 'fast-food',
      dinner: 'pizza'
    };
    return icons[type];
  }

  getMealTitle(type: MealType): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  getMeal(type: MealType) {
    return this.todayPlan()?.meals.find(m => m.type === type);
  }

  trackByMealType(_index: number, mealType: MealType): MealType {
    return mealType;
  }

  trackByMealItem(_index: number, item: MealItem): string {
    return item.id;
  }

  trackByHistoryDay(_index: number, day: HistoryDay): string {
    return day.date;
  }

  openAddModal(type: MealType) {
    this.selectedMealType.set(type);
    this.resetForm();
    this.isModalOpen.set(true);
  }

  openHistoryModal() {
    this.isHistoryModalOpen.set(true);
  }

  closeHistoryModal() {
    this.isHistoryModalOpen.set(false);
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.resetForm();
  }

  resetForm() {
    this.itemName.set('');
    this.calories.set(0);
    this.protein.set(0);
    this.carbs.set(0);
    this.fats.set(0);
  }

  calculateCaloriesFromMacros() {
    const calculated = this.dietService.calculateCalories(
      this.protein(),
      this.carbs(),
      this.fats()
    );
    this.calories.set(Math.round(calculated));
  }

  adjustWater(delta: number) {
    const next = this.waterGlasses() + delta;
    if (next < 0 || next > this.waterTarget) return;
    this.waterGlasses.set(next);
  }

  async selectGoal(goal: GoalType) {
    this.selectedGoal.set(goal);
    const config = this.goals.find(g => g.key === goal);
    if (!config) return;

    await this.dietService.updateTargetCalories(config.targetCalories);
    this.syncTodayHistory(this.todayPlan()?.totalCalories ?? 0, config.targetCalories);
  }

  getSmartSuggestion(): string {
    const remaining = this.remainingCalories();
    const proteinGap = Math.max(this.proteinTarget() - this.totalProtein(), 0);

    if (remaining <= 250) {
      return proteinGap > 25
        ? 'You are close to your calorie limit. Pick a light, high-protein snack like Greek yogurt or cottage cheese.'
        : 'Low calories left today. Keep it light with salad, steamed veggies, or broth-based soup.';
    }

    if (remaining <= 650) {
      return proteinGap > 35
        ? 'Good room left. A lean protein + vegetables meal will help close your protein goal.'
        : 'Moderate calories remaining. Choose a balanced plate with protein, whole grains, and healthy fats.';
    }

    return proteinGap > 40
      ? 'You still have high calories available. Go for a full protein-focused meal like chicken, rice, and vegetables.'
      : 'High calories available. A full balanced meal is ideal now to stay on track.';
  }

  private createWeeklyChart() {
    const canvas = this.weeklyCanvas?.nativeElement;
    if (!canvas) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.weeklyLabels(),
        datasets: [
          {
            label: 'Consumed',
            data: this.weeklyCalories(),
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.2)',
            tension: 0.35,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Target',
            data: this.weeklyTargets(),
            borderColor: '#60a5fa',
            borderDash: [6, 6],
            tension: 0.2,
            pointRadius: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              color: '#334155'
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#475569' },
            grid: { color: 'rgba(100, 116, 139, 0.18)' }
          },
          y: {
            ticks: { color: '#475569' },
            grid: { color: 'rgba(100, 116, 139, 0.12)' }
          }
        }
      }
    };

    this.weeklyChart = new Chart(canvas, config);
  }

  private refreshWeeklyChart() {
    if (!this.weeklyChart) return;
    this.weeklyChart.data.labels = this.weeklyLabels();
    this.weeklyChart.data.datasets[0].data = this.weeklyCalories();
    this.weeklyChart.data.datasets[1].data = this.weeklyTargets();
    this.weeklyChart.update();
  }

  private seedHistory(targetCalories: number) {
    const base: HistoryDay[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const iso = date.toISOString().split('T')[0];

      const variance = Math.round((Math.random() * 500) - 250);
      const calories = Math.max(1100, targetCalories + variance);
      const waterGlasses = Math.min(this.waterTarget, Math.max(3, Math.round(4 + (Math.random() * 5))));

      base.push({
        date: iso,
        calories,
        targetCalories,
        waterGlasses,
        goalMet: calories <= targetCalories
      });
    }

    this.historyData.set(base);
  }

  private syncTodayHistory(totalCalories: number, targetCalories: number) {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.historyData();
    const todayIndex = existing.findIndex(day => day.date === today);
    const todayWater = this.waterGlasses();

    const todayRecord: HistoryDay = {
      date: today,
      calories: totalCalories,
      targetCalories,
      waterGlasses: todayWater,
      goalMet: totalCalories <= targetCalories
    };

    if (todayIndex === -1) {
      this.historyData.set([...existing, todayRecord]);
      return;
    }

    const next = [...existing];
    next[todayIndex] = todayRecord;
    this.historyData.set(next);
  }

  private syncSelectedGoalWithTarget(targetCalories: number) {
    const matching = this.goals.find(g => g.targetCalories === targetCalories);
    if (matching && matching.key !== this.selectedGoal()) {
      this.selectedGoal.set(matching.key);
    }
  }

  private updateTodayWater(waterCount: number) {
    const today = new Date().toISOString().split('T')[0];
    const existing = this.historyData();
    const todayIndex = existing.findIndex(day => day.date === today);
    if (todayIndex === -1) return;

    const next = [...existing];
    next[todayIndex] = {
      ...next[todayIndex],
      waterGlasses: waterCount
    };
    this.historyData.set(next);
  }

  private calculateStreak(days: HistoryDay[]): number {
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    let streak = 0;

    for (let i = sorted.length - 1; i >= 0; i--) {
      if (!sorted[i].goalMet) break;
      streak++;
    }

    return streak;
  }

  private formatShortDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  async addMealItem() {
    if (!this.itemName() || this.calories() <= 0) {
      return;
    }

    const item: Omit<MealItem, 'id'> = {
      name: this.itemName(),
      calories: this.calories(),
      protein: this.protein() || undefined,
      carbs: this.carbs() || undefined,
      fats: this.fats() || undefined
    };

    await this.dietService.addMealItem(this.selectedMealType(), item);
    this.closeModal();
  }

  async removeMealItem(type: MealType, itemId: string) {
    await this.dietService.removeMealItem(type, itemId);
  }
}
