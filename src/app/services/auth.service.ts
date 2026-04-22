import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { StorageService } from './storage.service';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

interface LoginResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'member';
    weight?: number;
    goal_weight?: number;
    dailyStepGoal?: number;
    dailyCalorieGoal?: number;
    created_at?: string;
  };
}

type AuthResult = { success: true } | { success: false; message: string };

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);
  private jwtToken = signal<string | null>(null);

  constructor(
    private http: HttpClient,
    private storage: StorageService,
    private router: Router
  ) {
    this.initAuth();
  }

  private async initAuth() {
    const storedUser = await this.storage.get<User>('current_user');
    const token = await this.storage.get<string>('jwt_token');

    if (storedUser && token) {
      this.currentUser.set(storedUser);
      this.jwtToken.set(token);
      this.isAuthenticated.set(true);
      this.persistRole(storedUser.role);
      return;
    }

    this.currentUser.set(null);
    this.jwtToken.set(null);
    this.isAuthenticated.set(false);
    this.persistRole(undefined);
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const normalizedEmail = this.normalizeEmail(email);
      const response = await firstValueFrom(
        this.http.post<LoginResponse>(`${environment.apiBaseUrl}/login`, {
          email: normalizedEmail,
          password
        })
      );

      const mapped = this.mapApiUser(response.user);
      await this.setSession(mapped, response.token);
      return { success: true };
    } catch (error) {
      const message = this.getHttpErrorMessage(error, 'Login failed.');
      console.error('Login failed:', error);
      return { success: false, message };
    }
  }

  async loginWithRole(
    email: string,
    password: string,
    selectedRole: User['role']
  ): Promise<{ success: boolean; message?: string }> {
    const result = await this.login(email, password);
    if (!result.success) {
      return { success: false, message: result.message };
    }

    const signedInRole = this.getUserRole() as User['role'];
    if (signedInRole !== selectedRole) {
      await this.logout();
      return {
        success: false,
        message: `This account is ${signedInRole}. Please switch role and try again.`
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
      const normalizedEmail = this.normalizeEmail(email);
      await firstValueFrom(
        this.http.post(`${environment.apiBaseUrl}/register`, {
          email: normalizedEmail,
          password,
          name,
          role: role === 'admin' ? 'admin' : 'member'
        })
      );

      const loginResult = await this.login(normalizedEmail, password);
      if (!loginResult.success) {
        return { success: false, message: loginResult.message };
      }
      return { success: true };
    } catch (error) {
      const message = this.getHttpErrorMessage(
        error,
        'Signup failed. Please try again.'
      );
      console.error('Signup failed:', error);
      return { success: false, message };
    }
  }

  async logout() {
    this.currentUser.set(null);
    this.jwtToken.set(null);
    this.isAuthenticated.set(false);
    this.persistRole(undefined);
    await this.storage.remove('jwt_token');
    await this.storage.remove('current_user');
    if (this.router && this.router.navigate) this.router.navigate(['/login']);
  }

  async updateProfile(updates: Partial<User>) {
    const user = this.currentUser();
    if (!user) return;

    try {
      const response = await firstValueFrom(
        this.http.put<any>(`${environment.apiBaseUrl}/user/profile`, {
          name: updates.name,
          weight: updates.weight,
          goal_weight: (updates as any).goalWeight ?? undefined,
          dailyStepGoal: updates.dailyStepGoal,
          dailyCalorieGoal: updates.dailyCalorieGoal
        })
      );

      const merged: User = {
        ...user,
        ...updates,
        name: response?.name ?? updates.name ?? user.name,
        weight: response?.weight ?? updates.weight ?? user.weight,
        dailyStepGoal: response?.daily_step_goal ?? updates.dailyStepGoal ?? user.dailyStepGoal,
        dailyCalorieGoal: response?.daily_calorie_goal ?? updates.dailyCalorieGoal ?? user.dailyCalorieGoal
      };

      this.currentUser.set(merged);
      await this.storage.set('current_user', merged, { secure: true });
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  }

  async loginWithGoogle(): Promise<AuthResult> {
    // Demo Google flow signs in as the member demo account.
    return this.login('member@fittrack.com', 'member123');
  }

  async sendPasswordReset(email: string): Promise<boolean> {
    // Demo-only reset signal until dedicated backend endpoint is added.
    if (!email?.trim()) {
      return false;
    }
    return true;
  }

  async getJwtToken(): Promise<string | null> {
    const inMemory = this.jwtToken();
    if (inMemory) {
      return inMemory;
    }

    const token = await this.storage.get<string>('jwt_token');
    if (token) {
      this.jwtToken.set(token);
    }
    return token || null;
  }

  async isEmailVerified(): Promise<boolean> {
    // Email verification is not enforced by this backend implementation.
    return true;
  }

  hasRole(requiredRoles: Array<User['role']>): boolean {
    const user = this.currentUser();
    if (!user || !user.role) {
      return false;
    }
    return requiredRoles.includes(user.role);
  }

  getUserRole(): string {
    const user = this.currentUser();
    if (user?.role) {
      return user.role;
    }

    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('user_role') || 'member';
    }

    return 'member';
  }

  private persistRole(role?: User['role']) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (role) {
      localStorage.setItem('user_role', role);
    } else {
      localStorage.removeItem('user_role');
    }
  }

  private mapApiUser(user: LoginResponse['user']): User {
    return {
      id: String(user.id),
      email: user.email,
      name: user.name,
      role: user.role,
      weight: user.weight,
      dailyStepGoal: user.dailyStepGoal,
      dailyCalorieGoal: user.dailyCalorieGoal,
      fitnessGoal: 'stay_fit'
    };
  }

  private async setSession(user: User, token: string) {
    this.jwtToken.set(token);
    this.currentUser.set(user);
    this.isAuthenticated.set(true);

    await this.storage.set('jwt_token', token, { secure: true });
    await this.storage.set('current_user', user, { secure: true });
    this.persistRole(user.role);
  }

  private normalizeEmail(email: string) {
    return String(email || '').trim().toLowerCase();
  }

  private getHttpErrorMessage(error: any, fallback: string): string {
    if (error?.status === 0) {
      return 'Cannot reach the server. Start the backend API on http://localhost:3000.';
    }

    if (typeof error?.error?.message === 'string' && error.error.message.trim()) {
      return error.error.message;
    }

    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }
}
