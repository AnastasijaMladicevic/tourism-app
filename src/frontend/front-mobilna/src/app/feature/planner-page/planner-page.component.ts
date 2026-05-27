import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { EventDto, EventService } from '../../services/event';
import { EventPlannerDto, EventPlannerService } from '../../services/event-planner';
import { PlannerLocalPreferencesService } from '../../services/planner-local-preferences';
import { TranslationService } from '../../services/translation.service';
import { AddEventCardComponent } from './add-event-card.component';
import { DailyTimelineComponent } from './daily-timeline.component';
import { EventCardComponent } from './event-card.component';
import { UpcomingHighlightComponent } from './upcoming-highlight.component';
import { VaultSummaryComponent } from './vault-summary.component';
import {
  PlannerDay,
  PlannerEvent,
  PlannerHighlight,
  VaultCategory,
  VaultCategoryIcon,
  VaultStat,
} from './planner-page.data';

interface PlannerStop {
  plannerId: number;
  eventId: number;
  title: string;
  category: string;
  location: string;
  description: string;
  imageUrl: string;
  startDate: Date;
  endDate?: Date | null;
  dayKey: string;
  addedAt: Date;
  searchText: string;
}

type PlannerSortOption = 'time' | 'name';

interface PlannerMonthFilter {
  id: string;
  label: string;
}

@Component({
  selector: 'app-planner-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    EventCardComponent,
    DailyTimelineComponent,
    VaultSummaryComponent,
    UpcomingHighlightComponent,
    AddEventCardComponent,
  ],
  templateUrl: './planner-page.component.html',
  styleUrl: './planner-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlannerPageComponent implements OnInit, OnDestroy {
  private readonly fallbackImage =
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80';
  private readonly plannerService = inject(EventPlannerService);
  private readonly eventService = inject(EventService);
  private readonly plannerLocalPreferences = inject(PlannerLocalPreferencesService);
  private readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);

  protected readonly plannerItems = signal<PlannerStop[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly selectedCategory = signal('all');
  protected readonly sortOption = signal<PlannerSortOption>('time');
  protected readonly selectedMonthKey = signal('');
  protected readonly selectedDayKey = signal<string | null>(null);
  protected readonly removingPlannerId = signal<number | null>(null);
  protected readonly pendingRemovalStop = signal<PlannerStop | null>(null);
  protected readonly isBulkRemoving = signal(false);
  protected readonly isMobileViewport = signal(false);
  protected readonly loadingSkeletonIds = [1, 2, 3];
  protected readonly sidebarSkeletonIds = [1, 2, 3, 4];
  private mobileMediaQuery?: MediaQueryList;
  private readonly mobileMediaListener = (event: MediaQueryListEvent) => {
    this.isMobileViewport.set(event.matches);
  };

  protected readonly monthFilters = computed<PlannerMonthFilter[]>(() => {
    const grouped = new Map<string, Date>();

    for (const item of this.plannerItems()) {
      const key = this.toMonthKey(item.startDate);
      if (!grouped.has(key)) {
        grouped.set(key, item.startDate);
      }
    }

    const months = [...grouped.entries()]
      .sort((left, right) => left[1].getTime() - right[1].getTime())
      .map(([key, date]) => ({
        id: key,
        label: new Intl.DateTimeFormat(this.translationService.currentLocale(), {
          month: 'short',
          year: 'numeric',
        })
          .format(date)
          .replace('.', ''),
      }));

    return [{ id: 'all', label: 'All months' }, ...months];
  });

  protected readonly monthFilteredItems = computed(() => {
    const selectedMonthKey = this.selectedMonthKey();
    if (!selectedMonthKey || selectedMonthKey === 'all') {
      return this.plannerItems();
    }

    return this.plannerItems().filter((item) => this.toMonthKey(item.startDate) === selectedMonthKey);
  });

  protected readonly days = computed<PlannerDay[]>(() => {
    const grouped = new Map<string, { date: Date; count: number }>();

    for (const item of this.monthFilteredItems()) {
      const existing = grouped.get(item.dayKey);
      if (existing) {
        existing.count += 1;
        continue;
      }

      grouped.set(item.dayKey, { date: item.startDate, count: 1 });
    }

    return [...grouped.entries()]
      .sort((left, right) => left[1].date.getTime() - right[1].date.getTime())
      .map(([key, value]) => ({
        id: key,
        label: new Intl.DateTimeFormat(this.translationService.currentLocale(), { weekday: 'short' })
          .format(value.date)
          .replace('.', '')
          .slice(0, 3)
          .toUpperCase(),
        date: new Intl.DateTimeFormat(this.translationService.currentLocale(), { day: '2-digit' }).format(value.date),
        month: new Intl.DateTimeFormat(this.translationService.currentLocale(), { month: 'short' })
          .format(value.date)
          .replace('.', '')
          .slice(0, 3)
          .toUpperCase(),
        active: this.selectedDayKey() === key,
      }));
  });

  protected readonly selectedDay = computed(() => {
    const days = this.days();
    const key = this.selectedDayKey();
    return days.find((day) => day.id === key) ?? days[0] ?? null;
  });

  protected readonly categoryFilters = computed(() => {
    const uniqueCategories = [...new Set(this.monthFilteredItems().map((item) => item.category).filter(Boolean))];
    uniqueCategories.sort((left, right) => left.localeCompare(right));
    return ['All', ...uniqueCategories];
  });

  protected readonly selectedDayStops = computed(() => {
    const selectedDay = this.selectedDay();
    if (!selectedDay) {
      return [];
    }

    return this.monthFilteredItems().filter((item) => item.dayKey === selectedDay.id);
  });

  protected readonly displayedStops = computed(() => {
    const normalizedSearch = this.searchTerm().trim().toLowerCase();
    const selectedCategory = this.selectedCategory();
    const sortOption = this.sortOption();

    const filtered = this.selectedDayStops().filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory;
      const matchesSearch = !normalizedSearch || item.searchText.includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });

    return filtered.sort((left, right) => {
      if (sortOption === 'name') {
        return left.title.localeCompare(right.title);
      }

      return left.startDate.getTime() - right.startDate.getTime();
    });
  });

  protected readonly events = computed<PlannerEvent[]>(() =>
    this.displayedStops().map((item, index) => ({
      id: item.plannerId,
      eventId: item.eventId,
      category: item.category,
      badge: index === 0 ? item.category : undefined,
      imageUrl: item.imageUrl,
      title: item.title,
      description: item.description,
      location: item.location,
      time: this.formatTime(item.startDate),
    })),
  );

  protected readonly stats = computed<VaultStat[]>(() => [
    { value: `${this.plannerItems().length}`, label: 'TOTAL VAULT' },
    { value: `${this.recentItemsCount()}`, label: 'RECENT (7D)' },
  ]);

  protected readonly categories = computed<VaultCategory[]>(() => {
    const counts = new Map<string, number>();

    for (const item of this.plannerItems()) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .slice(0, 5)
      .map(([name, count], index) => ({
        id: index + 1,
        name,
        count,
        icon: this.resolveCategoryIcon(name),
      }));
  });

  protected readonly highlights = computed<PlannerHighlight[]>(() => {
    const now = Date.now();

    return this.plannerItems()
      .filter((item) => item.startDate.getTime() >= now)
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())
      .slice(0, 2)
      .map((item) => ({
        id: item.plannerId,
        eventId: item.eventId,
        title: item.title,
        subtitle: this.buildUpcomingSubtitle(item.startDate),
        imageUrl: item.imageUrl,
      }));
  });

  protected readonly recentItemsCount = computed(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.plannerItems().filter((item) => item.addedAt.getTime() >= sevenDaysAgo).length;
  });

  protected readonly selectedDateCard = computed(() => {
    const selectedDay = this.selectedDay();
    return {
      label: selectedDay?.label ?? 'DAY',
      date: selectedDay?.date ?? '--',
      month: selectedDay?.month ?? '---',
    };
  });

  protected readonly hasPlannerItems = computed(() => this.plannerItems().length > 0);
  protected readonly hasDisplayedEvents = computed(() => this.events().length > 0);

  ngOnInit(): void {
    this.initializeViewportWatcher();
    this.loadPlanner();
  }

  ngOnDestroy(): void {
    this.mobileMediaQuery?.removeEventListener('change', this.mobileMediaListener);
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected updateSortOption(value: string): void {
    this.sortOption.set(value === 'name' ? 'name' : 'time');
  }

  protected selectCategory(category: string): void {
    this.selectedCategory.set(category.toLowerCase() === 'all' ? 'all' : category.toLowerCase());
  }

  protected isCategoryActive(category: string): boolean {
    const normalized = category.toLowerCase() === 'all' ? 'all' : category.toLowerCase();
    return this.selectedCategory() === normalized;
  }

  protected selectDay(dayKey: string): void {
    this.selectedDayKey.set(dayKey);
  }

  protected selectMonth(monthKey: string): void {
    this.selectedMonthKey.set(monthKey);
    this.normalizeSelectedCategory();
    this.ensureSelectedDay();
  }

  protected isMonthActive(monthKey: string): boolean {
    return this.selectedMonthKey() === monthKey;
  }

  protected openDetails(eventId: number): void {
    void this.router.navigate(['/event', eventId]);
  }

  protected openEdit(plannerId: number): void {
    const eventItem = this.plannerItems().find((item) => item.plannerId === plannerId);
    if (!eventItem) {
      return;
    }

    void this.router.navigate(['/planner/add'], {
      state: {
        plannerId: eventItem.plannerId,
        eventId: eventItem.eventId,
        title: eventItem.title,
        location: eventItem.location,
        startDate: eventItem.startDate,
        endDate: eventItem.endDate,
        type: eventItem.category,
        imageUrl: eventItem.imageUrl,
        description: eventItem.description,
        plannedDate: this.toDayKey(eventItem.startDate),
        startTime: this.toTimeValue(eventItem.startDate),
      },
    });
  }

  protected removeEvent(plannerId: number): void {
    if (this.removingPlannerId() || this.isBulkRemoving()) {
      return;
    }

    const eventItem = this.plannerItems().find((item) => item.plannerId === plannerId);
    if (!eventItem) {
      return;
    }

    this.pendingRemovalStop.set(eventItem);
  }

  protected cancelRemoveEvent(): void {
    if (this.removingPlannerId() || this.isBulkRemoving()) {
      return;
    }

    this.pendingRemovalStop.set(null);
  }

  protected confirmRemoveEvent(): void {
    const eventItem = this.pendingRemovalStop();
    if (!eventItem || this.removingPlannerId() || this.isBulkRemoving()) {
      return;
    }

    const plannerId = eventItem.plannerId;
    const previousItems = this.plannerItems();
    const nextItems = previousItems.filter((item) => item.plannerId !== plannerId);

    this.plannerItems.set(nextItems);
    this.ensureSelectedMonth();
    this.normalizeSelectedCategory();
    this.ensureSelectedDayAfterMutation();
    this.errorMessage.set('');
    this.removingPlannerId.set(plannerId);
    this.pendingRemovalStop.set(null);

    this.plannerService
      .remove(plannerId)
      .pipe(
        catchError(() => {
          this.plannerItems.set(previousItems);
          this.ensureSelectedMonth();
          this.normalizeSelectedCategory();
          this.ensureSelectedDay();
          this.pendingRemovalStop.set(null);
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

  protected clearSelectedDay(): void {
    if (this.isBulkRemoving() || this.removingPlannerId()) {
      return;
    }

    const selectedDay = this.selectedDay();
    const dayStops = this.selectedDayStops();
    if (!selectedDay || !dayStops.length) {
      return;
    }

    const shouldClear =
      typeof window === 'undefined' ||
      window.confirm(`Clear all planner events for ${selectedDay.label} ${selectedDay.date} ${selectedDay.month}?`);

    if (!shouldClear) {
      return;
    }

    const previousItems = this.plannerItems();
    const nextItems = previousItems.filter((item) => item.dayKey !== selectedDay.id);

    this.plannerItems.set(nextItems);
    this.ensureSelectedMonth();
    this.normalizeSelectedCategory();
    this.ensureSelectedDayAfterMutation();
    this.errorMessage.set('');
    this.isBulkRemoving.set(true);

    forkJoin(dayStops.map((item) => this.plannerService.remove(item.plannerId)))
      .pipe(
        catchError(() => {
          this.plannerItems.set(previousItems);
          this.ensureSelectedMonth();
          this.normalizeSelectedCategory();
          this.ensureSelectedDay();
          this.errorMessage.set(this.translate('planner.removeError'));
          return of(null);
        }),
        finalize(() => this.isBulkRemoving.set(false)),
      )
      .subscribe((result) => {
        if (result !== null) {
          dayStops.forEach((item) => this.plannerLocalPreferences.remove(item.plannerId));
        }
      });
  }

  protected goToAddEvent(): void {
    void this.router.navigate(['/events']);
  }

  protected translate(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  private initializeViewportWatcher(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    this.mobileMediaQuery = window.matchMedia('(max-width: 760px)');
    this.isMobileViewport.set(this.mobileMediaQuery.matches);
    this.mobileMediaQuery.addEventListener('change', this.mobileMediaListener);
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
          const items = result.items ?? [];
          if (!items.length) {
            return of([] as PlannerStop[]);
          }

          return forkJoin(items.map((item) => this.enrichPlannerItem(item)));
        }),
        catchError(() => {
          this.errorMessage.set(this.translate('planner.loadError'));
          return of([] as PlannerStop[]);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((items) => {
        this.plannerItems.set(items);
        this.ensureSelectedMonth();
        this.normalizeSelectedCategory();
        this.ensureSelectedDay();
      });
  }

  private enrichPlannerItem(item: EventPlannerDto) {
    return this.eventService.getById(item.eventId).pipe(
      map((eventDetails) => this.mapPlannerItem(item, eventDetails)),
      catchError(() => of(this.mapPlannerItem(item))),
    );
  }

  private mapPlannerItem(item: EventPlannerDto, eventDetails?: EventDto): PlannerStop {
    const resolvedSchedule = this.plannerLocalPreferences.resolveSchedule(
      item.id,
      item.startDate,
      item.endDate,
    );
    const startDate = resolvedSchedule.startDate;
    const endDate = resolvedSchedule.endDate;
    const title = eventDetails?.name?.trim() || item.eventName?.trim() || 'Untitled event';
    const category = eventDetails?.eventTypeName?.trim() || item.eventTypeName?.trim() || 'Other';
    const location = this.buildLocation(item, eventDetails);
    const description = this.buildDescription(item, eventDetails);
    const imageUrl =
      this.resolveMediaUrl(eventDetails?.mainImageUrl) ||
      this.resolveMediaUrl(eventDetails?.images?.find((image) => image.isMain)?.url) ||
      this.resolveMediaUrl(eventDetails?.images?.[0]?.url) ||
      this.fallbackImage;
    const searchText = [title, description, location, category].join(' ').toLowerCase();

    return {
      plannerId: item.id,
      eventId: item.eventId,
      title,
      category,
      location,
      description,
      imageUrl,
      startDate,
      endDate,
      dayKey: this.toDayKey(startDate),
      addedAt: new Date(item.addedAt),
      searchText,
    };
  }

  private buildDescription(item: EventPlannerDto, eventDetails?: EventDto): string {
    const localPreference = this.plannerLocalPreferences.findByPlannerId(item.id);
    const preferredDescription =
      eventDetails?.description?.trim() ||
      localPreference?.notes?.trim() ||
      '';

    return preferredDescription || 'No description available.';
  }

  private buildLocation(item: EventPlannerDto, eventDetails?: EventDto): string {
    const parts = [
      eventDetails?.objectName || item.objectName,
      eventDetails?.localityName || item.localityName,
      eventDetails?.destinationName || item.destinationName,
    ]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    return parts.join(', ') || 'Unknown location';
  }

  private buildUpcomingSubtitle(date: Date): string {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
    const timeLabel = this.formatTime(date);

    if (diffDays === 0) {
      return `Coming up today at ${timeLabel}`;
    }

    if (diffDays === 1) {
      return `Coming up tomorrow at ${timeLabel}`;
    }

    const dayLabel = new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);

    return `Coming up ${dayLabel} at ${timeLabel}`;
  }

  private resolveCategoryIcon(label: string): VaultCategoryIcon {
    const normalized = label.trim().toLowerCase();

    if (normalized.includes('hotel')) {
      return 'hotel';
    }

    if (normalized.includes('rest')) {
      return 'restaurant';
    }

    if (normalized.includes('bar')) {
      return 'bar';
    }

    if (normalized.includes('city') || normalized.includes('grad')) {
      return 'city';
    }

    return 'activity';
  }

  private ensureSelectedDay(): void {
    const days = this.days();
    if (!days.length) {
      this.selectedDayKey.set(null);
      return;
    }

    const currentKey = this.selectedDayKey();
    if (currentKey && days.some((day) => day.id === currentKey)) {
      return;
    }

    const todayKey = this.toDayKey(new Date());
    const matchingToday = days.find((day) => day.id === todayKey);
    this.selectedDayKey.set(matchingToday?.id ?? days[0].id);
  }

  private ensureSelectedDayAfterMutation(): void {
    const days = this.days();
    if (!days.length) {
      this.selectedDayKey.set(null);
      return;
    }

    const currentKey = this.selectedDayKey();
    if (currentKey && days.some((day) => day.id === currentKey)) {
      return;
    }

    this.selectedDayKey.set(days[0].id);
  }

  private normalizeSelectedCategory(): void {
    if (this.selectedCategory() === 'all') {
      return;
    }

    const exists = this.monthFilteredItems().some(
      (item) => item.category.toLowerCase() === this.selectedCategory(),
    );

    if (!exists) {
      this.selectedCategory.set('all');
    }
  }

  private ensureSelectedMonth(): void {
    const months = this.monthFilters().filter((month) => month.id !== 'all');

    if (!months.length) {
      this.selectedMonthKey.set('');
      return;
    }

    const currentKey = this.selectedMonthKey();
    if (currentKey === 'all') {
      return;
    }

    if (currentKey && months.some((month) => month.id === currentKey)) {
      return;
    }

    const currentMonthKey = this.toMonthKey(new Date());
    const matchingCurrentMonth = months.find((month) => month.id === currentMonthKey);
    this.selectedMonthKey.set(matchingCurrentMonth?.id ?? months[0].id);
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

  private toMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${year}-${month}`;
  }

  private toTimeValue(date: Date): string {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }
}
