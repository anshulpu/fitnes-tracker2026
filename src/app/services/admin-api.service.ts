import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  constructor(private http: HttpClient) {}

  getUsers() {
    return firstValueFrom(this.http.get<any[]>(`${environment.apiBaseUrl}/admin/users`));
  }

  getWorkouts() {
    return firstValueFrom(this.http.get<any[]>(`${environment.apiBaseUrl}/admin/workouts`));
  }

  getActivities() {
    return firstValueFrom(this.http.get<any[]>(`${environment.apiBaseUrl}/admin/activities`));
  }

  getAnalytics() {
    return firstValueFrom(this.http.get<any>(`${environment.apiBaseUrl}/admin/analytics`));
  }

  getDailyReports() {
    return firstValueFrom(this.http.get<any[]>(`${environment.apiBaseUrl}/admin/reports/daily`));
  }

  getWeeklyReports() {
    return firstValueFrom(this.http.get<any[]>(`${environment.apiBaseUrl}/admin/reports/weekly`));
  }

  getMonthlyReports() {
    return firstValueFrom(this.http.get<any[]>(`${environment.apiBaseUrl}/admin/reports/monthly`));
  }

  getUserProgress(userId: string) {
    return firstValueFrom(this.http.get<any>(`${environment.apiBaseUrl}/admin/users/${userId}/progress`));
  }

  deleteUser(userId: string) {
    return firstValueFrom(this.http.delete(`${environment.apiBaseUrl}/admin/user/${userId}`));
  }

  blockUser(userId: string, blocked: boolean) {
    return firstValueFrom(this.http.patch(`${environment.apiBaseUrl}/admin/user/${userId}/block`, { blocked }));
  }

  addWorkoutProgram(name: string, description: string) {
    return firstValueFrom(this.http.post(`${environment.apiBaseUrl}/admin/workout-programs`, { name, description }));
  }

  getWorkoutPrograms() {
    return firstValueFrom(this.http.get<any[]>(`${environment.apiBaseUrl}/admin/workout-programs`));
  }

  addWorkout(payload: { user_id: number; workout_type: string; calories: number; duration: number; date?: string }) {
    return firstValueFrom(this.http.post(`${environment.apiBaseUrl}/admin/workouts`, payload));
  }

  addWorkoutProgramDetailed(payload: { name: string; description?: string; duration?: number; difficulty?: string }) {
    return firstValueFrom(this.http.post(`${environment.apiBaseUrl}/admin/workout-programs`, payload));
  }
}
