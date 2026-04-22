import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { DailyActivity, WeeklyProgress } from '../models/user.model';
import { MemberApiService } from './member-api.service';

@Injectable({
  providedIn: 'root'
})
export class ActivityService {
  todayActivity = signal<DailyActivity>({
    date: new Date().toISOString().split('T')[0],
    steps: 0,
    caloriesBurned: 0,
    activeMinutes: 0,
    workoutsCompleted: 0
  });

  weeklyProgress = signal<WeeklyProgress | null>(null);

  constructor(
    private storage: StorageService,
    private memberApi: MemberApiService
  ) {
    this.loadTodayActivity();
    this.loadWeeklyProgress();
  }

  private async loadTodayActivity() {
    const today = new Date().toISOString().split('T')[0];
    const activities = await this.storage.get<DailyActivity[]>('daily_activities') || [];
    const todayData = activities.find(a => a.date === today);

    if (todayData) {
      this.todayActivity.set(todayData);
    } else {
      // Initialize today's activity with some demo data
      const demoActivity: DailyActivity = {
        date: today,
        steps: 3245,
        caloriesBurned: 287,
        activeMinutes: 45,
        workoutsCompleted: 1
      };
      this.todayActivity.set(demoActivity);
      await this.saveTodayActivity(demoActivity);
    }
  }

  private async loadWeeklyProgress() {
    const activities = await this.storage.get<DailyActivity[]>('daily_activities') || [];
    const last7Days = this.getLast7Days();
    
    const weekData: DailyActivity[] = last7Days.map(date => {
      const existing = activities.find(a => a.date === date);
      return existing || {
        date,
        steps: Math.floor(Math.random() * 5000) + 3000,
        caloriesBurned: Math.floor(Math.random() * 300) + 200,
        activeMinutes: Math.floor(Math.random() * 60) + 30,
        workoutsCompleted: Math.floor(Math.random() * 2)
      };
    });

    const weekly: WeeklyProgress = {
      week: 'This Week',
      days: weekData,
      totalSteps: weekData.reduce((sum, d) => sum + d.steps, 0),
      totalCalories: weekData.reduce((sum, d) => sum + d.caloriesBurned, 0),
      totalActiveMinutes: weekData.reduce((sum, d) => sum + d.activeMinutes, 0)
    };

    this.weeklyProgress.set(weekly);
  }

  private getLast7Days(): string[] {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  }

  async updateActivity(updates: Partial<DailyActivity>) {
    const current = this.todayActivity();
    const updated = { ...current, ...updates };
    this.todayActivity.set(updated);
    await this.saveTodayActivity(updated);
    await this.loadWeeklyProgress();

    try {
      await this.memberApi.addActivity({
        steps: updated.steps,
        sleep: 0,
        heart_rate: 0,
        calories: updated.caloriesBurned,
        date: updated.date
      });
    } catch (error) {
      // Keep local tracking available even when API is down.
      console.warn('Activity sync failed:', error);
    }
  }

  private async saveTodayActivity(activity: DailyActivity) {
    const activities = await this.storage.get<DailyActivity[]>('daily_activities') || [];
    const index = activities.findIndex(a => a.date === activity.date);
    
    if (index !== -1) {
      activities[index] = activity;
    } else {
      activities.push(activity);
    }
    
    await this.storage.set('daily_activities', activities);
  }

  async addSteps(steps: number) {
    const current = this.todayActivity();
    await this.updateActivity({
      steps: current.steps + steps,
      caloriesBurned: current.caloriesBurned + Math.floor(steps * 0.04)
    });
  }

  async addWorkout(duration: number, calories: number) {
    const current = this.todayActivity();
    await this.updateActivity({
      activeMinutes: current.activeMinutes + duration,
      caloriesBurned: current.caloriesBurned + calories,
      workoutsCompleted: current.workoutsCompleted + 1
    });
  }
}
