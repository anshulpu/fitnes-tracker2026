import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem,
  IonLabel, IonInput, IonToggle, IonButton, IonIcon, IonSelect,
  IonSelectOption, IonCard, IonCardContent, IonAvatar
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  person, mail, fitness, scale, save, logOut, moon, notifications,
  trophy, restaurant, chevronForward, pulse, statsChart, trailSign, time, flash
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { ThemeService } from '../services/theme.service';
import { ActivityService } from '../services/activity.service';
import { WorkoutService } from '../services/workout.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonList, IonItem, IonLabel, IonInput, IonToggle, IonButton, IonIcon,
    IonSelect, IonSelectOption, IonCard, IonCardContent, IonAvatar
  ]
})
export class SettingsPage {
  user = this.authService.currentUser;
  isDarkMode = this.themeService.isDarkMode;
  notificationsEnabled = signal(true);
  todayActivity = this.activityService.todayActivity;
  weeklyProgress = this.activityService.weeklyProgress;
  workoutSessions = this.workoutService.workoutSessions;

  // Form fields
  name = signal('');
  email = signal('');
  age = signal<number | undefined>(undefined);
  weight = signal<number | undefined>(undefined);
  height = signal<number | undefined>(undefined);
  fitnessGoal = signal<'lose_weight' | 'gain_muscle' | 'stay_fit' | 'endurance'>('stay_fit');
  dailyStepGoal = signal<number>(10000);
  dailyCalorieGoal = signal<number>(2000);

  detailItems = computed(() => {
    const today = this.todayActivity();
    const week = this.weeklyProgress();
    const totalSessions = this.workoutSessions().length;
    const weekSteps = week?.totalSteps ?? 0;

    return [
      {
        key: 'activity',
        icon: 'pulse',
        title: 'Physical activity',
        subtitle: `${today.activeMinutes} active min today`
      },
      {
        key: 'stats',
        icon: 'stats-chart',
        title: 'Statistics',
        subtitle: `This week: ${weekSteps.toLocaleString()} steps`
      },
      {
        key: 'routes',
        icon: 'trail-sign',
        title: 'Routes',
        subtitle: `${today.workoutsCompleted} workouts today`
      },
      {
        key: 'best-time',
        icon: 'time',
        title: 'Best time',
        subtitle: `Completed sessions: ${totalSessions}`
      },
      {
        key: 'equipment',
        icon: 'flash',
        title: 'Equipment',
        subtitle: 'Open training gear checklist'
      }
    ];
  });

  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private activityService: ActivityService,
    private workoutService: WorkoutService,
    private router: Router
  ) {
    addIcons({
      person,
      mail,
      fitness,
      scale,
      save,
      logOut,
      moon,
      notifications,
      trophy,
      restaurant,
      chevronForward,
      pulse,
      statsChart,
      trailSign,
      time,
      flash
    });
    this.loadUserData();
  }

  loadUserData() {
    const currentUser = this.user();
    if (currentUser) {
      this.name.set(currentUser.name);
      this.email.set(currentUser.email);
      this.age.set(currentUser.age);
      this.weight.set(currentUser.weight);
      this.height.set(currentUser.height);
      this.fitnessGoal.set(currentUser.fitnessGoal || 'stay_fit');
      this.dailyStepGoal.set(currentUser.dailyStepGoal || 10000);
      this.dailyCalorieGoal.set(currentUser.dailyCalorieGoal || 2000);
    }
  }

  async saveProfile() {
    await this.authService.updateProfile({
      name: this.name(),
      age: this.age(),
      weight: this.weight(),
      height: this.height(),
      fitnessGoal: this.fitnessGoal(),
      dailyStepGoal: this.dailyStepGoal(),
      dailyCalorieGoal: this.dailyCalorieGoal()
    });
  }

  async toggleDarkMode() {
    await this.themeService.toggleDarkMode();
  }

  async logout() {
    await this.authService.logout();
  }

  getBMI(): string {
    const weight = this.weight();
    const height = this.height();
    if (!weight || !height) return '--';
    const bmi = weight / Math.pow(height / 100, 2);
    return bmi.toFixed(1);
  }

  getFitnessGoalLabel(goal: string): string {
    const labels: Record<string, string> = {
      'lose_weight': 'Lose Weight',
      'gain_muscle': 'Gain Muscle',
      'stay_fit': 'Stay Fit',
      'endurance': 'Build Endurance'
    };
    return labels[goal] || goal;
  }

  openDetail(key: string) {
    if (key === 'activity') {
      this.router.navigate(['/tabs/workouts']);
      return;
    }

    if (key === 'stats') {
      this.router.navigate(['/tabs/analytics']);
      return;
    }

    if (key === 'routes') {
      this.router.navigate(['/tabs/workouts']);
      return;
    }

    if (key === 'best-time') {
      this.router.navigate(['/tabs/analytics']);
      return;
    }

    if (key === 'equipment') {
      window.open('https://www.nike.com/w/training-shoes-58jtozy7ok', '_blank');
    }
  }
}
