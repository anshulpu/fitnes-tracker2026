import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { StorageService } from './storage.service';
import { User } from '../models/user.model';

type AuthResult = { success: true } | { success: false; message: string };

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  private get db() { return this.supabase.client; }

  constructor(
    private supabase: SupabaseService,
    private storage: StorageService,
    private router: Router
  ) {
    this.initAuth();
  }

  private async initAuth() {
    // Restore session from Supabase (handles token refresh automatically)
    const { data: { session } } = await this.db.auth.getSession();
    if (session?.user) {
      await this.loadAndSetProfile(session.user.id);
    }

    // Listen for auth state changes (login/logout/token refresh)
    this.db.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await this.loadAndSetProfile(session.user.id);
      } else {
        this.currentUser.set(null);
        this.isAuthenticated.set(false);
        this.persistRole(undefined);
      }
    });
  }

  private async loadAndSetProfile(userId: string) {
    const { data: profile } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profile) {
      const user: User = this.mapProfile(profile);
      this.currentUser.set(user);
      this.isAuthenticated.set(true);
      this.persistRole(user.role);
      await this.storage.set('current_user', user, { secure: true });
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.db.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      });

      if (error) return { success: false, message: error.message };
      if (!data.user) return { success: false, message: 'Login failed.' };

      await this.loadAndSetProfile(data.user.id);
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Login failed.' };
    }
  }

  async loginWithRole(
    email: string,
    password: string,
    selectedRole: User['role']
  ): Promise<{ success: boolean; message?: string }> {
    const result = await this.login(email, password);
    if (!result.success) return result;

    const signedInRole = this.currentUser()?.role;
    if (signedInRole !== selectedRole) {
      await this.logout();
      return {
        success: false,
        message: `This account is registered as ${signedInRole}. Please select the correct role.`
      };
    }
    return { success: true };
  }

  async signup(
    email: string,
    password: string,
    name: string,
    role: User['role'] = 'member'
  ): Promise<AuthResult> {
    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error } = await this.db.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: { name, role },
          // Skip email redirect so user can login immediately
          emailRedirectTo: undefined
        }
      });

      if (error) return { success: false, message: error.message };
      if (!data.user) return { success: false, message: 'Signup failed.' };

      // Create profile row immediately (don't wait for trigger)
      await this.db.from('profiles').upsert({
        id: data.user.id,
        email: normalizedEmail,
        name,
        role,
        daily_step_goal: 10000,
        daily_calorie_goal: 2000,
        is_blocked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // If session exists immediately (email confirmation disabled), set it
      if (data.session) {
        await this.loadAndSetProfile(data.user.id);
        return { success: true };
      }

      // Email confirmation is enabled — sign in directly
      const loginResult = await this.login(normalizedEmail, password);
      return loginResult;
    } catch (e: any) {
      return { success: false, message: e?.message || 'Signup failed.' };
    }
  }

  async logout() {
    await this.db.auth.signOut();
    this.currentUser.set(null);
    this.isAuthenticated.set(false);
    this.persistRole(undefined);
    await this.storage.remove('jwt_token');
    await this.storage.remove('current_user');
    if (this.router?.navigate) this.router.navigate(['/login']);
  }

  async updateProfile(updates: Partial<User>) {
    const user = this.currentUser();
    if (!user) return;

    const { data, error } = await this.db
      .from('profiles')
      .update({
        name: updates.name,
        weight: updates.weight,
        goal_weight: (updates as any).goalWeight ?? undefined,
        daily_step_goal: updates.dailyStepGoal,
        daily_calorie_goal: updates.dailyCalorieGoal,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      const merged: User = { ...user, ...updates };
      this.currentUser.set(merged);
      await this.storage.set('current_user', merged, { secure: true });
    }
  }

  async loginWithGoogle(): Promise<AuthResult> {
    const { error } = await this.db.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/'
      }
    });
    if (error) return { success: false, message: error.message };
    // OAuth redirects the browser — no further action needed here
    return { success: true };
  }

  async sendPasswordReset(email: string): Promise<boolean> {
    if (!email?.trim()) return false;
    const { error } = await this.db.auth.resetPasswordForEmail(email.trim());
    return !error;
  }

  async getJwtToken(): Promise<string | null> {
    const { data: { session } } = await this.db.auth.getSession();
    return session?.access_token ?? null;
  }

  async isEmailVerified(): Promise<boolean> {
    const { data: { user } } = await this.db.auth.getUser();
    return !!user?.email_confirmed_at;
  }

  hasRole(requiredRoles: Array<User['role']>): boolean {
    const user = this.currentUser();
    if (!user?.role) return false;
    return requiredRoles.includes(user.role);
  }

  getUserRole(): string {
    const user = this.currentUser();
    if (user?.role) return user.role;
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('user_role') || 'member';
    }
    return 'member';
  }

  private persistRole(role?: User['role']) {
    if (typeof localStorage === 'undefined') return;
    if (role) {
      localStorage.setItem('user_role', role);
    } else {
      localStorage.removeItem('user_role');
    }
  }

  private mapProfile(p: any): User {
    return {
      id: p.id,
      email: p.email,
      name: p.name,
      role: p.role,
      weight: p.weight,
      dailyStepGoal: p.daily_step_goal,
      dailyCalorieGoal: p.daily_calorie_goal,
      fitnessGoal: p.fitness_goal || 'stay_fit'
    };
  }
}
