import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription, Subject, catchError, debounceTime, distinctUntilChanged, from, map, of, switchMap } from 'rxjs';

import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { RouterHistoryService } from '../../services/router-history';
import { LocationTrackingService } from '../../services/location-tracking';
import {
  LocationIntelligenceService,
  QuietZoneAddressSuggestion,
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
  private readonly quietZoneSearch$ = new Subject<{ kind: QuietZoneKind; query: string }>();
  private readonly quietZoneBlurTimeouts: Record<QuietZoneKind, ReturnType<typeof setTimeout> | null> = {
    home: null,
    work: null,
  };
  private activeQuietZone: QuietZoneKind | null = null;

  locationEnabled = false;
  showLocationConsentHint = false;
  autoRegionEnabled = false;
  homeZone: QuietZone | null = null;
  workZone: QuietZone | null = null;
  homeZoneInput = '';
  workZoneInput = '';
  homeZoneSuggestions: QuietZoneAddressSuggestion[] = [];
  workZoneSuggestions: QuietZoneAddressSuggestion[] = [];
  homeZoneError = '';
  workZoneError = '';
  savingQuietZone: QuietZoneKind | null = null;
  private selectedHomeZoneSuggestion: QuietZoneAddressSuggestion | null = null;
  private selectedWorkZoneSuggestion: QuietZoneAddressSuggestion | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private routerHistoryService: RouterHistoryService,
    private locationTrackingService: LocationTrackingService,
    private locationIntelligenceService: LocationIntelligenceService,
    private cdr: ChangeDetectorRef,
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

    this.subscriptions.add(
      this.quietZoneSearch$
        .pipe(
          debounceTime(250),
          distinctUntilChanged((previous, current) => (
            previous.kind === current.kind &&
            previous.query === current.query
          )),
          switchMap(({ kind, query }) =>
            from(this.locationIntelligenceService.searchAddresses(query)).pipe(
              map((suggestions) => ({ kind, query, suggestions })),
              catchError(() => of({ kind, query, suggestions: [] as QuietZoneAddressSuggestion[] })),
            ),
          ),
        )
        .subscribe(({ kind, query, suggestions }) => {
          if (this.getQuietZoneInput(kind).trim() !== query || this.activeQuietZone !== kind) {
            return;
          }

          this.setQuietZoneSuggestions(kind, suggestions);
          this.cdr.markForCheck();
        }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearQuietZoneBlurTimeout('home');
    this.clearQuietZoneBlurTimeout('work');
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
    this.setQuietZoneSuggestions(kind, []);
    this.cdr.markForCheck();

    try {
      const input = kind === 'home' ? this.homeZoneInput : this.workZoneInput;
      const selectedSuggestion = this.getSelectedQuietZoneSuggestion(kind);
      const zone =
        selectedSuggestion && selectedSuggestion.displayName === input.trim()
          ? this.locationIntelligenceService.saveQuietZoneFromSuggestion(kind, selectedSuggestion)
          : await this.locationIntelligenceService.saveQuietZoneFromAddress(kind, input);

      if (kind === 'home') {
        this.homeZoneInput = zone.address;
      } else {
        this.workZoneInput = zone.address;
      }
    } catch {
      this.setQuietZoneError(kind, 'settings.smartLocation.zoneSaveError');
    } finally {
      this.savingQuietZone = null;
      this.cdr.markForCheck();
    }
  }

  async useCurrentLocationForZone(kind: QuietZoneKind): Promise<void> {
    this.setQuietZoneError(kind, '');
    this.setQuietZoneSuggestions(kind, []);
    this.setSelectedQuietZoneSuggestion(kind, null);
    this.savingQuietZone = kind;
    this.cdr.markForCheck();

    try {
      const label = kind === 'home' ? this.homeZoneInput : this.workZoneInput;
      const zone = await this.locationIntelligenceService.saveQuietZoneFromCurrentLocation(kind, label);

      if (kind === 'home') {
        this.homeZoneInput = zone.address;
      } else {
        this.workZoneInput = zone.address;
      }
    } catch {
      this.setQuietZoneError(kind, 'settings.smartLocation.zoneLocationError');
    } finally {
      this.savingQuietZone = null;
      this.cdr.markForCheck();
    }
  }

  clearQuietZone(kind: QuietZoneKind): void {
    this.locationIntelligenceService.clearQuietZone(kind);
    this.setQuietZoneError(kind, '');
    this.setQuietZoneSuggestions(kind, []);
    this.setSelectedQuietZoneSuggestion(kind, null);

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

  onQuietZoneInputChange(kind: QuietZoneKind, value: string): void {
    this.setQuietZoneInput(kind, value);
    this.setQuietZoneError(kind, '');

    const currentSelection = this.getSelectedQuietZoneSuggestion(kind);
    if (!currentSelection || currentSelection.displayName !== value.trim()) {
      this.setSelectedQuietZoneSuggestion(kind, null);
    }

    const trimmedValue = value.trim();
    if (trimmedValue.length < 3) {
      this.setQuietZoneSuggestions(kind, []);
      return;
    }

    this.quietZoneSearch$.next({ kind, query: trimmedValue });
  }

  onQuietZoneFocus(kind: QuietZoneKind): void {
    this.clearQuietZoneBlurTimeout(kind);
    this.activeQuietZone = kind;

    const input = this.getQuietZoneInput(kind).trim();
    if (input.length >= 3 && !this.getQuietZoneSuggestions(kind).length) {
      this.quietZoneSearch$.next({ kind, query: input });
    }
  }

  onQuietZoneBlur(kind: QuietZoneKind): void {
    this.clearQuietZoneBlurTimeout(kind);
    this.quietZoneBlurTimeouts[kind] = setTimeout(() => {
      this.activeQuietZone = this.activeQuietZone === kind ? null : this.activeQuietZone;
      this.setQuietZoneSuggestions(kind, []);
      this.cdr.markForCheck();
    }, 150);
  }

  selectQuietZoneSuggestion(kind: QuietZoneKind, suggestion: QuietZoneAddressSuggestion): void {
    this.clearQuietZoneBlurTimeout(kind);
    this.setQuietZoneInput(kind, suggestion.displayName);
    this.setSelectedQuietZoneSuggestion(kind, suggestion);
    this.setQuietZoneSuggestions(kind, []);
    this.setQuietZoneError(kind, '');
  }

  getQuietZoneSuggestions(kind: QuietZoneKind): QuietZoneAddressSuggestion[] {
    return kind === 'home' ? this.homeZoneSuggestions : this.workZoneSuggestions;
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

  private getQuietZoneInput(kind: QuietZoneKind): string {
    return kind === 'home' ? this.homeZoneInput : this.workZoneInput;
  }

  private setQuietZoneInput(kind: QuietZoneKind, value: string): void {
    if (kind === 'home') {
      this.homeZoneInput = value;
      return;
    }

    this.workZoneInput = value;
  }

  private setQuietZoneSuggestions(kind: QuietZoneKind, suggestions: QuietZoneAddressSuggestion[]): void {
    if (kind === 'home') {
      this.homeZoneSuggestions = suggestions;
      return;
    }

    this.workZoneSuggestions = suggestions;
  }

  private getSelectedQuietZoneSuggestion(kind: QuietZoneKind): QuietZoneAddressSuggestion | null {
    return kind === 'home' ? this.selectedHomeZoneSuggestion : this.selectedWorkZoneSuggestion;
  }

  private setSelectedQuietZoneSuggestion(kind: QuietZoneKind, suggestion: QuietZoneAddressSuggestion | null): void {
    if (kind === 'home') {
      this.selectedHomeZoneSuggestion = suggestion;
      return;
    }

    this.selectedWorkZoneSuggestion = suggestion;
  }

  private clearQuietZoneBlurTimeout(kind: QuietZoneKind): void {
    const timeoutId = this.quietZoneBlurTimeouts[kind];
    if (timeoutId == null) {
      return;
    }

    clearTimeout(timeoutId);
    this.quietZoneBlurTimeouts[kind] = null;
  }
}
