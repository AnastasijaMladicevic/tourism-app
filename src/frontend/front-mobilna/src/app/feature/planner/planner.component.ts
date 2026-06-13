import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { EventDto, EventService } from '../../services/event';
import { EventPlannerDto, EventPlannerService } from '../../services/event-planner';
import { PlannerLocalPreferencesService } from '../../services/planner-local-preferences';
import { ProfileStatsCacheService } from '../../services/profile-stats-cache';
import { TranslationService } from '../../services/translation.service';

interface PlannerDay {
  key: string;
  weekday: string;
  dateLabel: string;
  monthLabel: string;
  shortDateLabel: string;
  count: number;
  date: Date;
}

interface PlannerStop {
  scheduleKey: string;
  plannerId: number;
  eventId: number;
  title: string;
  category: string;
  location: string;
  destinationName: string;
  localityName: string;
  objectName: string;
  quote: string;
  timeLabel: string;
  durationLabel: string;
  imageUrl: string;
  startDate: Date;
  endDate?: Date | null;
  originalStartDate: string;
  originalEndDate?: string | null;
  dayKey: string;
  isPriority: boolean;
  notes: string;
}

@Component({
  selector: 'app-planner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './planner.component.html',
  styleUrl: './planner.component.scss',
})
export class PlannerComponent implements OnInit {
  private readonly defaultPlannerImage = '/assets/izlet-boko-kotorski-zaliv-1.jpg';
  private readonly plannerService = inject(EventPlannerService);
  private readonly eventService = inject(EventService);
  private readonly plannerLocalPreferences = inject(PlannerLocalPreferencesService);
  private readonly profileStatsCache = inject(ProfileStatsCacheService);
  private readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);

  protected readonly plannerItems = signal<PlannerStop[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly removingPlannerId = signal<number | null>(null);
  protected readonly selectedDayKey = signal<string | null>(null);
  protected readonly pendingRemovalStop = signal<PlannerStop | null>(null);

  protected readonly days = computed<PlannerDay[]>(() => {
    const grouped = new Map<string, PlannerDay>();

    for (const item of this.plannerItems()) {
      if (!grouped.has(item.dayKey)) {
        grouped.set(item.dayKey, this.createDay(item.startDate));
      }

      const current = grouped.get(item.dayKey);
      if (current) {
        current.count += 1;
      }
    }

    return [...grouped.values()].sort((left, right) => left.date.getTime() - right.date.getTime());
  });

  protected readonly selectedDay = computed(() => {
    const key = this.selectedDayKey();
    return this.days().find((day) => day.key === key) ?? this.days()[0] ?? null;
  });

  protected readonly selectedStops = computed(() => {
    const selected = this.selectedDay();
    if (!selected) {
      return [];
    }

    return this.plannerItems()
      .filter((item) => item.dayKey === selected.key)
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
  });

  protected readonly tripTitle = computed(() => this.buildTripTitle());
  protected readonly tripDateRange = computed(() => this.buildTripDateRange());
  protected readonly tripLocation = computed(() => this.buildTripLocation());
  protected readonly tripHeroImage = computed(
    () =>
      this.selectedStops()[0]?.imageUrl ||
      this.plannerItems()[0]?.imageUrl ||
      this.defaultPlannerImage,
  );
  protected readonly totalEvents = computed(() => this.plannerItems().length);
  protected readonly plannedHours = computed(() => {
    const totalMinutes = this.plannerItems().reduce(
      (sum, item) => sum + this.calculateDurationMinutes(item.startDate, item.endDate),
      0,
    );

    return (totalMinutes / 60).toFixed(1);
  });
  protected readonly highlightStops = computed(() => {
    const prioritized = this.selectedStops().filter((item) => item.isPriority);
    return (prioritized.length ? prioritized : this.selectedStops()).slice(0, 2);
  });

  ngOnInit(): void {
    this.loadPlanner();
  }

  protected translate(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  protected trackDay(_: number, item: PlannerDay): string {
    return item.key;
  }

  protected trackStop(_: number, item: PlannerStop): string {
    return item.scheduleKey;
  }

  protected selectDay(dayKey: string): void {
    this.selectedDayKey.set(dayKey);
  }

  protected openEvents(): void {
    void this.router.navigate(['/events']);
  }

  protected openEvent(stop: PlannerStop): void {
    void this.router.navigate(['/event', stop.eventId]);
  }

  protected requestRemoveStop(stop: PlannerStop, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.removingPlannerId()) {
      return;
    }

    this.pendingRemovalStop.set(stop);
  }

  protected cancelRemoveStop(): void {
    if (this.removingPlannerId()) {
      return;
    }

    this.pendingRemovalStop.set(null);
  }

  protected confirmRemoveStop(): void {
    const stop = this.pendingRemovalStop();
    if (!stop || this.removingPlannerId()) {
      return;
    }

    const plannerId = stop.plannerId;

    const previousItems = this.plannerItems();
    const nextItems = previousItems.filter((item) => item.plannerId !== plannerId);

    if (nextItems.length === previousItems.length) {
      this.pendingRemovalStop.set(null);
      return;
    }

    this.plannerItems.set(nextItems);
    this.profileStatsCache.write({ plans: nextItems.length });
    this.ensureSelectedDayAfterRemoval();
    this.removingPlannerId.set(plannerId);
    this.errorMessage.set('');
    this.pendingRemovalStop.set(null);

    this.plannerService
      .remove(plannerId)
      .pipe(
        catchError(() => {
          this.plannerItems.set(previousItems);
          this.profileStatsCache.write({ plans: previousItems.length });
          this.ensureSelectedDay();
          this.errorMessage.set(this.translate('planner.removeError'));
          return of(false);
        }),
        finalize(() => this.removingPlannerId.set(null)),
      )
      .subscribe((success) => {
        if (success !== false) {
          this.plannerLocalPreferences.remove(plannerId);
        }
      });
  }

  private loadPlanner(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.plannerService
      .getMyPlanner({
        page: 1,
        pageSize: 100,
        sortBy: 'startDate',
        sortOrder: 'asc',
      })
      .pipe(
        switchMap((result) => {
          if (!result.items.length) {
            return of([] as PlannerStop[]);
          }

          const eventIds = Array.from(new Set(result.items.map((item) => item.eventId)));

          return this.eventService.getByIds(eventIds).pipe(
            map((events) => {
              const eventsById = new Map(events.map((event) => [event.id, event]));
              return result.items.flatMap((item) =>
                this.mapPlannerItems(item, eventsById.get(item.eventId)),
              );
            }),
            catchError(() =>
              of(result.items.flatMap((item) => this.mapPlannerItems(item))),
            ),
          );
        }),
        catchError(() => {
          this.errorMessage.set(this.translate('planner.loadError'));
          return of([] as PlannerStop[]);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((items) => {
        this.plannerItems.set(items);
        this.profileStatsCache.write({ plans: items.length });
        this.ensureSelectedDay();
      });
  }

  private mapPlannerItems(item: EventPlannerDto, eventDetails?: EventDto): PlannerStop[] {
    const resolvedSchedules = this.plannerLocalPreferences.resolveSchedules(
      item.id,
      item.startDate,
      item.endDate,
    );
    const imageUrl =
      this.resolveMediaUrl(eventDetails?.mainImageUrl) ||
      this.resolveMediaUrl(eventDetails?.images?.find((image) => image.isMain)?.url) ||
      this.resolveMediaUrl(eventDetails?.images?.[0]?.url) ||
      this.defaultPlannerImage;

    return resolvedSchedules.map((resolvedSchedule) => {
      const startDate = resolvedSchedule.startDate;
      const endDate = resolvedSchedule.endDate;

      return {
        scheduleKey: `${item.id}-${this.toDayKey(startDate)}-${startDate.getTime()}`,
        plannerId: item.id,
        eventId: item.eventId,
        title: item.eventName,
        category: item.eventTypeName || this.translate('event.title'),
        location: this.buildLocation(item, eventDetails),
        destinationName: (eventDetails?.destinationName || item.destinationName || '').trim(),
        localityName: (eventDetails?.localityName || item.localityName || '').trim(),
        objectName: (eventDetails?.objectName || item.objectName || '').trim(),
        quote: this.buildQuote(item, eventDetails),
        timeLabel: this.formatTime(startDate),
        durationLabel: this.formatDuration(startDate, endDate),
        imageUrl,
        startDate,
        endDate,
        originalStartDate: eventDetails?.startDate || item.startDate,
        originalEndDate: eventDetails?.endDate || item.endDate,
        dayKey: this.toDayKey(startDate),
        isPriority: resolvedSchedule.isPriority,
        notes: resolvedSchedule.notes,
      };
    });
  }

  private createDay(date: Date): PlannerDay {
    return {
      key: this.toDayKey(date),
      weekday: new Intl.DateTimeFormat(this.translationService.currentLocale(), { weekday: 'short' })
        .format(date)
        .toUpperCase(),
      dateLabel: new Intl.DateTimeFormat(this.translationService.currentLocale(), { day: '2-digit' }).format(date),
      monthLabel: new Intl.DateTimeFormat(this.translationService.currentLocale(), { month: 'short' })
        .format(date)
        .toUpperCase(),
      shortDateLabel: new Intl.DateTimeFormat(this.translationService.currentLocale(), {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(date),
      count: 0,
      date,
    };
  }

  private ensureSelectedDay(): void {
    const currentKey = this.selectedDayKey();
    const days = this.days();

    if (!days.length) {
      this.selectedDayKey.set(null);
      return;
    }

    if (currentKey && days.some((day) => day.key === currentKey)) {
      return;
    }

    const todayKey = this.toDayKey(new Date());
    const matchingToday = days.find((day) => day.key === todayKey);
    this.selectedDayKey.set(matchingToday?.key ?? days[0].key);
  }

  private ensureSelectedDayAfterRemoval(): void {
    const currentKey = this.selectedDayKey();
    const days = this.days();

    if (!days.length) {
      this.selectedDayKey.set(null);
      return;
    }

    if (currentKey && days.some((day) => day.key === currentKey)) {
      return;
    }

    this.selectedDayKey.set(days[0].key);
  }

  private buildTripTitle(): string {
    const destinations = [...new Set(this.plannerItems().map((item) => item.destinationName).filter(Boolean))];

    if (destinations.length >= 2) {
      return this.translate('planner.tripWeekSuffix', {
        name: `${destinations[0]} & ${destinations[1]}`,
      });
    }

    if (destinations.length === 1) {
      const localities = [...new Set(this.plannerItems().map((item) => item.localityName).filter(Boolean))];
      if (localities.length) {
        return this.translate('planner.tripWeekSuffix', { name: `${destinations[0]} ${localities[0]}` });
      }

      return this.translate('planner.tripEventWeekSuffix', { name: destinations[0] });
    }

    return this.translate('planner.tripTitleFallback');
  }

  private buildTripDateRange(): string {
    const items = this.plannerItems();
    if (!items.length) {
      return this.translate('planner.tripDateFallback');
    }

    const sorted = [...items].sort((left, right) => left.startDate.getTime() - right.startDate.getTime());
    const first = sorted[0]?.startDate;
    const last = sorted[sorted.length - 1]?.startDate;

    if (!first || !last) {
      return this.translate('planner.tripDateFallback');
    }

    const formatter = new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      month: 'short',
      day: 'numeric',
    });
    return `${formatter.format(first)} - ${formatter.format(last)}, ${last.getFullYear()}`;
  }

  private buildTripLocation(): string {
    const destinationNames = [...new Set(this.plannerItems().map((item) => item.destinationName).filter(Boolean))];
    if (destinationNames.length) {
      return destinationNames.slice(0, 3).join(' / ');
    }

    const locations = [...new Set(this.plannerItems().map((item) => item.location).filter(Boolean))];
    return locations.slice(0, 2).join(' / ') || this.translate('planner.tripLocationFallback');
  }

  private buildLocation(item: EventPlannerDto, eventDetails?: EventDto): string {
    const values = [
      eventDetails?.objectName || item.objectName,
      eventDetails?.localityName || item.localityName,
      eventDetails?.destinationName || item.destinationName,
    ]
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));

    return values.join(', ') || this.translate('planner.tripLocationFallback');
  }

  private buildQuote(item: EventPlannerDto, eventDetails?: EventDto): string {
    const preference = this.plannerLocalPreferences.findByPlannerId(item.id);
    if (preference?.notes.trim()) {
      return this.truncate(preference.notes.trim(), 88);
    }

    if (eventDetails?.description?.trim()) {
      return this.truncate(eventDetails.description.trim(), 88);
    }

    if (item.objectName?.trim()) {
      return this.translate('planner.quoteHosted', { name: item.objectName.trim() });
    }

    if (item.localityName?.trim()) {
      return this.translate('planner.quotePlanned', { name: item.localityName.trim() });
    }

    return this.translate('planner.quoteFallback');
  }

  private calculateDurationMinutes(start: Date, end?: Date | null): number {
    if (!end) {
      return 60;
    }

    const diff = Math.round((end.getTime() - start.getTime()) / 60000);
    return diff > 0 ? diff : 60;
  }

  private formatDuration(start: Date, end?: Date | null): string {
    const minutes = this.calculateDurationMinutes(start, end);

    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = minutes / 60;
    return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) {
      return undefined;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return undefined;
    }

    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    return trimmed.startsWith('/') ? `${apiBase}${trimmed}` : `${apiBase}/${trimmed}`;
  }

  private toDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private truncate(value: string, maxLength: number): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}...`;
  }
  editPlanner(eventItem: PlannerStop, event?: Event): void {
    event?.stopPropagation();
    const preference = this.plannerLocalPreferences.findByPlannerId(eventItem.plannerId);
    this.router.navigate(['/planner/add'], {
      state: {
        plannerId: eventItem.plannerId,
        eventId: eventItem.eventId,
        title: eventItem.title,
        location: eventItem.location,
        startDate: eventItem.originalStartDate,
        endDate: eventItem.originalEndDate,
        plannedDate: this.toDayKey(eventItem.startDate),
        plannedDates: preference?.plannedDates,
        startTime: `${`${eventItem.startDate.getHours()}`.padStart(2, '0')}:${`${eventItem.startDate.getMinutes()}`.padStart(2, '0')}`,
        type: eventItem.category || 'Dogadjaj',
        imageUrl: eventItem.imageUrl || this.resolveMediaUrl(eventItem.imageUrl),
        description: eventItem.quote,
      },
    });
  }
}
