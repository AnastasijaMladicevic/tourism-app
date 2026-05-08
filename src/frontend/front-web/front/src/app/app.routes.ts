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
  //Signin
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup.component').then(m => m.SignupComponent)
  },

  // === ADMIN ===
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, roleGuard(['admin'])],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/admin/profile/profile.component').then(m => m.ProfileComponent)
      },
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
        path: 'profile',
        loadComponent: () =>
          import('./pages/content-creator/profile/profile').then(m => m.ProfileComponentContentCreator)
      },
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
        path: 'objects/create',
        loadComponent: () =>
          import('./pages/content-creator/objects/object-create/object-create.component').then(m => m.ObjectCreateComponent)
      },
      {
        path: 'objects/edit/:id',
        loadComponent: () =>
          import('./pages/content-creator/objects/object-create/object-create.component').then(m => m.ObjectCreateComponent)
      },
      {
        path: 'activities',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/content-creator/activities/activities.component').then(m => m.ContentCreatorActivitiesComponent)
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./pages/content-creator/activities/activity-create/activity-create.component').then(m => m.ActivityCreateComponent)
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./pages/content-creator/activities/activity-create/activity-create.component').then(m => m.ActivityCreateComponent)
          }
        ]
      },
      {
        path: 'events',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/content-creator/events/events.component').then(m => m.ContentCreatorEventsComponent)
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./pages/content-creator/events/event-form/event-form.component').then(m => m.EventFormComponent)
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./pages/content-creator/events/event-form/event-form.component').then(m => m.EventFormComponent)
          },
          {
            path: 'view/:id',
            loadComponent: () =>
              import('./pages/content-creator/events/event-details/event-details.component').then(m => m.EventDetailsComponent)
          }
        ]
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
        path: 'profile',
        loadComponent: () =>
          import('./pages/manager/profile/profile').then(m => m.ProfileComponentManager)
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/manager/dashboard/dashboard.component').then(m => m.ManagerDashboardComponent)
      },
      {
        path: 'objects/review/:id',
        loadComponent: () =>
          import('./pages/content-creator/objects/object-create/object-create.component').then(
            m => m.ObjectCreateComponent
          ),
        data: { managerReview: true }
      },
      {
        path: 'objects',
        loadComponent: () =>
          import('./pages/manager/objects/objects.component').then(m => m.ManagerObjectsComponent)
      },
      {
        path: 'activities',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/manager/activities/activities.component').then(m => m.ManagerActivitiesComponent)
          },
          {
            path: 'review/:id',
            loadComponent: () =>
              import('./pages/manager/activities/activity-details/activity-review.component').then(m => m.ManagerActivityReviewComponent)
          }
        ]
      },
      {
        path: 'events',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/manager/events/events.component').then(m => m.ManagerEventsComponent)
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./pages/manager/events/event-form/event-form.component').then(m => m.ManagerEventFormComponent)
          }
        ]
      },
      {
        path: 'localities/create',
        loadComponent: () =>
          import('./pages/manager/localities/locality-create/locality-create.component').then(m => m.ManagerLocalityCreateComponent)
      },
      {
        path: 'localities/edit/:id',
        loadComponent: () =>
          import('./pages/manager/localities/locality-create/locality-create.component').then(m => m.ManagerLocalityCreateComponent)
      },
      {
        path: 'localities',
        loadComponent: () =>
          import('./pages/manager/localities/localities.component').then(m => m.ManagerLocalitiesComponent)
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