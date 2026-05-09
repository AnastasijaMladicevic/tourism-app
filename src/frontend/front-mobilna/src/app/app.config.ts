import { ApplicationConfig, APP_INITIALIZER } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth-interceptor';
import { TranslationService } from './services/translation.service';
import { ActiveRegionService } from './services/active-region';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: (
        translationService: TranslationService,
        activeRegionService: ActiveRegionService,
      ) => {
        return () =>
          Promise.all([
            translationService.loadInitialTranslations(),
            activeRegionService.loadInitialRegion(),
          ]).then(() => undefined);
      },
      deps: [TranslationService, ActiveRegionService],
      multi: true,
    },
  ],
};
