import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
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

  startTracking(): boolean {
    if (this.canUseGeolocation()) {
      // GPS dostupan (HTTPS ili localhost) — koristi precizni GPS
      this.setTrackingEnabled(true);
      this.ensureTracking();
      return true;
    }

    if (this.canUseIpFallback()) {
      // HTTP bez GPS — koristi IP geolocation kao fallback
      this.setTrackingEnabled(true);
      this.ensureIpFallback();
      return true;
    }

    return false;
  }

  stopTracking(): void {
    // Zaustavi GPS watch
    if (this.watchId !== null && this.canUseGeolocation()) {
      navigator.geolocation.clearWatch(this.watchId);
    }
    this.watchId = null;

    // Zaustavi IP fallback interval
    if (this.ipFallbackInterval !== null) {
      clearInterval(this.ipFallbackInterval);
      this.ipFallbackInterval = null;
    }

    this.setTrackingEnabled(false);
    this.locationSubject.next(null);
    this.removeSnapshot();
  }

  // ─── GPS (samo na HTTPS / localhost) ───────────────────────────────────────

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
    const snapshot: TrackedLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      updatedAt: Date.now(),
      source: 'gps',
    };

    this.emitLocation(snapshot);
  }

  private handleError(error: GeolocationPositionError): void {
    if (error.code === error.PERMISSION_DENIED) {
      this.stopTracking();
    }
  }

  // ─── IP Geolocation fallback (radi na HTTP) ────────────────────────────────

  private canUseIpFallback(): boolean {
    return typeof window !== 'undefined' && typeof fetch !== 'undefined';
  }

  private ensureIpFallback(): void {
    if (this.ipFallbackInterval !== null) {
      return; // već radi
    }

    // Odmah jednom pozovi
    void this.fetchIpLocation();

    // Osvežavaj svakih 5 minuta (IP lokacija se ne menja često)
    this.ipFallbackInterval = setInterval(() => {
      void this.fetchIpLocation();
    }, 5 * 60 * 1000);
  }

  private async fetchIpLocation(): Promise<void> {
    try {
      // ipapi.co je besplatan, bez API ključa, do 1000 req/dan
      const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(8000) });

      if (!res.ok) {
        throw new Error(`ipapi.co HTTP ${res.status}`);
      }

      const data = await res.json() as {
        latitude?: number;
        longitude?: number;
        error?: boolean;
      };

      if (data.error || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
        throw new Error('ipapi.co returned invalid data');
      }

      const snapshot: TrackedLocation = {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: 5000, // IP geolocation je ~1-5 km preciznosti
        updatedAt: Date.now(),
        source: 'ip',
      };

      this.emitLocation(snapshot);
    } catch (err) {
      console.warn('[LocationTracking] IP geolocation fallback failed:', err);
    }
  }

  // ─── Zajednička logika ─────────────────────────────────────────────────────

  private emitLocation(snapshot: TrackedLocation): void {
    this.locationSubject.next(snapshot);
    this.persistSnapshot(snapshot);

    if (this.authService.isLoggedIn()) {
      this.authService
        .updateMyLocation(snapshot.latitude, snapshot.longitude)
        .subscribe({ error: () => void 0 });
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