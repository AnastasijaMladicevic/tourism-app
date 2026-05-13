import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withRouterConfig({
        // Clicking the same sidebar link (e.g. Users twice) runs navigation again so the view refreshes.
        onSameUrlNavigation: 'reload'
      })
    ),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
