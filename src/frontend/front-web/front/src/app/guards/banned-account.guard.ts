import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/** Allows access only for logged-in, banned content creators. */
export const bannedAccountGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.parseUrl('/login');
  }

  if (authService.isBannedContentCreator()) {
    return true;
  }

  return router.parseUrl(authService.getDashboardRouteFromStoredUser());
};

/** Redirects banned content creators away from the main portal. */
export const activeContentCreatorGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.parseUrl('/login');
  }

  if (authService.isBannedContentCreator()) {
    return router.parseUrl('/account-banned');
  }

  return true;
};
