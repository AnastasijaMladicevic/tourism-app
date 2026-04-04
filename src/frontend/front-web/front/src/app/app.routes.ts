import { Routes } from '@angular/router';
import { Signout } from './pages/signout/signout';
import { SignupComponent } from './pages/signup/signup.component';

export const routes: Routes = [
  /*{
      path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },*/
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