import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/adminlayout/adminlayout.component';
// import { ManagerLayoutComponent } from './layout/manager-layout/manager-layout.component';
// import { ContentCreatorLayoutComponent } from './layout/content-creator-layout/content-creator-layout.component';
 
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
    loadComponent: () =>
      import('./pages/signout/signout').then(m => m.Signout)
  },
 
  // === ADMIN ===
  {
    path: 'admin',
    component: AdminLayoutComponent,
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
 
  // === MANAGER ===
  // {
  //   path: 'manager',
  //   component: ManagerLayoutComponent,
  //   children: [
  //     { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  //     {
  //       path: 'dashboard',
  //       loadComponent: () =>
  //         import('./pages/manager/dashboard/dashboard.component').then(m => m.DashboardComponent)
  //     },
  //   ]
  // },
 
  // === CONTENT CREATOR ===
  // {
  //   path: 'content-creator',
  //   component: ContentCreatorLayoutComponent,
  //   children: [
  //     { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  //     {
  //       path: 'dashboard',
  //       loadComponent: () =>
  //         import('./pages/content-creator/dashboard/dashboard.component').then(m => m.DashboardComponent)
  //     },
  //   ]
  // },
 
  // Fallback
  {
    path: '**',
    redirectTo: 'login'
  }
];