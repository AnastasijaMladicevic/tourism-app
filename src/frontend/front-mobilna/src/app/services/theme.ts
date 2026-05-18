import { Injectable, effect, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'spirego-theme';
  private readonly activeTheme = signal<AppTheme>(this.readStoredTheme());

  constructor() {
    effect(() => {
      this.applyTheme(this.activeTheme());
    });
  }

  theme(): AppTheme {
    return this.activeTheme();
  }

  isDark(): boolean {
    return this.activeTheme() === 'dark';
  }

  setTheme(theme: AppTheme): AppTheme {
    this.activeTheme.set(theme);
    this.persistTheme(theme);
    return theme;
  }

  private applyTheme(theme: AppTheme): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;

    if (document.body) {
      document.body.setAttribute('data-theme', theme);
      document.body.style.colorScheme = theme;
    }
  }

  private persistTheme(theme: AppTheme): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, theme);
  }

  private readStoredTheme(): AppTheme {
    if (typeof localStorage === 'undefined') {
      return 'light';
    }

    return localStorage.getItem(this.storageKey) === 'dark' ? 'dark' : 'light';
  }
}
