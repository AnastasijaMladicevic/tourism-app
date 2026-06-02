import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, finalize, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

function isAuthEndpoint(url: string): boolean {
  return /\/login$|\/register$|\/refresh$|\/logout$|\/forgot-password$|\/verify-reset-code$|\/reset-password$/i.test(url);
}

function isPublicImageReadRequest<T>(request: HttpRequest<T>): boolean {
  if (request.method.toUpperCase() !== 'GET') {
    return false;
  }

  return /\/api\/(?:objects|activities|events|destinations|localities)\/\d+\/images(?:\/main)?(?:\?.*)?$/i.test(request.url);
}

function withAuthHeader<T>(request: HttpRequest<T>, token: string): HttpRequest<T> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

function withLanguageHeader<T>(request: HttpRequest<T>, language: string): HttpRequest<T> {
  return request.clone({
    setHeaders: {
      'accept-language': language,
    },
  });
}

function notifyBannedAction(error: HttpErrorResponse, authService: AuthService, router: Router): void {
  const message =
    typeof error.error?.message === 'string' && error.error.message.trim().length > 0
      ? error.error.message.trim()
      : 'This account is currently in read-only mode due to a ban.';

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
  const language = 'en-US';
  const authRequest =
    token &&
    !request.headers.has('Authorization') &&
    !isAuthEndpoint(request.url) &&
    !isPublicImageReadRequest(request)
      ? withAuthHeader(request, token)
      : request;
  const localizedRequest = authRequest.headers.has('accept-language')
    ? authRequest
    : withLanguageHeader(authRequest, language);

  return next(localizedRequest).pipe(
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
