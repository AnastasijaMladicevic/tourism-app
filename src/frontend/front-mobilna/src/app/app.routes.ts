import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./feature/splash/splash').then(m => m.SplashComponent) },
  { path: 'login', loadComponent: () => import('./feature/login/login').then(m => m.LoginComponent) },
  // { path: 'register', loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent) },
  // { path: 'forgot-password', loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent) },

  // { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  // { path: 'terms', loadComponent: () => import('./pages/terms/terms.component').then(m => m.TermsComponent) },
];