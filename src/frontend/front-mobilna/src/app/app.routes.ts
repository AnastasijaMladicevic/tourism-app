import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./feature/login/login').then(m => m.LoginComponent) },
  { path: 'login', loadComponent: () => import('./feature/login/login').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./feature/signup/signup.component').then(m => m.SignupComponent) },
  { path: 'forgot-password', loadComponent: () => import('./feature/auth/forgot-password/forgot-password').then(m => m.ForgotPasswordComponent) },
  { path: 'terms', loadComponent: () => import('./feature/terms/terms.component').then(m => m.TermsComponent) },
  { path: 'code-verification', loadComponent: () => import('./feature/auth/code-verification/code-verification').then(m => m.CodeVerificationComponent) },
  { path: 'new-credentials', loadComponent: () => import('./feature/new-credentials/new-credentials.component').then(m => m.NewCredentialsComponent) },
  { path: 'password-updated', loadComponent: () => import('./feature/auth/password-updated/password-updated').then(m => m.PasswordUpdatedComponent) },
  // { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'attractions', loadComponent: () => import('./feature/attractions/attractions').then(m => m.AttractionsComponent) },
];
