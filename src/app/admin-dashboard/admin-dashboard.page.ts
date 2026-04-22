import { Component, OnInit, ViewChild, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  analytics,
  barbell,
  chevronDown,
  chevronForward,
  documentText,
  flash,
  grid,
  logOut,
  menu,
  moon,
  notifications,
  people,
  person,
  personCircle,
  search,
  settings,
  shieldCheckmark,
  statsChart,
  walk,
  lockClosed,
  addCircle
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';
import { AdminApiService } from '../services/admin-api.service';
import { MemberApiService } from '../services/member-api.service';

interface MenuChild {
  key: string;
  label: string;
  sectionId: string;
}

interface MenuGroup {
  key: string;
  label: string;
  icon: string;
  children?: MenuChild[];
}

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.page.html',
  styleUrls: ['./admin-dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon
  ]
})
export class AdminDashboardPage implements OnInit {
  @ViewChild(IonContent) content?: IonContent;

  user = this.authService.currentUser;

  loading = signal(false);
  error = signal('');
  success = signal('');
  sidebarCollapsed = signal(false);
  selectedMenuKey = signal('dashboard.overview');
  notificationsCount = signal(3);
  searchTerm = '';

  menuGroups: MenuGroup[] = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid', children: [{ key: 'overview', label: 'Overview', sectionId: 'dashboard-section' }] },
    {
      key: 'users',
      label: 'Users',
      icon: 'people',
      children: [
        { key: 'all-users', label: 'All Users', sectionId: 'users-section' },
        { key: 'active-users', label: 'Active Users', sectionId: 'users-section' },
        { key: 'blocked-users', label: 'Blocked Users', sectionId: 'users-section' },
        { key: 'user-progress', label: 'User Progress', sectionId: 'users-section' }
      ]
    },
    {
      key: 'workouts',
      label: 'Workouts',
      icon: 'barbell',
      children: [
        { key: 'all-workouts', label: 'All Workouts', sectionId: 'workouts-section' },
        { key: 'add-workout', label: 'Add Workout', sectionId: 'workouts-section' },
        { key: 'workout-programs', label: 'Workout Programs', sectionId: 'workouts-section' },
        { key: 'workout-reports', label: 'Workout Reports', sectionId: 'reports-section' }
      ]
    },
    {
      key: 'activities',
      label: 'Activities',
      icon: 'walk',
      children: [
        { key: 'steps-data', label: 'Steps Data', sectionId: 'activities-section' },
        { key: 'sleep-data', label: 'Sleep Data', sectionId: 'activities-section' },
        { key: 'heart-rate', label: 'Heart Rate', sectionId: 'activities-section' },
        { key: 'calories-data', label: 'Calories', sectionId: 'activities-section' }
      ]
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: 'analytics',
      children: [
        { key: 'user-growth', label: 'User Growth', sectionId: 'charts-section' },
        { key: 'workout-analytics', label: 'Workout Analytics', sectionId: 'charts-section' },
        { key: 'performance-charts', label: 'Performance Charts', sectionId: 'analytics-section' }
      ]
    },
    {
      key: 'reports',
      label: 'Reports',
      icon: 'document-text',
      children: [
        { key: 'daily-report', label: 'Daily Report', sectionId: 'reports-section' },
        { key: 'weekly-report', label: 'Weekly Report', sectionId: 'reports-section' },
        { key: 'monthly-report', label: 'Monthly Report', sectionId: 'reports-section' }
      ]
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: 'settings',
      children: [
        { key: 'general-settings', label: 'General Settings', sectionId: 'settings-section' },
        { key: 'admin-profile', label: 'Admin Profile', sectionId: 'profile-section' },
        { key: 'change-password', label: 'Change Password', sectionId: 'settings-section' }
      ]
    }
  ];

  expanded = signal<Record<string, boolean>>({
    dashboard: true,
    users: false,
    workouts: false,
    activities: false,
    analytics: false,
    reports: false,
    settings: false
  });

  analyticsData = {
    totalUsers: 0,
    activeUsers: 0,
    totalWorkouts: 0,
    caloriesBurned: 0,
    stepsData: 0,
    sleepData: 0,
    programsCreated: 0
  };

  users: any[] = [];
  workouts: any[] = [];
  activities: any[] = [];
  workoutPrograms: any[] = [];
  dailyReports: any[] = [];
  weeklyReports: any[] = [];
  monthlyReports: any[] = [];

  selectedProgress: any | null = null;
  selectedProgressUserName = '';
  selectedUserProfile: any | null = null;

  addWorkoutForm = {
    user_id: 0,
    workout_type: 'Cardio',
    calories: 200,
    duration: 30,
    date: new Date().toISOString().split('T')[0]
  };

  addProgramForm = {
    name: '',
    description: '',
    duration: 30,
    difficulty: 'Intermediate'
  };

  adminProfile = {
    name: '',
    email: '',
    role: 'admin'
  };

  generalSettings = {
    notifications: true,
    sidebarCollapsedByDefault: false
  };

  passwordForm = {
    oldPassword: '',
    newPassword: ''
  };

  constructor(
    private authService: AuthService,
    private adminApi: AdminApiService,
    private memberApi: MemberApiService
  ) {
    addIcons({
      analytics,
      barbell,
      chevronDown,
      chevronForward,
      documentText,
      flash,
      grid,
      logOut,
      menu,
      moon,
      notifications,
      people,
      person,
      personCircle,
      search,
      settings,
      shieldCheckmark,
      statsChart,
      walk,
      lockClosed,
      addCircle
    });
  }

  async ngOnInit() {
    const current = this.user();
    if (current) {
      this.adminProfile.name = current.name;
      this.adminProfile.email = current.email;
      this.adminProfile.role = current.role || 'admin';
    }

    await this.refreshAll();
  }

  get isUsersView() {
    return this.selectedMenuKey().startsWith('users.');
  }

  get isActivitiesView() {
    return this.selectedMenuKey().startsWith('activities.');
  }

  get reportMode(): 'daily' | 'weekly' | 'monthly' {
    const key = this.selectedMenuKey();
    if (key === 'reports.weekly-report') return 'weekly';
    if (key === 'reports.monthly-report') return 'monthly';
    return 'daily';
  }

  get sectionCounts() {
    return {
      dashboard: 1,
      users: this.users.length,
      workouts: this.workouts.length,
      activities: this.activities.length,
      analytics: 4,
      reports: this.dailyReports.length + this.weeklyReports.length + this.monthlyReports.length,
      settings: 3
    };
  }

  getSectionCount(groupKey: string) {
    const counts: Record<string, number> = this.sectionCounts;
    return counts[groupKey] ?? 0;
  }

  get filteredUsers() {
    const key = this.selectedMenuKey();
    let base = [...this.users];
    if (key === 'users.active-users') {
      base = base.filter((u) => !u.is_blocked);
    } else if (key === 'users.blocked-users') {
      base = base.filter((u) => !!u.is_blocked);
    }

    if (!this.searchTerm.trim()) return base;
    const q = this.searchTerm.toLowerCase();
    return base.filter((u) => String(u.name).toLowerCase().includes(q) || String(u.email).toLowerCase().includes(q));
  }

  get filteredWorkouts() {
    const list = [...this.workouts];
    if (!this.searchTerm.trim()) return list;
    const q = this.searchTerm.toLowerCase();
    return list.filter((w) =>
      String(w.user_name || '').toLowerCase().includes(q) ||
      String(w.workout_type || '').toLowerCase().includes(q)
    );
  }

  get filteredActivities() {
    const list = [...this.activities];
    if (!this.searchTerm.trim()) return list;
    const q = this.searchTerm.toLowerCase();
    return list.filter((a) => String(a.user_name || '').toLowerCase().includes(q));
  }

  get reportRows() {
    if (this.reportMode === 'weekly') return this.weeklyReports;
    if (this.reportMode === 'monthly') return this.monthlyReports;
    return this.dailyReports;
  }

  get userGrowthChart() {
    const byMonth = new Map<string, number>();
    for (const u of this.users) {
      const key = String(u.created_at || '').slice(0, 7) || 'unknown';
      byMonth.set(key, (byMonth.get(key) || 0) + 1);
    }
    return [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-6).map(([label, value]) => ({ label, value }));
  }

  get workoutActivityChart() {
    return [...this.weeklyReports].slice(-6).map((r) => ({ label: r.week, value: Number(r.workouts || 0) }));
  }

  get caloriesChart() {
    return [...this.dailyReports].slice(-7).map((r) => ({ label: r.date, value: Number(r.calories || 0) }));
  }

  get weeklyProgressChart() {
    return [...this.weeklyReports].slice(-6).map((r) => ({ label: r.week, value: Number(r.duration || 0) }));
  }

  normalizeBars(data: Array<{ label: string; value: number }>) {
    const max = Math.max(1, ...data.map((d) => d.value));
    return data.map((d) => ({ ...d, height: Math.round((d.value / max) * 100) }));
  }

  async refreshAll() {
    this.loading.set(true);
    this.error.set('');

    try {
      const [analytics, users, workouts, activities, daily, weekly, monthly, programs] = await Promise.all([
        this.adminApi.getAnalytics(),
        this.adminApi.getUsers(),
        this.adminApi.getWorkouts(),
        this.adminApi.getActivities(),
        this.adminApi.getDailyReports(),
        this.adminApi.getWeeklyReports(),
        this.adminApi.getMonthlyReports(),
        this.adminApi.getWorkoutPrograms()
      ]);

      this.analyticsData = {
        totalUsers: analytics?.totalUsers ?? 0,
        activeUsers: analytics?.activeUsers ?? 0,
        totalWorkouts: analytics?.totalWorkouts ?? 0,
        caloriesBurned: analytics?.caloriesBurned ?? 0,
        stepsData: analytics?.stepsData ?? 0,
        sleepData: Number(analytics?.sleepData ?? 0),
        programsCreated: analytics?.programsCreated ?? programs.length ?? 0
      };

      this.users = users;
      this.workouts = workouts;
      this.activities = activities;
      this.dailyReports = daily;
      this.weeklyReports = weekly;
      this.monthlyReports = monthly;
      this.workoutPrograms = programs;

      if (!this.addWorkoutForm.user_id && this.users.length > 0) {
        this.addWorkoutForm.user_id = Number(this.users[0].id);
      }
    } catch (error) {
      console.error(error);
      this.error.set('Failed to load admin data. Ensure backend is running and you are logged in as admin.');
    } finally {
      this.loading.set(false);
    }
  }

  toggleSidebar() {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  toggleGroup(groupKey: string) {
    const current = { ...this.expanded() };
    current[groupKey] = !current[groupKey];
    this.expanded.set(current);
  }

  async selectChild(groupKey: string, child: MenuChild) {
    this.selectedMenuKey.set(`${groupKey}.${child.key}`);
    const current = { ...this.expanded(), [groupKey]: true };
    this.expanded.set(current);
    await this.scrollToSection(child.sectionId);
  }

  async scrollToSection(elementId: string) {
    const host = this.content;
    if (!host) return;
    const target = document.getElementById(elementId);
    if (!target) return;

    const scrollEl = await host.getScrollElement();
    const targetRect = target.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    const top = scrollEl.scrollTop + targetRect.top - scrollRect.top - 12;
    await host.scrollToPoint(0, Math.max(0, top), 420);
  }

  openNotifications() {
    this.success.set('Notifications panel simulated.');
  }

  async openSettings() {
    await this.selectChild('settings', { key: 'general-settings', label: 'General Settings', sectionId: 'settings-section' });
  }

  async viewAdminProfile() {
    await this.selectChild('settings', { key: 'admin-profile', label: 'Admin Profile', sectionId: 'profile-section' });
  }

  async deleteUser(userId: number) {
    await this.adminApi.deleteUser(String(userId));
    await this.refreshAll();
  }

  async toggleBlockUser(userId: number, currentlyBlocked: number) {
    await this.adminApi.blockUser(String(userId), !currentlyBlocked);
    await this.refreshAll();
  }

  async viewUserProgress(userId: number, userName: string) {
    this.selectedProgress = await this.adminApi.getUserProgress(String(userId));
    this.selectedProgressUserName = userName;
    this.selectedMenuKey.set('users.user-progress');
  }

  viewUserProfile(user: any) {
    this.selectedUserProfile = user;
  }

  async addWorkoutLog() {
    const payload = {
      user_id: Number(this.addWorkoutForm.user_id),
      workout_type: this.addWorkoutForm.workout_type,
      calories: Number(this.addWorkoutForm.calories),
      duration: Number(this.addWorkoutForm.duration),
      date: this.addWorkoutForm.date
    };

    if (!payload.user_id || !payload.workout_type || !payload.calories || !payload.duration) {
      this.error.set('Fill all Add Workout fields.');
      return;
    }

    await this.adminApi.addWorkout(payload);
    this.success.set('Workout added successfully.');
    await this.refreshAll();
  }

  async addWorkoutProgram() {
    const payload = {
      name: this.addProgramForm.name.trim(),
      description: this.addProgramForm.description.trim(),
      duration: Number(this.addProgramForm.duration),
      difficulty: this.addProgramForm.difficulty
    };

    if (!payload.name) {
      this.error.set('Program name is required.');
      return;
    }

    await this.adminApi.addWorkoutProgramDetailed(payload);
    this.addProgramForm = { name: '', description: '', duration: 30, difficulty: 'Intermediate' };
    this.success.set('Workout program created.');
    await this.refreshAll();
  }

  async saveGeneralSettings() {
    localStorage.setItem('admin_general_settings', JSON.stringify(this.generalSettings));
    this.success.set('General settings saved locally.');
  }

  async updateAdminProfile() {
    await this.memberApi.updateProfile({
      name: this.adminProfile.name
    });
    this.success.set('Admin profile updated.');
  }

  async changePassword() {
    if (!this.passwordForm.oldPassword || this.passwordForm.newPassword.length < 6) {
      this.error.set('Provide valid old and new password (min 6 chars).');
      return;
    }

    await this.memberApi.changePassword(this.passwordForm.oldPassword, this.passwordForm.newPassword);
    this.passwordForm = { oldPassword: '', newPassword: '' };
    this.success.set('Password changed successfully.');
  }

  async logout() {
    await this.authService.logout();
  }
}
