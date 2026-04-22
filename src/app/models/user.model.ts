export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'user' | 'trainer' | 'admin' | 'member';
  password?: string;
  age?: number;
  weight?: number; // in kg
  height?: number; // in cm
  fitnessGoal?: 'lose_weight' | 'gain_muscle' | 'stay_fit' | 'endurance';
  dailyStepGoal?: number;
  dailyCalorieGoal?: number;
  profileImage?: string;
}

export interface DailyActivity {
  date: string;
  steps: number;
  caloriesBurned: number;
  activeMinutes: number;
  workoutsCompleted: number;
}

export interface WeeklyProgress {
  week: string;
  days: DailyActivity[];
  totalSteps: number;
  totalCalories: number;
  totalActiveMinutes: number;
}
