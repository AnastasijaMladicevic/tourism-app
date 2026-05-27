import { Injectable } from '@angular/core';

export interface PlannerLocalPreference {
  plannerId: number;
  eventId: number;
  plannedDate: string;
  startTime: string;
  durationMinutes: number;
  notes: string;
  isPriority: boolean;
}

export interface PlannerResolvedSchedule {
  startDate: Date;
  endDate: Date;
  notes: string;
  isPriority: boolean;
  durationMinutes: number;
}

@Injectable({ providedIn: 'root' })
export class PlannerLocalPreferencesService {
  private readonly dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  private readonly storageKey = 'spirego-planner-preferences';

  list(): PlannerLocalPreference[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as PlannerLocalPreference[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  findByPlannerId(plannerId: number): PlannerLocalPreference | null {
    return this.list().find((item) => item.plannerId === plannerId) ?? null;
  }

  upsert(preference: PlannerLocalPreference): void {
    const items = this.list();
    const nextItems = items.filter((item) => item.plannerId !== preference.plannerId);
    nextItems.push(preference);
    localStorage.setItem(this.storageKey, JSON.stringify(nextItems));
  }

  remove(plannerId: number): void {
    const nextItems = this.list().filter((item) => item.plannerId !== plannerId);
    localStorage.setItem(this.storageKey, JSON.stringify(nextItems));
  }

  resolveSchedule(
    plannerId: number,
    fallbackStart: string,
    fallbackEnd?: string | null,
  ): PlannerResolvedSchedule {
    const preference = this.findByPlannerId(plannerId);
    const fallbackDurationMinutes = this.resolveDurationMinutes(fallbackStart, fallbackEnd);

    if (preference) {
      const startDate = this.mergeDateAndTime(preference.plannedDate, preference.startTime);
      const safeStartDate = this.isValidDate(startDate) ? startDate : this.parseDate(fallbackStart);
      const durationMinutes = fallbackDurationMinutes ?? this.normalizeDuration(preference.durationMinutes);

      return {
        startDate: safeStartDate,
        endDate: this.addMinutes(safeStartDate, durationMinutes),
        notes: preference.notes,
        isPriority: preference.isPriority,
        durationMinutes,
      };
    }

    const startDate = this.parseDate(fallbackStart);
    const durationMinutes = fallbackDurationMinutes ?? 90;
    const endDate = this.addMinutes(startDate, durationMinutes);

    return {
      startDate,
      endDate,
      notes: '',
      isPriority: false,
      durationMinutes,
    };
  }

  private parseDate(value: string): Date {
    if (this.dateOnlyPattern.test(value)) {
      const [yearRaw, monthRaw, dayRaw] = value.split('-');
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      const day = Number(dayRaw);

      if (![year, month, day].some((part) => Number.isNaN(part))) {
        const localDate = new Date(year, month - 1, day);
        if (this.isValidDate(localDate)) {
          return localDate;
        }
      }
    }

    const parsed = new Date(value);
    return this.isValidDate(parsed) ? parsed : new Date();
  }

  private mergeDateAndTime(dateValue: string, timeValue: string): Date {
    const parsedDate = this.parseDate(dateValue);
    const [hoursRaw, minutesRaw] = timeValue.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return parsedDate;
    }

    const merged = new Date(parsedDate);
    merged.setHours(hours, minutes, 0, 0);
    return merged;
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  private normalizeDuration(minutes: number): number {
    const normalized = Number(minutes);
    if (Number.isNaN(normalized) || normalized <= 0) {
      return 90;
    }

    return normalized;
  }

  private resolveDurationMinutes(
    fallbackStart: string,
    fallbackEnd?: string | null,
  ): number | null {
    const startDate = this.parseDate(fallbackStart);
    if (!fallbackEnd) {
      return null;
    }

    const endDate = this.parseDate(fallbackEnd);
    const anchoredEndDate = new Date(startDate);
    anchoredEndDate.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);

    if (anchoredEndDate <= startDate) {
      anchoredEndDate.setDate(anchoredEndDate.getDate() + 1);
    }

    const durationMinutes = Math.round((anchoredEndDate.getTime() - startDate.getTime()) / 60000);
    return this.normalizeDuration(durationMinutes);
  }

  private isValidDate(date: Date): boolean {
    return !Number.isNaN(date.getTime());
  }
}
