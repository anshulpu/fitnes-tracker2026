import { Component, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent,
  IonIcon, IonProgressBar, IonGrid, IonRow, IonCol, IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  walk, flame, time, trendingUp, fitness, nutrition,
  chevronForward, trophy, barChart
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { ActivityService } from '../services/activity.service';
import { AchievementService } from '../services/achievement.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard,
    IonCardContent, IonIcon, IonProgressBar, IonGrid, IonRow,
    IonCol, IonText
  ]
})
export class DashboardPage implements OnInit {
  today = new Date();
  user = this.authService.currentUser;
  todayActivity = this.activityService.todayActivity;
  weeklyProgress = this.activityService.weeklyProgress;
  achievements = this.achievementService.badges;
  notifications = this.notificationService.notifications;

  stepProgress = computed(() => {
    const goal = this.user()?.dailyStepGoal || 10000;
    return Math.min((this.todayActivity().steps / goal), 1);
  });

  calorieProgress = computed(() => {
    const goal = this.user()?.dailyCalorieGoal || 2000;
    return Math.min((this.todayActivity().caloriesBurned / goal), 1);
  });

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  });

  constructor(
    private authService: AuthService,
    private activityService: ActivityService,
    private achievementService: AchievementService,
    private notificationService: NotificationService,
    private router: Router
  ) {
    addIcons({ 
      walk, flame, time, trendingUp, fitness, nutrition,
      chevronForward, trophy, barChart
    });
  }

  ngOnInit() {
    this.achievementService.refreshAchievements();
    this.evaluateNotifications();
  }

  private evaluateNotifications() {
    const activity = this.todayActivity();
    const user = this.user();
    const goal = user?.dailyStepGoal || 10000;

    // Simple demo logic:
    // - If no workouts logged today, queue a workout reminder
    // - If steps are far below goal (less than 50% of goal), queue missed goal
    if (activity.workoutsCompleted === 0 && activity.steps < goal * 0.25) {
      this.notificationService.sendWorkoutReminder();
    }

    if (activity.steps < goal * 0.5) {
      this.notificationService.sendMissedGoalNotification();
    }
  }

  navigateTo(path: string) {
    if (this.router && this.router.navigate && path) this.router.navigate([path]);
  }


  getWeekDayLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  getMaxSteps(): number {
    const weekly = this.weeklyProgress();
    if (!weekly) return 10000;
    return Math.max(...weekly.days.map(d => d.steps), 10000);
  }

  getBarHeight(steps: number): number {
    const max = this.getMaxSteps();
    return (steps / max) * 100;
  }

}
