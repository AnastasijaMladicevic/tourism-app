import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { RouterHistoryService } from '../../services/router-history';
import { LocationTrackingService } from '../../services/location-tracking';
import {
  LocationIntelligenceService,
  QuietZone,
  QuietZoneKind,
} from '../../services/location-intelligence';

@Component({
  selector: 'app-location-settings',
  templateUrl: './location-settings.html',
  styleUrls: ['./location-settings.scss'],
  imports: [CommonModule, MatIconModule, TranslatePipe, FormsModule],
})
export class LocationSettingsComponent implements OnInit, OnDestroy {
  private readonly subscriptions = new Subscription();

  locationEnabled = false;
  showLocationConsentHint = false;
  autoRegionEnabled = false;
  homeZone: QuietZone | null = null;
  workZone: QuietZone | null = null;
  homeZoneInput = '';
  workZoneInput = '';
  homeZoneError = '';
  workZoneError = '';
  savingQuietZone: QuietZoneKind | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private routerHistoryService: RouterHistoryService,
    private locationTrackingService: LocationTrackingService,
    private locationIntelligenceService: LocationIntelligenceService,
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

    this.subscriptions.add(
      this.locationIntelligenceService.state$.subscribe((state) => {
        this.autoRegionEnabled = state.autoRegionEnabled;
        this.homeZone = state.quietZones.home;
        this.workZone = state.quietZones.work;
        this.homeZoneInput = state.quietZones.home?.address ?? this.homeZoneInput;
        this.workZoneInput = state.quietZones.work?.address ?? this.workZoneInput;
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

  setAutoRegionEnabled(enabled: boolean): void {
    this.locationIntelligenceService.setAutoRegionEnabled(enabled);
    this.autoRegionEnabled = enabled;
  }

  async saveQuietZone(kind: QuietZoneKind): Promise<void> {
    this.setQuietZoneError(kind, '');
    this.savingQuietZone = kind;

    try {
      const input = kind === 'home' ? this.homeZoneInput : this.workZoneInput;
      const zone = await this.locationIntelligenceService.saveQuietZoneFromAddress(kind, input);

      if (kind === 'home') {
        this.homeZoneInput = zone.address;
      } else {
        this.workZoneInput = zone.address;
      }
    } catch {
      this.setQuietZoneError(kind, 'settings.smartLocation.zoneSaveError');
    } finally {
      this.savingQuietZone = null;
    }
  }

  useCurrentLocationForZone(kind: QuietZoneKind): void {
    this.setQuietZoneError(kind, '');

    try {
      const label = kind === 'home' ? this.homeZoneInput : this.workZoneInput;
      const zone = this.locationIntelligenceService.saveQuietZoneFromCurrentLocation(kind, label);

      if (kind === 'home') {
        this.homeZoneInput = zone.address;
      } else {
        this.workZoneInput = zone.address;
      }
    } catch {
      this.setQuietZoneError(kind, 'settings.smartLocation.zoneLocationError');
    }
  }

  clearQuietZone(kind: QuietZoneKind): void {
    this.locationIntelligenceService.clearQuietZone(kind);
    this.setQuietZoneError(kind, '');

    if (kind === 'home') {
      this.homeZoneInput = '';
      return;
    }

    this.workZoneInput = '';
  }

  getQuietZone(kind: QuietZoneKind): QuietZone | null {
    return kind === 'home' ? this.homeZone : this.workZone;
  }

  getQuietZoneError(kind: QuietZoneKind): string {
    return kind === 'home' ? this.homeZoneError : this.workZoneError;
  }

  isQuietZoneSaving(kind: QuietZoneKind): boolean {
    return this.savingQuietZone === kind;
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

  private setQuietZoneError(kind: QuietZoneKind, value: string): void {
    if (kind === 'home') {
      this.homeZoneError = value;
      return;
    }

    this.workZoneError = value;
  }
}
