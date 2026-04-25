import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth';

export interface TrackedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  updatedAt: number;
}

@Injectable({ providedIn: 'root' })
export class LocationTrackingService {
  private readonly enabledKey = 'spirego-location-tracking-enabled';
  private readonly snapshotKey = 'spirego-location-tracking-snapshot';

  private watchId: number | null = null;

  private readonly trackingEnabledSubject = new BehaviorSubject<boolean>(this.readEnabled());
  private readonly locationSubject = new BehaviorSubject<TrackedLocation | null>(this.readSnapshot());

  readonly trackingEnabled$ = this.trackingEnabledSubject.asObservable();
  readonly location$ = this.locationSubject.asObservable();

  constructor(private readonly authService: AuthService) {
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
    if (!this.canUseGeolocation()) {
      return false;
    }

    this.setTrackingEnabled(true);
    this.ensureTracking();
    return true;
  }

  stopTracking(): void {
    if (this.watchId !== null && this.canUseGeolocation()) {
      navigator.geolocation.clearWatch(this.watchId);
    }

    this.watchId = null;
    this.setTrackingEnabled(false);
    this.locationSubject.next(null);
    this.removeSnapshot();
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
    };

    this.locationSubject.next(snapshot);
    this.persistSnapshot(snapshot);

    if (this.authService.isLoggedIn()) {
      this.authService
        .updateMyLocation(snapshot.latitude, snapshot.longitude)
        .subscribe({ error: () => void 0 });
    }
  }

  private handleError(error: GeolocationPositionError): void {
    if (error.code === error.PERMISSION_DENIED) {
      this.stopTracking();
    }
  }

  private canUseGeolocation(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.geolocation;
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
      };
    } catch {
      return null;
    }
  }
}
