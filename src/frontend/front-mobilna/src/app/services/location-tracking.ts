import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth';

export interface TrackedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  updatedAt: number;
  source?: 'gps' | 'ip';
}

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  private readonly enabledKey = 'spirego-location-tracking-enabled';
  private readonly snapshotKey = 'spirego-location-tracking-snapshot';

  private watchId: number | null = null;
  private ipFallbackInterval: ReturnType<typeof setInterval> | null = null;

  private readonly trackingEnabledSubject = new BehaviorSubject<boolean>(this.readEnabled());
  private readonly locationSubject = new BehaviorSubject<TrackedLocation | null>(this.readSnapshot());

  readonly trackingEnabled$ = this.trackingEnabledSubject.asObservable();
  readonly location$ = this.locationSubject.asObservable();

  constructor(private readonly authService: AuthService) {
    if (this.trackingEnabledSubject.value && !this.canUseGeolocation() && !this.canUseIpFallback()) {
      this.stopTracking();
      return;
    }

    if (this.trackingEnabledSubject.value) {
      this.ensureTracking();
    }
  }

  isTrackingEnabled(): boolean {
    return this.trackingEnabledSubject.value;
  }

  getCurrentLocation(): TrackedLocation | null {
    return this.locationSubject.value;
  }

  captureCurrentLocation(syncWithBackend = true): Observable<TrackedLocation> {
    return new Observable<TrackedLocation>((observer) => {
      const finishWithSnapshot = (snapshot: TrackedLocation) => {
        this.storeLocation(snapshot);

        if (!syncWithBackend || !this.authService.isLoggedIn()) {
          observer.next(snapshot);
          observer.complete();
          return;
        }

        this.authService
          .updateMyLocation({
            latitude: snapshot.latitude,
            longitude: snapshot.longitude,
            accuracyMeters: snapshot.accuracy,
            recordedAtUtc: new Date(snapshot.updatedAt).toISOString(),
          })
          .subscribe({
            next: () => {
              observer.next(snapshot);
              observer.complete();
            },
            error: () => {
              // Lokacija je dobijena, samo push nije uspeo — nastavi svejedno
              observer.next(snapshot);
              observer.complete();
            },
          });
      };

      const finishWithIpFallback = (fallbackError?: Error) => {
        if (!this.canUseIpFallback()) {
          observer.error(fallbackError ?? new Error('geoUnsupported'));
          return;
        }

        void this.fetchIpLocationSnapshot()
          .then((snapshot) => finishWithSnapshot(snapshot))
          .catch(() => observer.error(fallbackError ?? new Error('geoFailed')));
      };

      if (this.canUseGeolocation()) {
        navigator.geolocation.getCurrentPosition(
          (position) => finishWithSnapshot(this.createGpsSnapshot(position)),
          (error) => finishWithIpFallback(this.mapGeolocationError(error)),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
        );
        return;
      }

      finishWithIpFallback(new Error('geoUnsupported'));
    });
  }

  startTracking(): boolean {
    if (this.canUseGeolocation()) {
      this.setTrackingEnabled(true);
      this.ensureTracking();
      return true;
    }

    if (this.canUseIpFallback()) {
      this.setTrackingEnabled(true);
      this.ensureIpFallback();
      return true;
    }

    return false;
  }

  stopTracking(): void {
    if (this.watchId !== null && this.canUseGeolocation()) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;

    if (this.ipFallbackInterval !== null) {
      clearInterval(this.ipFallbackInterval);
      this.ipFallbackInterval = null;
    }

    this.setTrackingEnabled(false);
    this.locationSubject.next(null);
    this.removeSnapshot();
  }

  private canUseGeolocation(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      typeof navigator !== 'undefined' &&
      !!navigator.geolocation
    );
  }

  private ensureTracking(): void {
    if (!this.canUseGeolocation() || this.watchId !== null) {
      return;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleError(error),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );

    navigator.geolocation.getCurrentPosition(
      (position) => this.handlePosition(position),
      (error) => this.handleError(error),
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 },
    );
  }

  private handlePosition(position: GeolocationPosition): void {
    this.emitLocation(this.createGpsSnapshot(position));
  }

  private handleError(error: GeolocationPositionError): void {
    if (error.code === error.PERMISSION_DENIED) {
      this.stopTracking();
    }
  }

  private canUseIpFallback(): boolean {
    return typeof window !== 'undefined' && typeof fetch !== 'undefined';
  }

  private ensureIpFallback(): void {
    if (this.ipFallbackInterval !== null) {
      return;
    }

    void this.fetchIpLocation();

    this.ipFallbackInterval = setInterval(() => {
      void this.fetchIpLocation();
    }, 5 * 60 * 1000);
  }

  private async fetchIpLocation(): Promise<void> {
    try {
      this.emitLocation(await this.fetchIpLocationSnapshot());
    } catch (err) {
      console.warn('[LocationTracking] IP geolocation fallback failed:', err);
    }
  }

  private emitLocation(snapshot: TrackedLocation): void {
    this.storeLocation(snapshot);

    if (this.authService.isLoggedIn()) {
      this.authService
        .updateMyLocation({
          latitude: snapshot.latitude,
          longitude: snapshot.longitude,
          accuracyMeters: snapshot.accuracy,
          recordedAtUtc: new Date(snapshot.updatedAt).toISOString(),
        })
        .subscribe({ error: () => void 0 });
    }
  }

  private storeLocation(snapshot: TrackedLocation): void {
    this.locationSubject.next(snapshot);
    this.persistSnapshot(snapshot);
  }

  private createGpsSnapshot(position: GeolocationPosition): TrackedLocation {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      updatedAt: Date.now(),
      source: 'gps',
    };
  }

  private async fetchIpLocationSnapshot(): Promise<TrackedLocation> {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      throw new Error(`ipapi.co HTTP ${res.status}`);
    }

    const data = (await res.json()) as {
      latitude?: number;
      longitude?: number;
      error?: boolean;
    };

    if (data.error || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      throw new Error('ipapi.co returned invalid data');
    }

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: 5000,
      updatedAt: Date.now(),
      source: 'ip',
    };
  }

  private mapGeolocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('geoDenied');
      case error.POSITION_UNAVAILABLE:
        return new Error('geoUnavailable');
      default:
        return new Error('geoFailed');
    }
  }

  private setTrackingEnabled(enabled: boolean): void {
    this.trackingEnabledSubject.next(enabled);

    if (typeof localStorage === 'undefined') {
      return;
    }

    if (enabled) {
      localStorage.setItem(this.enabledKey, 'true');
    } else {
      localStorage.removeItem(this.enabledKey);
    }
  }

  private persistSnapshot(snapshot: TrackedLocation): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.snapshotKey, JSON.stringify(snapshot));
  }

  private removeSnapshot(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(this.snapshotKey);
  }

  private readEnabled(): boolean {
    if (typeof localStorage === 'undefined') {
      return false;
    }

    return localStorage.getItem(this.enabledKey) === 'true';
  }

  private readSnapshot(): TrackedLocation | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(this.snapshotKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<TrackedLocation>;
      if (
        typeof parsed.latitude !== 'number' ||
        typeof parsed.longitude !== 'number' ||
        typeof parsed.accuracy !== 'number'
      ) {
        return null;
      }

      return {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        accuracy: parsed.accuracy,
        updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
        source: parsed.source ?? 'ip',
      };
    } catch {
      return null;
    }
  }
}
