import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, TimeoutError, catchError, filter, finalize, switchMap, take, throwError, timeout } from 'rxjs';
import { AuthService } from '../services/auth';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | false | null>(null);

function clearStoredSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  sessionStorage.removeItem('spirego-ban-message');
}

function notifyBannedAction(error: HttpErrorResponse): void {
  const message =
    typeof error.error?.message === 'string' && error.error.message.trim().length > 0
      ? error.error.message.trim()
      : 'Ovaj nalog je trenutno u read-only režimu zbog bana.';

  sessionStorage.setItem('spirego-ban-message', message);
  window.dispatchEvent(new CustomEvent('banned-user-action-blocked', { detail: message }));
}

function isAuthEndpoint(url: string): boolean {
  return /\/login$|\/register$|\/refresh$|\/logout$|\/forgot-password$|\/verify-reset-code$|\/reset-password$/i
    .test(url);
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  const authReq =
    token && !isAuthEndpoint(req.url)
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  const response$ = next(authReq);
  const timedResponse$ = req.url.includes('/api/')
    ? response$.pipe(timeout(30000))
    : response$;

  return timedResponse$.pipe(
    catchError((error: unknown) => {
      if (error instanceof TimeoutError) {
        return throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Request Timeout', url: req.url }));
      }

      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }

      if (error.status === 423) {
        notifyBannedAction(error);
        return throwError(() => error);
      }

      const shouldRefresh =
        error.status === 401 && !isAuthEndpoint(req.url);

      if (!shouldRefresh) {
        return throwError(() => error);
      }

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        clearStoredSession();
        return throwError(() => error);
      }

      if (isRefreshing) {
        return refreshedToken$.pipe(
          filter((newToken): newToken is string | false => newToken !== null),
          take(1),
          switchMap((newToken) => {
            if (newToken === false) {
              clearStoredSession();
              return throwError(() => error);
            }

            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${newToken}` },
            });
            return next(retryReq);
          }),
        );
      }

      isRefreshing = true;
      refreshedToken$.next(null);

      return authService.refresh().pipe(
        switchMap((res) => {
          if (!res.token) {
            clearStoredSession();
            refreshedToken$.next(false);
            return throwError(() => error);
          }

          refreshedToken$.next(res.token);
          const retryReq = req.clone({
            setHeaders: { Authorization: `Bearer ${res.token}` },
          });
          return next(retryReq);
        }),
        catchError((refreshError) => {
          refreshedToken$.next(false);
          clearStoredSession();
          return throwError(() => refreshError);
        }),
        finalize(() => {
          isRefreshing = false;
        }),
      );
    }),
  );
};
