import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface RegionRequestOptions {
  bypassRegion?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ActiveRegionService {
  private readonly storageKey = 'spirego-region-id';
  private readonly activeRegionIdSubject = new BehaviorSubject<number | null>(
    this.readStoredRegionId(),
  );

  readonly activeRegionId$ = this.activeRegionIdSubject.asObservable();

  getActiveRegionId(): number | null {
    return this.activeRegionIdSubject.value;
  }

  setActiveRegionId(regionId: number | null): void {
    if (typeof localStorage !== 'undefined') {
      if (regionId == null) {
        localStorage.removeItem(this.storageKey);
      } else {
        localStorage.setItem(this.storageKey, String(regionId));
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
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }
}
