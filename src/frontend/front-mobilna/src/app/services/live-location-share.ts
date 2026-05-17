import { Injectable } from '@angular/core';
import { AuthService } from './auth';
import { LocationTrackingService, TrackedLocation } from './location-tracking';

interface LiveLocationShareSession {
  expiresAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class LiveLocationShareService {
  private readonly sessionKey = 'spirego-live-location-share-session';
  private readonly freshLocationMaxAgeMs = 60_000;
  private readonly syncIntervalMs = 20_000;

  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private syncInFlight = false;
  private expiresAtMs: number | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly locationTrackingService: LocationTrackingService,
  ) {
    this.restoreSession();
  }

  startSession(expiresAtUtc: string): void {
    const expiresAtMs = Date.parse(expiresAtUtc);
    if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
      this.stopSession();
      return;
    }

    this.expiresAtMs = expiresAtMs;
    this.persistSession({ expiresAtUtc });
    this.ensureTimer();
    void this.syncNow();
  }

  stopSession(): void {
    if (this.syncTimer !== null) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    this.expiresAtMs = null;
    this.syncInFlight = false;
    this.clearSession();
  }

  isActive(): boolean {
    return this.expiresAtMs !== null && this.expiresAtMs > Date.now();
  }

  private restoreSession(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const raw = localStorage.getItem(this.sessionKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<LiveLocationShareSession>;
      if (typeof parsed.expiresAtUtc !== 'string') {
        this.clearSession();
        return;
      }

      const expiresAtMs = Date.parse(parsed.expiresAtUtc);
      if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
        this.clearSession();
        return;
      }

      this.expiresAtMs = expiresAtMs;
      this.ensureTimer();
      void this.syncNow();
    } catch {
      this.clearSession();
    }
  }

  private ensureTimer(): void {
    if (this.syncTimer !== null) {
      return;
    }

    this.syncTimer = setInterval(() => {
      void this.syncNow();
    }, this.syncIntervalMs);
  }

  private async syncNow(): Promise<void> {
    if (this.syncInFlight) {
      return;
    }

    if (!this.isActive() || !this.authService.isLoggedIn()) {
      this.stopSession();
      return;
    }

    this.syncInFlight = true;

    try {
      const currentLocation = this.locationTrackingService.getCurrentLocation();

      if (this.isFreshGpsLocation(currentLocation)) {
        await this.updateLocationSnapshot(currentLocation);
        return;
      }

      await new Promise<void>((resolve) => {
        this.locationTrackingService.captureCurrentLocation(true, { allowIpFallback: false }).subscribe({
          next: () => resolve(),
          error: () => resolve(),
          complete: () => resolve(),
        });
      });
    } finally {
      this.syncInFlight = false;
    }
  }

  private isFreshGpsLocation(location: TrackedLocation | null): location is TrackedLocation {
    return !!location
      && location.source === 'gps'
      && Date.now() - location.updatedAt <= this.freshLocationMaxAgeMs;
  }

  private async updateLocationSnapshot(location: TrackedLocation): Promise<void> {
    await new Promise<void>((resolve) => {
      this.authService.updateMyLocation({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracyMeters: location.accuracy,
        recordedAtUtc: new Date(location.updatedAt).toISOString(),
      }).subscribe({
        next: () => resolve(),
        error: () => resolve(),
        complete: () => resolve(),
      });
    });
  }

  private persistSession(session: LiveLocationShareSession): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  private clearSession(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(this.sessionKey);
  }
}
