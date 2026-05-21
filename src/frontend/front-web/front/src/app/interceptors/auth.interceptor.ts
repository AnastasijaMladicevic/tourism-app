import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, finalize, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

function isAuthEndpoint(url: string): boolean {
  return /\/login$|\/register$|\/refresh$|\/logout$/i.test(url);
}

function withAuthHeader<T>(request: HttpRequest<T>, token: string): HttpRequest<T> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function notifyBannedAction(error: HttpErrorResponse, authService: AuthService, router: Router): void {
  const message =
    typeof error.error?.message === 'string' && error.error.message.trim().length > 0
      ? error.error.message.trim()
      : 'Ovaj nalog je trenutno u read-only režimu zbog bana.';

  sessionStorage.setItem('spirego-admin-ban-message', message);
  window.dispatchEvent(new CustomEvent('banned-user-action-blocked', { detail: message }));

  if (authService.isBannedContentCreator() && !router.url.startsWith('/account-banned')) {
    void router.navigateByUrl(authService.getAccountBannedRoute());
  }
}

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  const authRequest =
    token && !request.headers.has('Authorization') && !isAuthEndpoint(request.url)
      ? withAuthHeader(request, token)
      : request;

  return next(authRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 423) {
        notifyBannedAction(error, authService, router);
        return throwError(() => error);
      }

      const shouldRefresh = error.status === 401 && !isAuthEndpoint(request.url);

      if (!shouldRefresh) {
        return throwError(() => error);
      }

      const refreshToken = authService.getRefreshToken();
      if (!refreshToken) {
        authService.logout();
        return throwError(() => error);
      }

      if (isRefreshing) {
        return refreshedToken$.pipe(
          filter((newToken): newToken is string => !!newToken),
          take(1),
          switchMap((newToken) => next(withAuthHeader(request, newToken))),
        );
      }

      isRefreshing = true;
      refreshedToken$.next(null);

      return authService.refresh().pipe(
        switchMap((response) => {
          refreshedToken$.next(response.token);
          return next(withAuthHeader(request, response.token));
        }),
        catchError((refreshError) => {
          authService.logout();
          return throwError(() => refreshError);
        }),
        finalize(() => {
          isRefreshing = false;
        }),
      );
    }),
  );
};
