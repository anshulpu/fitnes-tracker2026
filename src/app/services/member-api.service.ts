import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MemberApiService {
  constructor(private http: HttpClient) {}

  getProfile() {
    return firstValueFrom(this.http.get<any>(`${environment.apiBaseUrl}/user/profile`));
  }

  updateProfile(payload: any) {
    return firstValueFrom(this.http.put<any>(`${environment.apiBaseUrl}/user/profile`, payload));
  }

  addWorkout(payload: { workout_type: string; calories: number; duration: number; date?: string }) {
    return firstValueFrom(this.http.post(`${environment.apiBaseUrl}/user/workout`, payload));
  }

  addActivity(payload: { steps: number; sleep: number; heart_rate: number; calories: number; date?: string }) {
    return firstValueFrom(this.http.post(`${environment.apiBaseUrl}/user/activity`, payload));
  }

  getStats() {
    return firstValueFrom(this.http.get<any>(`${environment.apiBaseUrl}/user/stats`));
  }

  changePassword(oldPassword: string, newPassword: string) {
    return firstValueFrom(
      this.http.put(`${environment.apiBaseUrl}/user/change-password`, { oldPassword, newPassword })
    );
  }
}
