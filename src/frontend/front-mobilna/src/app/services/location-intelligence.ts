import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ActiveRegionService } from './active-region';
import { AuthService } from './auth';
import { LocationTrackingService, TrackedLocation } from './location-tracking';
import { RegionDto, RegionService } from './region';

export type QuietZoneKind = 'home' | 'work';

export interface QuietZone {
  kind: QuietZoneKind;
  address: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface QuietZoneAddressSuggestion {
  displayName: string;
  latitude: number;
  longitude: number;
}

export interface LocationIntelligenceState {
  autoRegionEnabled: boolean;
  quietZones: Record<QuietZoneKind, QuietZone | null>;
}

interface GeocodeResult {
  display_name?: string;
  lat?: string;
  lon?: string;
}

const DEFAULT_STATE: LocationIntelligenceState = {
  autoRegionEnabled: false,
  quietZones: {
    home: null,
    work: null,
  },
};

@Injectable({ providedIn: 'root' })
export class LocationIntelligenceService {
  private readonly storageKey = 'spirego-location-intelligence';
  private readonly stateSubject = new BehaviorSubject<LocationIntelligenceState>(this.readState());
  private regionsCache: RegionDto[] | null = null;

  readonly state$ = this.stateSubject.asObservable();

  constructor(
    private readonly authService: AuthService,
    private readonly regionService: RegionService,
    private readonly activeRegionService: ActiveRegionService,
    private readonly locationTrackingService: LocationTrackingService,
  ) {
    this.locationTrackingService.location$.subscribe((location) => {
      if (!location || !this.stateSubject.value.autoRegionEnabled) {
        return;
      }

      void this.applyAutoRegion(location);
    });
  }

  getState(): LocationIntelligenceState {
    return this.stateSubject.value;
  }

  isAutoRegionEnabled(): boolean {
    return this.stateSubject.value.autoRegionEnabled;
  }

  async setAutoRegionEnabled(enabled: boolean): Promise<void> {
    this.patchState({ autoRegionEnabled: enabled });

    if (enabled) {
      const currentLocation = this.locationTrackingService.getCurrentLocation();
      if (currentLocation) {
        void this.applyAutoRegion(currentLocation);
      }

      return;
    }

    await this.activeRegionService.restoreDefaultRegion();
  }

  getQuietZone(kind: QuietZoneKind): QuietZone | null {
    return this.stateSubject.value.quietZones[kind];
  }

  async searchAddresses(query: string): Promise<QuietZoneAddressSuggestion[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 3) {
      return [];
    }

    const results = await this.fetchGeocodeResults(trimmedQuery, 5);

    return results
      .map((result) => this.mapSuggestion(result))
      .filter((suggestion): suggestion is QuietZoneAddressSuggestion => suggestion !== null);
  }

  async saveQuietZoneFromAddress(kind: QuietZoneKind, address: string): Promise<QuietZone> {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      throw new Error('Address is required.');
    }

    const results = await this.fetchGeocodeResults(trimmedAddress, 1);
    const suggestion = this.mapSuggestion(results[0], trimmedAddress);

    if (!suggestion) {
      throw new Error('Address not found.');
    }

    const zone = this.createQuietZone(kind, suggestion.displayName, suggestion.latitude, suggestion.longitude);

    this.writeQuietZone(zone);
    return zone;
  }

  saveQuietZoneFromSuggestion(kind: QuietZoneKind, suggestion: QuietZoneAddressSuggestion): QuietZone {
    const zone = this.createQuietZone(
      kind,
      suggestion.displayName,
      suggestion.latitude,
      suggestion.longitude,
    );

    this.writeQuietZone(zone);
    return zone;
  }

  async saveQuietZoneFromCurrentLocation(
    kind: QuietZoneKind,
    customLabel?: string | null,
  ): Promise<QuietZone> {
    const currentLocation =
      this.locationTrackingService.getCurrentLocation()
      ?? await firstValueFrom(this.locationTrackingService.captureCurrentLocation());

    if (!currentLocation) {
      throw new Error('Current location is not available.');
    }

    const resolvedAddress = await this.reverseGeocode(
      currentLocation.latitude,
      currentLocation.longitude,
    ).catch(() => null);

    const fallbackAddress = customLabel?.trim()
      || `${currentLocation.latitude.toFixed(5)}, ${currentLocation.longitude.toFixed(5)}`;

    const zone: QuietZone = {
      kind,
      address: resolvedAddress?.trim() || fallbackAddress,
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      radiusMeters: 350,
    };

    this.writeQuietZone(zone);
    return zone;
  }

  clearQuietZone(kind: QuietZoneKind): void {
    this.patchState({
      quietZones: {
        ...this.stateSubject.value.quietZones,
        [kind]: null,
      },
    });
  }

  isInsideQuietZone(location: TrackedLocation | null = this.locationTrackingService.getCurrentLocation()): boolean {
    if (!location) {
      return false;
    }

    return (['home', 'work'] as QuietZoneKind[]).some((kind) => {
      const zone = this.stateSubject.value.quietZones[kind];
      if (!zone) {
        return false;
      }

      return (
        this.calculateDistanceMeters(
          location.latitude,
          location.longitude,
          zone.latitude,
          zone.longitude,
        ) <= zone.radiusMeters
      );
    });
  }

  shouldSuppressDestinationNotifications(type?: string | null): boolean {
    return type === 'FavoritedLocationNewEvent' && this.isInsideQuietZone();
  }

  private writeQuietZone(zone: QuietZone): void {
    this.patchState({
      quietZones: {
        ...this.stateSubject.value.quietZones,
        [zone.kind]: zone,
      },
    });
  }

  private async applyAutoRegion(location: TrackedLocation): Promise<void> {
    const regions = await this.getRegions();
    const candidates = regions.filter(
      (region) => region.isActive && region.centerLatitude != null && region.centerLongitude != null,
    );

    if (!candidates.length) {
      return;
    }

    const nearestRegion = candidates
      .map((region) => ({
        region,
        distanceMeters: this.calculateDistanceMeters(
          location.latitude,
          location.longitude,
          region.centerLatitude!,
          region.centerLongitude!,
        ),
      }))
      .sort((left, right) => left.distanceMeters - right.distanceMeters)[0]?.region;

    if (!nearestRegion) {
      return;
    }

    if (this.activeRegionService.getActiveRegionId() === nearestRegion.id) {
      return;
    }

    this.activeRegionService.setActiveRegionId(
      nearestRegion.id,
      this.authService.isLoggedIn() ? 'user' : 'guest',
    );
  }

  private async getRegions(): Promise<RegionDto[]> {
    if (this.regionsCache) {
      return this.regionsCache;
    }

    this.regionsCache = await firstValueFrom(this.regionService.getAll(false));
    return this.regionsCache;
  }

  private patchState(patch: Partial<LocationIntelligenceState>): void {
    const nextState: LocationIntelligenceState = {
      ...this.stateSubject.value,
      ...patch,
      quietZones: {
        ...this.stateSubject.value.quietZones,
        ...(patch.quietZones ?? {}),
      },
    };

    this.stateSubject.next(nextState);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(nextState));
    }
  }

  private readState(): LocationIntelligenceState {
    if (typeof localStorage === 'undefined') {
      return DEFAULT_STATE;
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return DEFAULT_STATE;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<LocationIntelligenceState>;
      return {
        autoRegionEnabled: parsed.autoRegionEnabled === true,
        quietZones: {
          home: this.normalizeQuietZone(parsed.quietZones?.home, 'home'),
          work: this.normalizeQuietZone(parsed.quietZones?.work, 'work'),
        },
      };
    } catch {
      return DEFAULT_STATE;
    }
  }

  private normalizeQuietZone(raw: unknown, kind: QuietZoneKind): QuietZone | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const zone = raw as Partial<QuietZone>;
    if (
      typeof zone.address !== 'string' ||
      typeof zone.latitude !== 'number' ||
      typeof zone.longitude !== 'number'
    ) {
      return null;
    }

    return {
      kind,
      address: zone.address,
      latitude: zone.latitude,
      longitude: zone.longitude,
      radiusMeters:
        typeof zone.radiusMeters === 'number' && Number.isFinite(zone.radiusMeters)
          ? zone.radiusMeters
          : 350,
    };
  }

  private async fetchGeocodeResults(query: string, limit: number): Promise<GeocodeResult[]> {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', this.getPreferredGeocodeLanguage());
    url.searchParams.set('q', query);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Address lookup failed.');
    }

    return (await response.json()) as GeocodeResult[];
  }

  private async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(latitude));
    url.searchParams.set('lon', String(longitude));
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', this.getPreferredGeocodeLanguage());

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Reverse geocoding failed.');
    }

    const payload = (await response.json()) as GeocodeResult;
    return payload.display_name?.trim() || null;
  }

  private mapSuggestion(
    result: GeocodeResult | undefined,
    fallbackAddress?: string,
  ): QuietZoneAddressSuggestion | null {
    const latitude = Number(result?.lat);
    const longitude = Number(result?.lon);

    if (!result || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return null;
    }

    return {
      displayName: result.display_name?.trim() || fallbackAddress || '',
      latitude,
      longitude,
    };
  }

  private createQuietZone(
    kind: QuietZoneKind,
    address: string,
    latitude: number,
    longitude: number,
  ): QuietZone {
    return {
      kind,
      address,
      latitude,
      longitude,
      radiusMeters: 350,
    };
  }

  private calculateDistanceMeters(
    latitude1: number,
    longitude1: number,
    latitude2: number,
    longitude2: number,
  ): number {
    const earthRadiusMeters = 6371000;
    const deltaLatitude = this.toRadians(latitude2 - latitude1);
    const deltaLongitude = this.toRadians(longitude2 - longitude1);
    const normalizedLatitude1 = this.toRadians(latitude1);
    const normalizedLatitude2 = this.toRadians(latitude2);

    const a =
      Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
      Math.cos(normalizedLatitude1) *
        Math.cos(normalizedLatitude2) *
        Math.sin(deltaLongitude / 2) *
        Math.sin(deltaLongitude / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusMeters * c;
  }

  private toRadians(value: number): number {
    return (value * Math.PI) / 180;
  }

  private getPreferredGeocodeLanguage(): string {
    if (typeof navigator === 'undefined') {
      return 'sr';
    }

    return navigator.language || 'sr';
  }
}
