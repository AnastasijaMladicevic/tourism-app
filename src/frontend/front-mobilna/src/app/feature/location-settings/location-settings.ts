import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { RouterHistoryService } from '../../services/router-history';
import { LocationTrackingService } from '../../services/location-tracking';

@Component({
  selector: 'app-location-settings',
  templateUrl: './location-settings.html',
  styleUrls: ['./location-settings.scss'],
  imports: [CommonModule, MatIconModule, TranslatePipe],
})
export class LocationSettingsComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  locationEnabled = false;
  showLocationConsentHint = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private routerHistoryService: RouterHistoryService,
    private locationTrackingService: LocationTrackingService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.locationTrackingService.trackingEnabled$.subscribe((enabled) => {
        this.locationEnabled = enabled;
      }),
    );

    this.subscriptions.add(
      this.route.queryParamMap.subscribe((params) => {
        this.showLocationConsentHint = params.get('locationConsent') === '1';
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  goBack(): void {
    this.routerHistoryService.goBack();
  }

  setLocationEnabled(enabled: boolean): void {
    if (enabled) {
      const started = this.locationTrackingService.startTracking();
      this.locationEnabled = started;
      if (started) {
        this.clearLocationConsentHint();
      }
      return;
    }

    this.locationTrackingService.stopTracking();
    this.locationEnabled = false;
  }

  dismissLocationConsentHint(): void {
    this.clearLocationConsentHint();
  }

  private clearLocationConsentHint(): void {
    this.showLocationConsentHint = false;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { locationConsent: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}