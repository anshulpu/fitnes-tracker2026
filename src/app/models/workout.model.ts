export type WorkoutCategory = 'Chest' | 'Back' | 'Legs' | 'Cardio' | 'Yoga' | 'Arms' | 'Core';

export interface Workout {
  id: string;
  title: string;
  category: WorkoutCategory;
  duration: number; // in minutes
  caloriesPerMinute: number;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description?: string;
  exercises?: Exercise[];
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration?: number; // in seconds
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutTitle: string;
  startTime: Date;
  endTime?: Date;
  duration: number; // actual duration in minutes
  caloriesBurned: number;
  completed: boolean;
  date: string;
}
