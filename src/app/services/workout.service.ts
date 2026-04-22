import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { Workout, WorkoutSession, WorkoutCategory } from '../models/workout.model';
import { MemberApiService } from './member-api.service';

@Injectable({
  providedIn: 'root'
})
export class WorkoutService {
  workouts = signal<Workout[]>([]);
  workoutSessions = signal<WorkoutSession[]>([]);
  activeSession = signal<WorkoutSession | null>(null);

  constructor(
    private storage: StorageService,
    private memberApi: MemberApiService
  ) {
    this.loadWorkouts();
    this.loadSessions();
  }

  private async loadWorkouts() {
    let workouts = await this.storage.get<Workout[]>('workouts');
    
    if (!workouts || workouts.length === 0) {
      workouts = this.getDefaultWorkouts();
      await this.storage.set('workouts', workouts);
    }
    
    this.workouts.set(workouts);
  }

  private async loadSessions() {
    const sessions = await this.storage.get<WorkoutSession[]>('workout_sessions') || [];
    this.workoutSessions.set(sessions);
  }

  private getDefaultWorkouts(): Workout[] {
    return [
      {
        id: '1',
        title: 'Morning Chest Blast',
        category: 'Chest',
        duration: 30,
        caloriesPerMinute: 8,
        difficulty: 'Intermediate',
        description: 'Build a powerful chest with compound movements',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: 12 },
          { name: 'Push-ups', sets: 3, reps: 15 },
          { name: 'Dumbbell Flyes', sets: 3, reps: 12 }
        ]
      },
      {
        id: '2',
        title: 'Back & Biceps Power',
        category: 'Back',
        duration: 40,
        caloriesPerMinute: 7,
        difficulty: 'Advanced',
        description: 'Develop a strong back and sculpted biceps',
        exercises: [
          { name: 'Pull-ups', sets: 4, reps: 10 },
          { name: 'Barbell Rows', sets: 4, reps: 12 },
          { name: 'Bicep Curls', sets: 3, reps: 15 }
        ]
      },
      {
        id: '3',
        title: 'Leg Day Crusher',
        category: 'Legs',
        duration: 45,
        caloriesPerMinute: 10,
        difficulty: 'Advanced',
        description: 'Build powerful legs and glutes',
        exercises: [
          { name: 'Squats', sets: 5, reps: 10 },
          { name: 'Lunges', sets: 3, reps: 12 },
          { name: 'Leg Press', sets: 4, reps: 15 }
        ]
      },
      {
        id: '4',
        title: 'HIIT Cardio Burn',
        category: 'Cardio',
        duration: 25,
        caloriesPerMinute: 12,
        difficulty: 'Intermediate',
        description: 'High-intensity intervals for maximum fat burn',
        exercises: [
          { name: 'Burpees', duration: 30 },
          { name: 'Mountain Climbers', duration: 30 },
          { name: 'Jump Rope', duration: 60 }
        ]
      },
      {
        id: '5',
        title: 'Yoga Flow',
        category: 'Yoga',
        duration: 35,
        caloriesPerMinute: 3,
        difficulty: 'Beginner',
        description: 'Relaxing yoga flow for flexibility and mindfulness',
        exercises: [
          { name: 'Sun Salutation', duration: 300 },
          { name: 'Warrior Poses', duration: 240 },
          { name: 'Shavasana', duration: 300 }
        ]
      },
      {
        id: '6',
        title: 'Core Strength',
        category: 'Core',
        duration: 20,
        caloriesPerMinute: 6,
        difficulty: 'Beginner',
        description: 'Strengthen your core muscles',
        exercises: [
          { name: 'Planks', duration: 60 },
          { name: 'Crunches', sets: 3, reps: 20 },
          { name: 'Russian Twists', sets: 3, reps: 30 }
        ]
      },
      {
        id: '7',
        title: 'Arm Sculptor',
        category: 'Arms',
        duration: 30,
        caloriesPerMinute: 6,
        difficulty: 'Intermediate',
        description: 'Tone and strengthen your arms',
        exercises: [
          { name: 'Dumbbell Curls', sets: 4, reps: 12 },
          { name: 'Tricep Dips', sets: 3, reps: 15 },
          { name: 'Hammer Curls', sets: 3, reps: 12 }
        ]
      }
    ];
  }

  getWorkoutsByCategory(category: WorkoutCategory): Workout[] {
    return this.workouts().filter(w => w.category === category);
  }

  getAllCategories(): WorkoutCategory[] {
    return ['Chest', 'Back', 'Legs', 'Cardio', 'Yoga', 'Arms', 'Core'];
  }

  async startWorkout(workout: Workout): Promise<WorkoutSession> {
    const session: WorkoutSession = {
      id: Date.now().toString(),
      workoutId: workout.id,
      workoutTitle: workout.title,
      startTime: new Date(),
      duration: 0,
      caloriesBurned: 0,
      completed: false,
      date: new Date().toISOString().split('T')[0]
    };

    this.activeSession.set(session);
    return session;
  }

  async completeWorkout(session: WorkoutSession, actualDuration: number) {
    const workout = this.workouts().find(w => w.id === session.workoutId);
    if (!workout) return;

    const completedSession: WorkoutSession = {
      ...session,
      endTime: new Date(),
      duration: actualDuration,
      caloriesBurned: Math.floor(actualDuration * workout.caloriesPerMinute),
      completed: true
    };

    const sessions = this.workoutSessions();
    sessions.unshift(completedSession);
    this.workoutSessions.set(sessions);
    this.activeSession.set(null);

    await this.storage.set('workout_sessions', sessions);

    try {
      await this.memberApi.addWorkout({
        workout_type: workout.category,
        calories: completedSession.caloriesBurned,
        duration: actualDuration,
        date: completedSession.date
      });
    } catch (error) {
      // Keep local flow working even if backend is temporarily unavailable.
      console.warn('Workout sync failed:', error);
    }

    return completedSession;
  }

  getTodayWorkouts(): WorkoutSession[] {
    const today = new Date().toISOString().split('T')[0];
    return this.workoutSessions().filter(s => s.date === today && s.completed);
  }
}
