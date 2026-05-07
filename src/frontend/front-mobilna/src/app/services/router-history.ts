import { Injectable } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RouterHistoryService {
  private history: string[] = [];

  constructor(private router: Router) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const url = e.urlAfterRedirects;

        // ne cuvaj login u history
        if (url.startsWith('/login')) {
          return;
        }

        // izbegni duplikate
        const last = this.history[this.history.length - 1];

        if (last !== url) {
          this.history.push(url);
        }
      });
  }

  getPreviousUrl(): string | null {
    if (this.history.length < 2) return null;

    return this.history[this.history.length - 2];
  }

  goBack(fallback: string = '/home'): void {
    const prev = this.getPreviousUrl();

    if (prev) {
      this.router.navigateByUrl(prev);
    } else {
      this.router.navigateByUrl(fallback);
    }
  }

  clear(): void {
    this.history = [];
  }
}