import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
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
    loadComponent: () => import('./feature/terms/terms.component').then((m) => m.TermsComponent),
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
      import('./feature/restaurant-detail/restaurant-detail').then(m => m.RestaurantDetailComponent) 
  },
  { 
    path: 'map', 
    loadComponent: () => 
      import('./feature/map/map').then(m => m.MapComponent) 
  },
  { path: 'object/:id', 
    loadComponent: () => 
      import('./feature/object-detail/object-detail').then(m => m.ObjectDetailComponent) 
  },
];