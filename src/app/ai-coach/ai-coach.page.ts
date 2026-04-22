import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonInput,
  IonButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { fitness, nutrition, warning, barChart, flash, moon } from 'ionicons/icons';
import { AdaptiveEngineService } from '../services/adaptive-engine.service';

@Component({
  selector: 'app-ai-coach',
  templateUrl: './ai-coach.page.html',
  styleUrls: ['./ai-coach.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonInput,
    IonButton
  ]
})
export class AiCoachPage {
  adaptiveState = this.adaptiveEngine.todayAdaptiveState;
  fatigueHistory = this.adaptiveEngine.fatigueHistory;

  constructor(
    private adaptiveEngine: AdaptiveEngineService,
    private router: Router
  ) {
    addIcons({ fitness, nutrition, warning, barChart, flash, moon });
  }

  async onSleepBlur(event: any) {
    const raw = event?.target?.value ?? event?.detail?.value;
    const hours = Number(raw);
    if (!Number.isFinite(hours) || hours <= 0) {
      return;
    }

    await this.adaptiveEngine.setTodaySleep(hours);
  }

  getWeekDayLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  getFatigueBarHeight(score: number): number {
    return Math.max(5, Math.min(score, 100));
  }

  goToWorkouts() {
    this.router.navigate(['/tabs/workouts']);
  }

  goToDiet() {
    this.router.navigate(['/tabs/diet']);
  }
}
