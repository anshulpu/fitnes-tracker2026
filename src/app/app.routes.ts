import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'role-selection',
        loadComponent: () => import('./auth/role-selection/role-selection.page').then(m => m.RoleSelectionPage)
      },
      {
        path: 'login',
        loadComponent: () => import('./auth/login/login.page').then(m => m.AuthLoginPage)
      },
      {
        path: 'signup',
        loadComponent: () => import('./auth/signup/signup.page').then(m => m.AuthSignupPage)
      },
      {
        path: '',
        redirectTo: 'role-selection',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'login',
    redirectTo: '/auth/role-selection',
    pathMatch: 'full'
  },
  {
    path: 'admin/dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    loadComponent: () => import('./admin/dashboard/dashboard.page').then(m => m.AdminDashboardRoutePage)
  },
  {
    path: 'admin-dashboard',
    redirectTo: '/admin/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'member/dashboard',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['member'] },
    loadComponent: () => import('./member/dashboard/dashboard.page').then(m => m.MemberDashboardRoutePage)
  },
  {
    path: 'tabs',
    canActivate: [authGuard],
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },
  {
    path: 'workout-timer/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./workout-timer/workout-timer.page').then(m => m.WorkoutTimerPage)
  },
  {
    path: '',
    redirectTo: '/auth/role-selection',
    pathMatch: 'full'
  },
];
