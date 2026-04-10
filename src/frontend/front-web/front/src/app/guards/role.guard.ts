import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
      return router.parseUrl('/login');
    }

    if (authService.hasAnyRole(allowedRoles)) {
      return true;
    }

    return router.parseUrl(authService.getDashboardRouteFromStoredUser());
  };
};
