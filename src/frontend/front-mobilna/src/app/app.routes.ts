import { Routes } from '@angular/router';
import { profileAuthGuard } from './guards/profile-auth.guard';

const objectTypeRoutes: Routes = [
  {
    path: 'objects/hotels',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Hotel', title: 'Hotels' },
  },
  {
    path: 'objects/restaurants',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Restoran', title: 'Restaurants' },
  },
  {
    path: 'objects/kafane',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Kafana', title: 'Kafane' },
  },
  {
    path: 'objects/planinarski-domovi',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Planinarski dom', title: 'Planinarski domovi' },
  },
  {
    path: 'objects/apartments',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Apartman', title: 'Apartments' },
  },
  {
    path: 'objects/spa-centers',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Spa Centar', title: 'Spa centers' },
  },
  {
    path: 'objects/monuments',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Spomenik', title: 'Monuments' },
  },
  {
    path: 'objects/museums',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Muzej', title: 'Museums' },
  },
  {
    path: 'objects/galleries',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Galerija', title: 'Galleries' },
  },
  {
    path: 'objects/cafes',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Kafic', title: 'Cafes' },
  },
  {
    path: 'objects/bars',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Bar', title: 'Bars' },
  },
  {
    path: 'objects/pensions',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Pansion', title: 'Pensions' },
  },
  {
    path: 'objects/churches',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Crkva', title: 'Churches' },
  },
  {
    path: 'objects/monasteries',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Manastir', title: 'Monasteries' },
  },
  {
    path: 'objects/sports-centers',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Sportski centar', title: 'Sports centers' },
  },
  {
    path: 'objects/wellness-centers',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Wellness centar', title: 'Wellness centers' },
  },
];

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
    path: 'search',
    loadComponent: () =>
      import('./feature/search-results/search-results.component').then(
        (m) => m.SearchResultsComponent,
      ),
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
    path: 'about',
    loadComponent: () =>
      import('./feature/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'region',
    loadComponent: () =>
      import('./feature/region/region.component').then((m) => m.RegionComponent),
  },
  {
    path: 'language',
    loadComponent: () =>
      import('./feature/language/language.component').then((m) => m.LanguageComponent),
  },
  {
    path: 'support',
    loadComponent: () =>
      import('./feature/support/support.component').then((m) => m.SupportComponent),
  },
  {
    path: 'moderator-access',
    loadComponent: () =>
      import('./feature/moderator-access-preview/moderator-access-preview.component').then(
        (m) => m.ModeratorAccessPreviewComponent,
      ),
  },
  {
    path: 'moderator-access-preview',
    loadComponent: () =>
      import('./feature/moderator-access-preview/moderator-access-preview.component').then(
        (m) => m.ModeratorAccessPreviewComponent,
      ),
  },
  {
    path: 'moderation-rules',
    loadComponent: () =>
      import('./feature/moderation-rules/moderation-rules.component').then(
        (m) => m.ModerationRulesComponent,
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
    path: 'destinations',
    loadComponent: () =>
      import('./feature/destinations/destinations').then((m) => m.DestinationsComponent),
  },
  {
    path: 'destination/:id',
    loadComponent: () =>
      import('./feature/destination-detail/destination-detail').then((m) => m.DestinationDetailComponent),
  },
  {
    path: 'localities',
    loadComponent: () =>
      import('./feature/localities/localities').then((m) => m.LocalitiesComponent),
  },
  {
    path: 'locality/:id',
    loadComponent: () =>
      import('./feature/locality-detail/locality-detail').then((m) => m.LocalityDetailComponent),
  },
  {
    path: 'activities',
    loadComponent: () =>
      import('./feature/activities/activities').then((m) => m.ActivitiesComponent),
  },
  {
    path: 'activity/:id',
    loadComponent: () =>
      import('./feature/activity-detail/activity-detail').then((m) => m.ActivityDetailComponent),
  },
  {
    path: 'hotels',
    loadComponent: () => import('./feature/objects/objects').then((m) => m.ObjectsComponent),
    data: { type: 'Hotel', title: 'Hotels' },
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
    data: { type: null, title: 'Objects' },
  },
  ...objectTypeRoutes,
  {
    path: 'events',
    loadComponent: () => import('./feature/events/events').then((m) => m.EventsComponent),
  },
  {
    path: 'settings',
    loadComponent: () => import('./feature/settings/settings').then((m) => m.SettingsComponent),
  },
  {
    path: 'notification-settings',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/notification-settings/notification-settings').then(
        (m) => m.NotificationSettingsComponent,
      ),
  },
  {
    path: 'location-settings',
    loadComponent: () =>
      import('./feature/location-settings/location-settings').then(
        (m) => m.LocationSettingsComponent,
      ),
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
    path: 'planner',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/planner/planner.component').then((m) => m.PlannerComponent),
  },
  {
    path: 'planner/add',
    loadComponent: () =>
      import('./feature/add-to-planner/add-to-planner.component').then(
        (m) => m.AddToPlannerComponent,
      ),
  },
  {
    path: 'planner-preview/add-stop-panel',
    loadComponent: () =>
      import('./feature/route-previews/route-preview-add-stop-panel.component').then(
        (m) => m.RoutePreviewAddStopPanelComponent,
      ),
  },
  {
    path: 'planner-preview/add-stop-sheet',
    loadComponent: () =>
      import('./feature/route-previews/route-preview-add-stop-sheet.component').then(
        (m) => m.RoutePreviewAddStopSheetComponent,
      ),
  },
  {
    path: 'planner-preview/route-mobile',
    loadComponent: () =>
      import('./feature/route-previews/route-preview-route-mobile.component').then(
        (m) => m.RoutePreviewRouteMobileComponent,
      ),
  },
  {
    path: 'planner-preview/route-desktop',
    loadComponent: () =>
      import('./feature/route-previews/route-preview-route-desktop.component').then(
        (m) => m.RoutePreviewRouteDesktopComponent,
      ),
  },
  {
    path: 'map/add-stop',
    loadComponent: () =>
      import('./feature/add-stop-mobile-screen/add-stop-mobile-screen.component').then(
        (m) => m.AddStopMobileScreenComponent,
      ),
  },
  {
    path: 'my-reviews',
    canActivate: [profileAuthGuard],
    loadComponent: () =>
      import('./feature/my-reviews-preview/my-reviews-preview.component').then(
        (m) => m.MyReviewsPreviewComponent,
      ),
  },
  {
    path: 'my-reviews-preview',
    loadComponent: () =>
      import('./feature/my-reviews-preview/my-reviews-preview.component').then(
        (m) => m.MyReviewsPreviewComponent,
      ),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./feature/notifications/notifications')
        .then(m => m.NotificationsComponent)
  },
  {
    path: 'privacy-data',
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
      import('./feature/object-detail/object-detail').then((m) => m.ObjectDetailComponent),
  },
  {
    path: 'restaurant/:id',
    loadComponent: () =>
      import('./feature/object-detail/object-detail').then((m) => m.ObjectDetailComponent)
  },
  {
    path: 'map',
    loadComponent: () =>
      import('./feature/map/map').then(m => m.MapComponent)
  },
  {
    path: 'object/:id',
    loadComponent: () =>
      import('./feature/object-detail/object-detail').then(m => m.ObjectDetailComponent)
  },
  {
    path: 'results',
    loadComponent: () =>
      import('./feature/results/results').then(m => m.ResultsComponent)
  },
  {
    path: 'shared-location',
    loadComponent: () =>
      import('./feature/shared-location/shared-location.component').then(
        (m) => m.SharedLocationComponent,
      )
  },
];
