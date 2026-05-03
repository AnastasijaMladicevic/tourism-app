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
        this.history.push(e.urlAfterRedirects);
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