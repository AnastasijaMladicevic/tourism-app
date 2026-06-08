import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { TranslationService } from './services/translation.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withRouterConfig({
        // Clicking the same sidebar link (e.g. Users twice) runs navigation again so the view refreshes.
        onSameUrlNavigation: 'reload'
      }),
      withInMemoryScrolling({ scrollPositionRestoration: 'top' })
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: (translationService: TranslationService) => {
        return () => translationService.loadInitialTranslations();
      },
      deps: [TranslationService],
      multi: true,
    },
  ]
};
