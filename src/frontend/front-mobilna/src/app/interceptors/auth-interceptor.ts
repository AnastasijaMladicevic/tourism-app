import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, finalize, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | false | null>(null);

function clearStoredSession(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
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

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
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
