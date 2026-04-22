import { Injectable, signal } from '@angular/core';
import { StorageService } from './storage.service';
import { DailyActivity } from '../models/user.model';

export type AchievementId = 'first_workout' | 'streak_7_days' | 'calories_1000';

export interface AchievementBadge {
  id: AchievementId;
  title: string;
  description: string;
  earned: boolean;
  earnedAt?: string; // ISO
}

@Injectable({
  providedIn: 'root'
})
export class AchievementService {
  private achievementsKey = 'achievements';
  badges = signal<AchievementBadge[]>([]);

  constructor(private storage: StorageService) {
    // Fire and forget; dashboard can also call refresh explicitly if needed
    this.refreshAchievements();
  }

  async refreshAchievements(): Promise<void> {
    const [activities, storedBadges] = await Promise.all([
      this.storage.get<DailyActivity[]>('daily_activities'),
      this.storage.get<AchievementBadge[]>(this.achievementsKey)
    ]);

    const activityList = activities || [];
    const stored = storedBadges || [];
    const storedMap = new Map<AchievementId, AchievementBadge>(
      stored.map(b => [b.id, b])
    );

    const nowIso = new Date().toISOString();

    const firstWorkoutEarned = activityList.some(a => a.workoutsCompleted > 0);
    const caloriesTotal = activityList.reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);
    const caloriesEarned = caloriesTotal >= 1000;
    const streakEarned = this.hasSevenDayStreak(activityList);

    const base: AchievementBadge[] = [
      {
        id: 'first_workout',
        title: 'First Workout',
        description: 'Complete your first logged workout.',
        earned: false
      },
      {
        id: 'streak_7_days',
        title: '7-Day Streak',
        description: 'Be active 7 days in a row.',
        earned: false
      },
      {
        id: 'calories_1000',
        title: '1000 Calories Burned',
        description: 'Burn at least 1000 calories in total.',
        earned: false
      }
    ];

    const computed: AchievementBadge[] = base.map(badge => {
      const prev = storedMap.get(badge.id);
      let earnedNow = false;

      if (badge.id === 'first_workout') {
        earnedNow = firstWorkoutEarned;
      } else if (badge.id === 'streak_7_days') {
        earnedNow = streakEarned;
      } else if (badge.id === 'calories_1000') {
        earnedNow = caloriesEarned;
      }

      const alreadyEarned = prev?.earned;
      const earned = alreadyEarned || earnedNow;
      const earnedAt = alreadyEarned
        ? prev?.earnedAt
        : earnedNow
        ? nowIso
        : undefined;

      return {
        ...badge,
        earned,
        earnedAt
      };
    });

    this.badges.set(computed);
    await this.storage.set(this.achievementsKey, computed);
  }

  private hasSevenDayStreak(activities: DailyActivity[]): boolean {
    if (!activities.length) return false;

    const today = new Date();
    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      const iso = date.toISOString().split('T')[0];
      const dayActivity = activities.find(a => a.date === iso);
      if (!dayActivity || dayActivity.workoutsCompleted <= 0) {
        return false;
      }
    }
    return true;
  }
}
