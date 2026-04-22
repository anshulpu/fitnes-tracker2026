import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { DailyDietPlan, Meal, MealItem, MealType } from '../models/diet.model';

@Injectable({
  providedIn: 'root'
})
export class DietService {
  todayPlan = signal<DailyDietPlan | null>(null);

  constructor(private storage: StorageService) {
    this.loadTodayPlan();
  }

  private async loadTodayPlan() {
    const today = new Date().toISOString().split('T')[0];
    const plans = await this.storage.get<DailyDietPlan[]>('diet_plans') || [];
    let todayPlan = plans.find(p => p.date === today);

    if (!todayPlan) {
      todayPlan = this.createDefaultPlan(today);
      plans.push(todayPlan);
      await this.storage.set('diet_plans', plans);
    }

    this.todayPlan.set(todayPlan);
  }

  private createDefaultPlan(date: string): DailyDietPlan {
    const meals: Meal[] = [
      {
        id: '1',
        type: 'breakfast',
        time: '08:00',
        items: [
          { id: '1', name: 'Oatmeal with Berries', calories: 250, protein: 8, carbs: 45, fats: 5, serving: '1 bowl' },
          { id: '2', name: 'Greek Yogurt', calories: 150, protein: 15, carbs: 12, fats: 4, serving: '1 cup' },
          { id: '3', name: 'Orange Juice', calories: 110, protein: 2, carbs: 26, fats: 0, serving: '1 glass' }
        ],
        totalCalories: 510
      },
      {
        id: '2',
        type: 'lunch',
        time: '13:00',
        items: [
          { id: '4', name: 'Grilled Chicken Breast', calories: 280, protein: 53, carbs: 0, fats: 6, serving: '200g' },
          { id: '5', name: 'Brown Rice', calories: 215, protein: 5, carbs: 45, fats: 2, serving: '1 cup' },
          { id: '6', name: 'Mixed Vegetables', calories: 85, protein: 3, carbs: 17, fats: 0, serving: '1 cup' }
        ],
        totalCalories: 580
      },
      {
        id: '3',
        type: 'snacks',
        time: '16:00',
        items: [
          { id: '7', name: 'Apple', calories: 95, protein: 0, carbs: 25, fats: 0, serving: '1 medium' },
          { id: '8', name: 'Almonds', calories: 164, protein: 6, carbs: 6, fats: 14, serving: '28g' }
        ],
        totalCalories: 259
      },
      {
        id: '4',
        type: 'dinner',
        time: '19:00',
        items: [
          { id: '9', name: 'Grilled Salmon', calories: 367, protein: 40, carbs: 0, fats: 22, serving: '200g' },
          { id: '10', name: 'Quinoa', calories: 222, protein: 8, carbs: 39, fats: 4, serving: '1 cup' },
          { id: '11', name: 'Steamed Broccoli', calories: 55, protein: 4, carbs: 11, fats: 1, serving: '1 cup' }
        ],
        totalCalories: 644
      }
    ];

    return {
      date,
      meals,
      totalCalories: meals.reduce((sum, m) => sum + m.totalCalories, 0),
      targetCalories: 2000
    };
  }

  async addMealItem(mealType: MealType, item: Omit<MealItem, 'id'>) {
    const plan = this.todayPlan();
    if (!plan) return;

    const newItem: MealItem = {
      ...item,
      id: Date.now().toString()
    };

    const mealIndex = plan.meals.findIndex(m => m.type === mealType);
    if (mealIndex !== -1) {
      plan.meals[mealIndex].items.push(newItem);
      plan.meals[mealIndex].totalCalories += newItem.calories;
      plan.totalCalories += newItem.calories;
    }

    this.todayPlan.set({ ...plan });
    await this.savePlan(plan);
  }

  async removeMealItem(mealType: MealType, itemId: string) {
    const plan = this.todayPlan();
    if (!plan) return;

    const mealIndex = plan.meals.findIndex(m => m.type === mealType);
    if (mealIndex !== -1) {
      const itemIndex = plan.meals[mealIndex].items.findIndex(i => i.id === itemId);
      if (itemIndex !== -1) {
        const item = plan.meals[mealIndex].items[itemIndex];
        plan.meals[mealIndex].items.splice(itemIndex, 1);
        plan.meals[mealIndex].totalCalories -= item.calories;
        plan.totalCalories -= item.calories;
      }
    }

    this.todayPlan.set({ ...plan });
    await this.savePlan(plan);
  }

  async updateTargetCalories(targetCalories: number) {
    const plan = this.todayPlan();
    if (!plan) return;

    const updatedPlan: DailyDietPlan = {
      ...plan,
      targetCalories
    };

    this.todayPlan.set(updatedPlan);
    await this.savePlan(updatedPlan);
  }

  async getAllPlans(): Promise<DailyDietPlan[]> {
    return (await this.storage.get<DailyDietPlan[]>('diet_plans')) || [];
  }

  private async savePlan(plan: DailyDietPlan) {
    const plans = await this.storage.get<DailyDietPlan[]>('diet_plans') || [];
    const index = plans.findIndex(p => p.date === plan.date);
    
    if (index !== -1) {
      plans[index] = plan;
    } else {
      plans.push(plan);
    }
    
    await this.storage.set('diet_plans', plans);
  }

  calculateCalories(protein: number, carbs: number, fats: number): number {
    return (protein * 4) + (carbs * 4) + (fats * 9);
  }
}
