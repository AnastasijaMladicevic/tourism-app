import { Routes } from '@angular/router';
import { profileAuthGuard } from './guards/profile-auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'attractions',
  },
  {
    path: 'login',
    loadComponent: () => import('./feature/login/login').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./feature/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'home',
    loadComponent: () => import('./feature/home/home.component').then((m) => m.HomeComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./feature/auth/forgot-password/forgot-password').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'terms',
    canActivate: [profileAuthGuard],
    loadComponent: () => import('./feature/terms/terms.component').then((m) => m.TermsComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./feature/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'language',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/language/language.component').then((m) => m.LanguageComponent),
  },
  {
    path: 'support',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/support/support.component').then((m) => m.SupportComponent),
  },
  {
    path: 'moderator-access',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/moderator-access/moderator-access.component').then(
        (m) => m.ModeratorAccessComponent,
      ),
  },
  {
    path: 'code-verification',
    loadComponent: () =>
      import('./feature/auth/code-verification/code-verification').then(
        (m) => m.CodeVerificationComponent,
      ),
  },
  {
    path: 'new-credentials',
    loadComponent: () =>
      import('./feature/new-credentials/new-credentials.component').then(
        (m) => m.NewCredentialsComponent,
      ),
  },
  {
    path: 'password-updated',
    loadComponent: () =>
      import('./feature/auth/password-updated/password-updated').then(
        (m) => m.PasswordUpdatedComponent,
      ),
  },
  {
    path: 'attractions',
    loadComponent: () =>
      import('./feature/attractions/attractions').then((m) => m.AttractionsComponent),
  },
  {
    path: 'hotels',
    loadComponent: () => import('./feature/hotels/hotels').then((m) => m.HotelsComponent),
  },
  {
    path: 'restaurants',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Restoran', title: 'Restaurants' },
  },
  {
    path: 'kafane',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Kafana', title: 'Kafane' },
  },
  {
    path: 'planinarski-domovi',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Planinarski dom', title: 'Planinarski domovi' },
  },
  {
    path: 'objects',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: null, title: 'Places' },
  },
  {
    path: 'events',
    loadComponent: () => import('./feature/events/events').then((m) => m.EventsComponent),
  },
  {
    path: 'profile',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/profile/profile.component').then((m) => m.ProfileComponent),
  },
  {
    path: 'profile/edit',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/edit-profile/edit-profile.component').then(
        (m) => m.EditProfileComponent,
      ),
  },
  {
    path: 'favorites',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/favorites/favorites.component').then((m) => m.FavoritesComponent),
  },
  {
    path: 'saved',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/favorites/favorites.component').then((m) => m.FavoritesComponent),
  },
  {
    path: 'my-reviews',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/my-reviews/my-reviews.component').then((m) => m.MyReviewsComponent),
  },
  {
    path: 'privacy-data',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/privacy-data/privacy-data.component').then(
        (m) => m.PrivacyDataComponent,
      ),
  },
  {
    path: 'event/:id',
    loadComponent: () =>
      import('./feature/event-detail/event-detail').then((m) => m.EventDetailComponent),
  },
  {
    path: 'hotel/:id',
    loadComponent: () =>
      import('./feature/hotel-detail/hotel-detail').then((m) => m.HotelDetailComponent),
  },
  {
    path: 'restaurant/:id',
    loadComponent: () =>
      import('./feature/restaurant-detail/restaurant-detail').then(
        (m) => m.RestaurantDetailComponent,
      ),
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./feature/map/map').then((m) => m.MapComponent),
  },
];

