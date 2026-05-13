import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class MemberApiService {
  private get db() { return this.supabase.client; }

  constructor(
    private supabase: SupabaseService,
    private auth: AuthService
  ) {}

  private get userId(): string {
    return this.auth.currentUser()?.id ?? '';
  }

  async getProfile() {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', this.userId)
      .single();
    if (error) throw error;
    return data;
  }

  async updateProfile(payload: any) {
    const { data, error } = await this.db
      .from('profiles')
      .update({
        name: payload.name,
        weight: payload.weight,
        goal_weight: payload.goal_weight,
        daily_step_goal: payload.dailyStepGoal,
        daily_calorie_goal: payload.dailyCalorieGoal,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.userId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async addWorkout(payload: { workout_type: string; calories: number; duration: number; date?: string }) {
    const { data, error } = await this.db
      .from('workouts')
      .insert({
        user_id: this.userId,
        workout_type: payload.workout_type,
        calories: payload.calories,
        duration: payload.duration,
        date: payload.date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id };
  }

  async addActivity(payload: { steps: number; sleep: number; heart_rate: number; calories: number; date?: string }) {
    const activityDate = payload.date || new Date().toISOString().split('T')[0];

    // Check if activity exists for this date
    const { data: existing } = await this.db
      .from('activities')
      .select('id')
      .eq('user_id', this.userId)
      .eq('date', activityDate)
      .single();

    if (existing) {
      const { error } = await this.db
        .from('activities')
        .update({
          steps: payload.steps,
          sleep: payload.sleep,
          heart_rate: payload.heart_rate,
          calories: payload.calories
        })
        .eq('id', existing.id);
      if (error) throw error;
      return { id: existing.id, updated: true };
    }

    const { data, error } = await this.db
      .from('activities')
      .insert({
        user_id: this.userId,
        steps: payload.steps,
        sleep: payload.sleep,
        heart_rate: payload.heart_rate,
        calories: payload.calories,
        date: activityDate,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, updated: false };
  }

  async getStats() {
    const [{ data: workouts }, { data: activities }] = await Promise.all([
      this.db.from('workouts').select('calories, duration').eq('user_id', this.userId),
      this.db.from('activities').select('steps, sleep, heart_rate, calories').eq('user_id', this.userId)
    ]);

    const w = workouts || [];
    const a = activities || [];

    return {
      workoutCalories: w.reduce((s: number, x: any) => s + Number(x.calories || 0), 0),
      workoutDuration: w.reduce((s: number, x: any) => s + Number(x.duration || 0), 0),
      totalSteps: a.reduce((s: number, x: any) => s + Number(x.steps || 0), 0),
      avgSleep: a.length ? a.reduce((s: number, x: any) => s + Number(x.sleep || 0), 0) / a.length : 0,
      avgHeartRate: a.length ? a.reduce((s: number, x: any) => s + Number(x.heart_rate || 0), 0) / a.length : 0,
      activityCalories: a.reduce((s: number, x: any) => s + Number(x.calories || 0), 0)
    };
  }

  async changePassword(oldPassword: string, newPassword: string) {
    // Supabase handles password change via updateUser after re-auth
    const user = this.auth.currentUser();
    if (!user) throw new Error('Not authenticated');

    // Re-authenticate first
    const { error: signInError } = await this.db.auth.signInWithPassword({
      email: user.email,
      password: oldPassword
    });
    if (signInError) throw new Error('Old password is incorrect');

    const { error } = await this.db.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true };
  }
}
