export type MealType = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

export interface MealItem {
  id: string;
  name: string;
  calories: number;
  protein?: number; // in grams
  carbs?: number; // in grams
  fats?: number; // in grams
  serving?: string;
}

export interface Meal {
  id: string;
  type: MealType;
  items: MealItem[];
  totalCalories: number;
  time?: string;
}

export interface DailyDietPlan {
  date: string;
  meals: Meal[];
  totalCalories: number;
  targetCalories: number;
}
