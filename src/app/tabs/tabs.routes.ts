import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';
import { authGuard } from '../guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'workouts',
        loadComponent: () =>
          import('../workouts/workouts.page').then((m) => m.WorkoutsPage),
      },
      {
        path: 'form-checker',
        loadComponent: () =>
          import('../form-checker/form-checker.page').then((m) => m.FormCheckerPage),
      },
      {
        path: 'diet',
        loadComponent: () =>
          import('../diet/diet.page').then((m) => m.DietPage),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('../analytics/analytics.page').then((m) => m.AnalyticsPage),
      },
      {
        path: 'ai-coach',
        loadComponent: () =>
          import('../ai-coach/ai-coach.page').then((m) => m.AiCoachPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('../settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: '',
        redirectTo: '/tabs/dashboard',
        pathMatch: 'full',
      },
    ],
  },
];
