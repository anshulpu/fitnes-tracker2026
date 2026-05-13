import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for Supabase session restore to complete before checking auth state.
  // Without this, the guard always sees isAuthenticated=false on page refresh
  // because initAuth() is async and hasn't resolved yet.
  await authService.waitForInit();

  if (authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/role-selection'], {
    queryParams: { returnUrl: state.url }
  });
};
