import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RouterHistoryService {
  private history: string[] = [];
  private isGoingBack = false;

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = e.urlAfterRedirects;

        if (url.startsWith('/login')) {
          return;
        }

        if (this.isGoingBack) {
          this.isGoingBack = false;
          return;
        }

        const last = this.history[this.history.length - 1];

        if (last !== url) {
          this.history.push(url);
        }
      });
  }

  getPreviousUrl(): string | null {
    if (this.history.length < 2) {
      return null;
    }

    return this.history[this.history.length - 2];
  }

  getLastUrl(): string | null {
    return this.history[this.history.length - 1] ?? null;
  }

  goBack(fallback: string = '/home'): void {
    if (this.history.length < 2) {
      this.router.navigateByUrl(fallback);
      return;
    }

    this.history.pop();

    const previous = this.history[this.history.length - 1];

    if (!previous) {
      this.router.navigateByUrl(fallback);
      return;
    }

    this.isGoingBack = true;
    this.router.navigateByUrl(previous);
  }

  clear(): void {
    this.history = [];
  }
}