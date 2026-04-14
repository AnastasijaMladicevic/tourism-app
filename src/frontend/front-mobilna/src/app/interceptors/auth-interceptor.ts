import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { catchError, finalize, switchMap, throwError, EMPTY } from 'rxjs';

// Dodaje JWT token na svaki request i handle-uje 401 sa refresh-om
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ako je 401 i nije refresh zahtev, pokušaj refresh
      if (error.status === 401 && !req.url.includes('/refresh') && !req.url.includes('/logout')) {
        const refreshToken = localStorage.getItem('refreshToken');
        
        // Ako nema refresh tokena, nema šta da se radi
        if (!refreshToken) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          return throwError(() => error);
        }

        return authService.refresh().pipe(
          switchMap((res) => {
            const retryReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.token}` },
            });
            return next(retryReq);
          }),
          catchError((refreshError) => {
            // Refresh failed, očisti localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            return throwError(() => refreshError);
          }),
        );
      }
      return throwError(() => error);
    }),
  );
};
