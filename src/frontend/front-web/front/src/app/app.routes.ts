import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/adminlayout/adminlayout.component';
import { ContentCreatorLayoutComponent } from './layout/contentcreatorlayout/contentcreatorlayout.component';
import { ManagerLayoutComponent } from './layout/managerlayout/managerlayout.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
 
export const routes: Routes = [
  // Root redirect
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
 
  // Login
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login').then(m => m.Login)
  },
 
  // Signout
  {
    path: 'signout',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/signout/signout').then(m => m.Signout)
  },
 
  // === ADMIN ===
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard(['admin'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'destinations',
        loadComponent: () =>
          import('./pages/admin/destinations/destinations.component').then(m => m.DestinationsComponent)
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/users/users.component').then(m => m.UsersComponent)
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./pages/admin/map/map.component').then(m => m.MapComponent)
      },
      {
        path: 'activity-log',
        loadComponent: () =>
          import('./pages/admin/activitylog/activitylog.component').then(m => m.ActivityLogComponent)
      }
    ]
  },
 
  // === CONTENT CREATOR ===
  {
    path: 'content-creator',
    component: ContentCreatorLayoutComponent,
    canActivate: [authGuard, roleGuard(['content-creator'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/content-creator/dashboard/dashboard.component').then(m => m.ContentCreatorDashboardComponent)
      },
      {
        path: 'objects',
        loadComponent: () =>
          import('./pages/content-creator/objects/objects.component').then(m => m.ContentCreatorObjectsComponent)
      },
      {
        path: 'activities',
        loadComponent: () =>
          import('./pages/content-creator/activities/activities.component').then(m => m.ContentCreatorActivitiesComponent)
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./pages/content-creator/events/events.component').then(m => m.ContentCreatorEventsComponent)
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./pages/content-creator/reviews/reviews.component').then(m => m.ContentCreatorReviewsComponent)
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./pages/content-creator/map/map.component').then(m => m.ContentCreatorMapComponent)
      }
    ]
  },

  // === MANAGER ===
  {
    path: 'manager',
    component: ManagerLayoutComponent,
    canActivate: [authGuard, roleGuard(['manager'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/manager/dashboard/dashboard.component').then(m => m.ManagerDashboardComponent)
      },
      {
        path: 'objects',
        loadComponent: () =>
          import('./pages/manager/objects/objects.component').then(m => m.ManagerObjectsComponent)
      },
      {
        path: 'activities',
        loadComponent: () =>
          import('./pages/manager/activities/activities.component').then(m => m.ManagerActivitiesComponent)
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./pages/manager/events/events.component').then(m => m.ManagerEventsComponent)
      },
      {
        path: 'localities',
        loadComponent: () =>
          import('./pages/manager/destinations/destinations.component').then(m => m.ManagerDestinationsComponent)
      },
      {
        path: 'destinations',
        redirectTo: 'localities',
        pathMatch: 'full'
      },
      {
        path: 'map',
        loadComponent: () =>
          import('./pages/manager/map/map.component').then(m => m.ManagerMapComponent)
      }
    ]
  },
 
  // Fallback
  {
    path: '**',
    redirectTo: 'login'
  }
];