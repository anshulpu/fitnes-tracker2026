import { Injectable, signal } from '@angular/core';

export type NotificationType = 'workout_reminder' | 'missed_goal';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO string
  read?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private storageKey = 'fittrack_notifications';
  notifications = signal<AppNotification[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  sendWorkoutReminder() {
    this.addNotification({
      type: 'workout_reminder',
      title: 'Workout reminder',
      message: 'Time to move! Start a quick workout to stay on track today.',
    });
  }

  sendMissedGoalNotification() {
    this.addNotification({
      type: 'missed_goal',
      title: 'You missed your goal today',
      message: 'You fell short of today\'s activity goal. No worries—tomorrow is a fresh start.',
    });
  }

  addNotification(partial: { type: NotificationType; title: string; message: string; }): void {
    const now = new Date().toISOString();
    const notif: AppNotification = {
      id: now + '_' + Math.random().toString(36).slice(2, 8),
      createdAt: now,
      read: false,
      ...partial
    };

    const current = this.notifications();
    const updated = [notif, ...current].slice(0, 20); // keep last 20
    this.notifications.set(updated);
    this.saveToStorage(updated);
  }

  markAllRead(): void {
    const updated = this.notifications().map(n => ({ ...n, read: true }));
    this.notifications.set(updated);
    this.saveToStorage(updated);
  }

  clearAll(): void {
    this.notifications.set([]);
    this.saveToStorage([]);
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        this.notifications.set([]);
        return;
      }
      const parsed = JSON.parse(raw) as AppNotification[];
      this.notifications.set(parsed || []);
    } catch (e) {
      console.warn('Failed to load notifications from storage', e);
      this.notifications.set([]);
    }
  }

  private saveToStorage(data: AppNotification[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save notifications to storage', e);
    }
  }
}
