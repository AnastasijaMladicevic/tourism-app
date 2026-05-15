import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environment/environment';

export interface RegionRequestOptions {
  bypassRegion?: boolean;
  bypassLanguage?: boolean;
}

type RegionSelectionSource = 'guest' | 'user' | 'default';

interface RegionDto {
  id: number;
}

interface UserPreferredRegionDto {
  preferredRegionId?: number | null;
  effectiveRegionId?: number | null;
}

@Injectable({ providedIn: 'root' })
export class ActiveRegionService {
  private readonly usersUrl = `${environment.apiUrl}/users`;
  private readonly regionsUrl = `${environment.apiUrl}/Regions`;
  private readonly fallbackRegionId = 1;
  private readonly regionStorageKey = 'spirego-session-region-id';
  private readonly activeRegionIdSubject = new BehaviorSubject<number | null>(this.readStoredRegionId());

  constructor(private readonly http: HttpClient) {}

  readonly activeRegionId$ = this.activeRegionIdSubject.asObservable();

  getActiveRegionId(): number | null {
    return this.activeRegionIdSubject.value;
  }

  async restoreDefaultRegion(): Promise<number> {
    const defaultRegionId = await this.tryLoadDefaultRegionId();
    const resolvedRegionId = defaultRegionId ?? this.fallbackRegionId;
    this.setActiveRegionId(resolvedRegionId, 'default');
    return resolvedRegionId;
  }

  async loadInitialRegion(): Promise<void> {
    const storedRegionId = this.readStoredRegionId();
    if (storedRegionId != null) {
      this.setActiveRegionId(storedRegionId, 'guest');
      return;
    }

    if (this.hasAuthToken()) {
      const serverRegionId = await this.tryLoadUserRegionId();
      if (serverRegionId != null) {
        this.setActiveRegionId(serverRegionId, 'user');
        return;
      }
    }

    const defaultRegionId = await this.tryLoadDefaultRegionId();
    if (defaultRegionId != null) {
      this.setActiveRegionId(defaultRegionId, 'default');
      return;
    }

    this.setActiveRegionId(this.fallbackRegionId, 'default');
  }

  setActiveRegionId(regionId: number | null, source: RegionSelectionSource = 'guest'): void {
    this.activeRegionIdSubject.next(regionId);
    this.persistRegionId(regionId);
  }

  applySelectedRegion<T extends { regionId?: number }>(
    query?: T,
    options?: RegionRequestOptions,
  ): T | undefined {
    if (options?.bypassRegion) {
      return query;
    }

    const activeRegionId = this.getActiveRegionId();
    if (activeRegionId == null || query?.regionId != null) {
      return query;
    }

    return { ...(query ?? {}), regionId: activeRegionId } as T;
  }

  private hasAuthToken(): boolean {
    return typeof localStorage !== 'undefined' && !!localStorage.getItem('token');
  }

  private normalizeRegionId(regionId?: number | null): number | null {
    if (!Number.isInteger(regionId) || regionId == null || regionId <= 0 || regionId === 5) {
      return null;
    }

    return regionId;
  }

  private async tryLoadUserRegionId(): Promise<number | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<UserPreferredRegionDto>(`${this.usersUrl}/me/preferred-region`),
      );

      return this.normalizeRegionId(response.effectiveRegionId ?? response.preferredRegionId ?? null);
    } catch {
      return null;
    }
  }

  private async tryLoadDefaultRegionId(): Promise<number | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<RegionDto>(`${this.regionsUrl}/default`),
      );

      return this.normalizeRegionId(response.id);
    } catch {
      return null;
    }
  }

  private persistRegionId(regionId: number | null): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    if (regionId == null) {
      sessionStorage.removeItem(this.regionStorageKey);
      return;
    }

    sessionStorage.setItem(this.regionStorageKey, String(regionId));
  }

  private readStoredRegionId(): number | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const raw = sessionStorage.getItem(this.regionStorageKey);
    if (!raw) {
      return null;
    }

    return this.normalizeRegionId(Number(raw));
  }
}
