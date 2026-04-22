import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from '../models/user.model';
import { environment } from '../../environments/environment';

export const roleGuard: CanActivateFn = (route, state) => {
  // In mock-auth mode we allow all roles so sections like
  // Settings/Analytics work for the demo user.
  if (environment.useMockAuth) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data?.['roles'] as Array<User['role']> | undefined;

  if (!requiredRoles || authService.hasRole(requiredRoles)) {
    return true;
  }

  // If user lacks the required role, redirect to a safe default (member dashboard)
  return router.createUrlTree(['/member/dashboard']);
};
