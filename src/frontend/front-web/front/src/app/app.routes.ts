import { Routes } from '@angular/router';
import { Signout } from './pages/signout/signout';
import { SignupComponent } from './pages/signup/signup.component';

export const routes: Routes = [
  {
      path: '',
    redirectTo: 'signup',
    pathMatch: 'full'
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup.component').then((m) => m.SignupComponent),
  },
  {
    path: 'signout',
    component: Signout
  }
];