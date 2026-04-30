import { Injectable } from '@angular/core';

export interface ProfileStatsSnapshot {
  favorites: number;
  plans: number;
  reviews: number;
}

@Injectable({ providedIn: 'root' })
export class ProfileStatsCacheService {
  private readonly storageKey = 'spirego-mobile-profile-stats';

  read(): ProfileStatsSnapshot | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<ProfileStatsSnapshot>;
      return this.normalize(parsed);
    } catch {
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  write(snapshot: Partial<ProfileStatsSnapshot>): ProfileStatsSnapshot {
    const next = this.normalize({
      ...(this.read() ?? { favorites: 0, plans: 0, reviews: 0 }),
      ...snapshot,
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(next));
    }

    return next;
  }

  private normalize(snapshot: Partial<ProfileStatsSnapshot> | null | undefined): ProfileStatsSnapshot {
    return {
      favorites: this.toSafeNumber(snapshot?.favorites),
      plans: this.toSafeNumber(snapshot?.plans),
      reviews: this.toSafeNumber(snapshot?.reviews),
    };
  }

  private toSafeNumber(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    return 0;
  }
}
