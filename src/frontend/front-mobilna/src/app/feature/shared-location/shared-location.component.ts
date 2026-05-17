import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, catchError, of, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AuthService, SharedLocationDto } from '../../services/auth';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { MapComponent as MiniMapComponent } from '../../shared/components/map/map';

@Component({
  selector: 'app-shared-location',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MiniMapComponent],
  templateUrl: './shared-location.component.html',
  styleUrl: './shared-location.component.scss',
})
export class SharedLocationComponent implements OnInit, OnDestroy {
  private readonly livePollIntervalMs = 15_000;
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly translationService = inject(TranslationService);
  private liveSubscription: Subscription | null = null;

  protected readonly isLoading = signal(true);
  protected readonly sharedLocation = signal<SharedLocationDto | null>(null);
  protected readonly hasError = signal(false);
  protected readonly isLiveView = signal(false);

  ngOnDestroy(): void {
    this.liveSubscription?.unsubscribe();
  }

  ngOnInit(): void {
    const requestedLanguage = this.route.snapshot.queryParamMap.get('lang');
    if (requestedLanguage) {
      this.translationService.setLanguage(requestedLanguage);
    }

    const token = this.route.snapshot.queryParamMap.get('token');
    const isLiveView = this.route.snapshot.queryParamMap.get('live') === '1';
    this.isLiveView.set(isLiveView);

    if (!token) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }

    if (isLiveView) {
      this.liveSubscription = timer(0, this.livePollIntervalMs)
        .pipe(switchMap(() => this.loadLocationShare(token)))
        .subscribe((location) => {
          if (!location) {
            this.hasError.set(true);
            this.isLoading.set(false);
            this.liveSubscription?.unsubscribe();
            return;
          }

          this.sharedLocation.set(location);
          this.hasError.set(false);
          this.isLoading.set(false);
        });
      return;
    }

    this.loadLocationShare(token).subscribe((location) => {
      this.sharedLocation.set(location);
      this.hasError.set(!location);
      this.isLoading.set(false);
    });
  }

  private loadLocationShare(token: string) {
    return this.authService
      .resolveLocationShare(token)
      .pipe(catchError(() => of(null)));
  }
}
