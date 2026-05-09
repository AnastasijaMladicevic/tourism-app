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
  private readonly storageKey = 'spirego-region-id';
  private readonly sourceStorageKey = 'spirego-region-source';
  private readonly usersUrl = `${environment.apiUrl}/users`;
  private readonly regionsUrl = `${environment.apiUrl}/Regions`;
  private readonly fallbackRegionId = 1;
  private readonly activeRegionIdSubject = new BehaviorSubject<number | null>(
    this.readStoredRegionId(),
  );

  constructor(private readonly http: HttpClient) {}

  readonly activeRegionId$ = this.activeRegionIdSubject.asObservable();

  getActiveRegionId(): number | null {
    return this.activeRegionIdSubject.value;
  }

  async loadInitialRegion(): Promise<void> {
    const storedRegionId = this.readStoredRegionId();
    const storedSource = this.readStoredRegionSource();

    if (this.hasAuthToken()) {
      const serverRegionId = await this.tryLoadUserRegionId();
      if (serverRegionId != null) {
        this.setActiveRegionId(serverRegionId, 'user');
        return;
      }

      if (storedRegionId != null) {
        this.activeRegionIdSubject.next(storedRegionId);
        return;
      }
    } else if (storedRegionId != null && storedSource === 'guest') {
      this.activeRegionIdSubject.next(storedRegionId);
      return;
    }

    const defaultRegionId = await this.tryLoadDefaultRegionId();
    if (defaultRegionId != null) {
      this.setActiveRegionId(defaultRegionId, 'default');
      return;
    }

    if (storedRegionId != null) {
      this.activeRegionIdSubject.next(storedRegionId);
      return;
    }

    this.setActiveRegionId(this.fallbackRegionId, 'default');
  }

  setActiveRegionId(regionId: number | null, source: RegionSelectionSource = 'guest'): void {
    if (typeof localStorage !== 'undefined') {
      if (regionId == null) {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.sourceStorageKey);
      } else {
        localStorage.setItem(this.storageKey, String(regionId));
        localStorage.setItem(this.sourceStorageKey, source);
      }
    }

    this.activeRegionIdSubject.next(regionId);
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

  private readStoredRegionId(): number | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    const parsed = Number(raw);
    const normalized = this.normalizeRegionId(parsed);
    if (normalized == null) {
      if (typeof localStorage !== 'undefined' && raw) {
        localStorage.removeItem(this.storageKey);
        localStorage.removeItem(this.sourceStorageKey);
      }
      return null;
    }

    return normalized;
  }

  private readStoredRegionSource(): RegionSelectionSource | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(this.sourceStorageKey);
    if (raw === 'guest' || raw === 'user' || raw === 'default') {
      return raw;
    }

    if (raw) {
      localStorage.removeItem(this.sourceStorageKey);
    }

    return null;
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
}
