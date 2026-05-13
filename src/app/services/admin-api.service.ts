import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private get db() { return this.supabase.client; }

  constructor(private supabase: SupabaseService) {}

  async getUsers() {
    const { data, error } = await this.db
      .from('profiles')
      .select('id, name, email, role, weight, goal_weight, daily_step_goal, daily_calorie_goal, is_blocked, created_at, updated_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async getWorkouts() {
    const { data, error } = await this.db
      .from('workouts')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((w: any) => ({ ...w, user_name: w.profiles?.name || 'Unknown' }));
  }

  async getActivities() {
    const { data, error } = await this.db
      .from('activities')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((a: any) => ({ ...a, user_name: a.profiles?.name || 'Unknown' }));
  }

  async getAnalytics() {
    const [{ data: users }, { data: workouts }, { data: activities }, { data: programs }] = await Promise.all([
      this.db.from('profiles').select('id, is_blocked'),
      this.db.from('workouts').select('calories'),
      this.db.from('activities').select('steps, sleep'),
      this.db.from('workout_programs').select('id')
    ]);

    const u = users || [];
    const w = workouts || [];
    const a = activities || [];

    return {
      totalUsers: u.length,
      activeUsers: u.filter((x: any) => !x.is_blocked).length,
      totalWorkouts: w.length,
      caloriesBurned: w.reduce((s: number, x: any) => s + Number(x.calories || 0), 0),
      stepsData: a.reduce((s: number, x: any) => s + Number(x.steps || 0), 0),
      sleepData: a.length ? a.reduce((s: number, x: any) => s + Number(x.sleep || 0), 0) / a.length : 0,
      programsCreated: (programs || []).length
    };
  }

  async getDailyReports() {
    const { data, error } = await this.db
      .from('workouts')
      .select('date, calories, duration');
    if (error) throw error;

    const byDate = new Map<string, any>();
    for (const w of (data || [])) {
      if (!byDate.has(w.date)) byDate.set(w.date, { date: w.date, workouts: 0, calories: 0, duration: 0 });
      const row = byDate.get(w.date);
      row.workouts += 1;
      row.calories += Number(w.calories || 0);
      row.duration += Number(w.duration || 0);
    }
    return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  }

  async getWeeklyReports() {
    const { data, error } = await this.db.from('workouts').select('date, calories, duration');
    if (error) throw error;

    const byWeek = new Map<string, any>();
    for (const w of (data || [])) {
      const d = new Date(w.date);
      const wk = `${d.getUTCFullYear()}-W${String(Math.ceil((d.getUTCDate() + 6 - d.getUTCDay()) / 7)).padStart(2, '0')}`;
      if (!byWeek.has(wk)) byWeek.set(wk, { week: wk, workouts: 0, calories: 0, duration: 0 });
      const row = byWeek.get(wk);
      row.workouts += 1;
      row.calories += Number(w.calories || 0);
      row.duration += Number(w.duration || 0);
    }
    return [...byWeek.values()].sort((a, b) => b.week.localeCompare(a.week)).slice(0, 12);
  }

  async getMonthlyReports() {
    const { data, error } = await this.db.from('workouts').select('date, calories, duration');
    if (error) throw error;

    const byMonth = new Map<string, any>();
    for (const w of (data || [])) {
      const d = new Date(w.date);
      const mk = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(mk)) byMonth.set(mk, { month: mk, workouts: 0, calories: 0, duration: 0 });
      const row = byMonth.get(mk);
      row.workouts += 1;
      row.calories += Number(w.calories || 0);
      row.duration += Number(w.duration || 0);
    }
    return [...byMonth.values()].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 12);
  }

  async getUserProgress(userId: string) {
    const [{ data: workouts }, { data: activities }] = await Promise.all([
      this.db.from('workouts').select('calories, duration').eq('user_id', userId),
      this.db.from('activities').select('steps, sleep, heart_rate').eq('user_id', userId)
    ]);

    const w = workouts || [];
    const a = activities || [];

    return {
      totalCaloriesBurned: w.reduce((s: number, x: any) => s + Number(x.calories || 0), 0),
      totalWorkoutMinutes: w.reduce((s: number, x: any) => s + Number(x.duration || 0), 0),
      totalSteps: a.reduce((s: number, x: any) => s + Number(x.steps || 0), 0),
      avgSleep: a.length ? a.reduce((s: number, x: any) => s + Number(x.sleep || 0), 0) / a.length : 0,
      avgHeartRate: a.length ? a.reduce((s: number, x: any) => s + Number(x.heart_rate || 0), 0) / a.length : 0
    };
  }

  async deleteUser(userId: string) {
    // Delete related data first, then profile
    await Promise.all([
      this.db.from('workouts').delete().eq('user_id', userId),
      this.db.from('activities').delete().eq('user_id', userId)
    ]);
    const { error } = await this.db.from('profiles').delete().eq('id', userId);
    if (error) throw error;
    return { success: true };
  }

  async blockUser(userId: string, blocked: boolean) {
    const { error } = await this.db
      .from('profiles')
      .update({ is_blocked: blocked, updated_at: new Date().toISOString() })
      .eq('id', userId);
    if (error) throw error;
    return { success: true, blocked };
  }

  async addWorkoutProgram(name: string, description: string) {
    return this.addWorkoutProgramDetailed({ name, description });
  }

  async addWorkoutProgramDetailed(payload: { name: string; description?: string; duration?: number; difficulty?: string }) {
    const { data, error } = await this.db
      .from('workout_programs')
      .insert({
        name: payload.name,
        description: payload.description || null,
        duration: payload.duration || null,
        difficulty: payload.difficulty || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async getWorkoutPrograms() {
    const { data, error } = await this.db
      .from('workout_programs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async addWorkout(payload: { user_id: number; workout_type: string; calories: number; duration: number; date?: string }) {
    const { data, error } = await this.db
      .from('workouts')
      .insert({
        user_id: String(payload.user_id),
        workout_type: payload.workout_type,
        calories: payload.calories,
        duration: payload.duration,
        date: payload.date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
