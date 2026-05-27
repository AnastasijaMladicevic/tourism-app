import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ActiveRegionService } from '../../services/active-region';
import { EventDto, EventService, EventTypeOptionDto } from '../../services/event';
import { EventPlannerDto, EventPlannerService } from '../../services/event-planner';
import { PlannerLocalPreferencesService } from '../../services/planner-local-preferences';
import { RouterHistoryService } from '../../services/router-history';
import { TranslationService } from '../../services/translation.service';

type PreviewCategoryKey =
  | 'all'
  | 'foodDrinks'
  | 'forKids'
  | 'concerts'
  | 'festival'
  | 'sport'
  | 'culture'
  | 'other';

type PlannerPriorityKey = 'must' | 'maybe' | 'later';

interface PreviewEventItem {
  id: number;
  title: string;
  location: string;
  imageUrl: string;
  categoryKey: PreviewCategoryKey;
  searchableCategory: string;
  startDate?: string;
  endDate?: string;
  eventTypeName: string;
  description: string;
  isAdded: boolean;
  plannerId?: number;
}

interface PlannerItem {
  id: number;
  eventId: number;
  title: string;
  location: string;
  priority: PlannerPriorityKey;
  sortDate: Date;
}

interface PlannerGroup {
  label: string;
  items: PlannerItem[];
}

interface UpcomingHighlightItem {
  id: number;
  eventId: number;
  title: string;
  subtitle: string;
  imageUrl: string;
}

interface MobilePreviewCard {
  id: number;
  eventId: number;
  title: string;
  location: string;
  dateLabel: string;
  compactDateLabel: string;
  day: string;
  month: string;
  imageUrl: string;
  categoryChip: string;
  isAdded: boolean;
  plannerId?: number;
  startDate?: string;
  endDate?: string;
  eventTypeName: string;
  description: string;
}

interface PreviewDateFilterOption {
  key: string;
  label: string;
}

interface PlannerFilterChip {
  label: string;
  value: string;
}

interface PlannerCardsPerPageOption {
  value: number;
  label: string;
}

interface PlannerRangeOption {
  value: number;
  label: string;
}

type PlannerToolbarDropdown = 'category' | 'range' | 'cards';

const FALLBACK_IMAGE_URL =
  'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80';

@Component({
  selector: 'app-event-planner-preview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-planner-preview.component.html',
  styleUrl: './event-planner-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventPlannerPreviewComponent implements OnInit, OnDestroy {
  private readonly eventService = inject(EventService);
  private readonly activeRegionService = inject(ActiveRegionService);
  private readonly eventPlannerService = inject(EventPlannerService);
  private readonly plannerLocalPreferences = inject(PlannerLocalPreferencesService);
  private readonly authService = inject(AuthService);
  private readonly routerHistory = inject(RouterHistoryService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);
  activeMobileTab: 'events' | 'planner' = 'events';
  protected isMobileMoreFiltersOpen = false;
  private mobileMediaQuery?: MediaQueryList;
  private readonly mobileMediaListener = (event: MediaQueryListEvent) => {
    this.isMobileViewport.set(event.matches);
  };

  protected readonly regionName = signal('Crna Gora');
  protected readonly activeChip = signal<PreviewCategoryKey>('all');
  protected readonly searchTerm = signal('');
  protected readonly selectedDateKey = signal('all');
  protected readonly selectedRangeDays = signal(30);
  protected readonly cardsPerPage = signal(5);
  protected readonly currentPage = signal(1);
  protected readonly openDropdown = signal<PlannerToolbarDropdown | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly allEvents = signal<PreviewEventItem[]>([]);
  protected readonly allPlannerItems = signal<PlannerItem[]>([]);
  protected readonly plannerLoading = signal(false);
  protected readonly plannerError = signal('');
  protected readonly removingPlannerId = signal<number | null>(null);
  protected readonly isMobileViewport = signal(false);

  protected readonly filteredPlannerEvents = computed(() => {
    const query = this.normalizeText(this.searchTerm());
    const activeChip = this.activeChip();

    return this.allEvents().filter((event) => {
      if (!event.isAdded) {
        return false;
      }

      const matchesChip = activeChip === 'all' || event.categoryKey === activeChip;
      if (!matchesChip) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = this.normalizeText(
        [
          event.title,
          event.location,
          event.searchableCategory,
          this.translateCategoryKey(event.categoryKey),
        ].join(' '),
      );

      return haystack.includes(query);
    });
  });

  protected readonly plannedEvents = computed(() => {
    const sortedEvents = [...this.filteredPlannerEvents()].sort((left, right) => {
      const leftDate = this.resolveEventSchedule(left).startDate?.getTime() ?? 0;
      const rightDate = this.resolveEventSchedule(right).startDate?.getTime() ?? 0;
      return leftDate - rightDate;
    });

    const selectedDateKey = this.selectedDateKey();
    const mobileFilteredEvents = sortedEvents.filter((event) => {
      if (!this.isMobileViewport() || selectedDateKey === 'all') {
        return true;
      }

      const eventDate = this.resolveEventSchedule(event).startDate;
      return eventDate ? this.toDayKey(eventDate) === selectedDateKey : false;
    });

    const eventsForRange = mobileFilteredEvents.length ? mobileFilteredEvents : sortedEvents;
    const datedEvents = eventsForRange.filter((event) => this.resolveEventSchedule(event).startDate);

    if (!datedEvents.length) {
      return eventsForRange;
    }

    const firstEventDate = this.resolveEventSchedule(datedEvents[0]).startDate;
    if (!firstEventDate) {
      return eventsForRange;
    }

    const rangeStart = this.getStartOfDay(firstEventDate);
    const rangeEnd = new Date(rangeStart);
    rangeEnd.setDate(rangeEnd.getDate() + this.selectedRangeDays() - 1);

    const rangeFilteredEvents = eventsForRange.filter((event) => {
      const eventDate = this.resolveEventSchedule(event).startDate;
      if (!eventDate) {
        return false;
      }

      const normalizedEventDate = this.getStartOfDay(eventDate);
      return normalizedEventDate >= rangeStart && normalizedEventDate <= rangeEnd;
    });

    return rangeFilteredEvents.length ? rangeFilteredEvents : eventsForRange;
  });

  protected readonly totalPages = computed(() => {
    const totalItems = this.plannedEvents().length;
    return Math.max(1, Math.ceil(totalItems / this.cardsPerPage()));
  });

  protected readonly previewCards = computed<MobilePreviewCard[]>(() => {
    const planned = this.plannedEvents();
    const totalPages = this.totalPages();
    const currentPage = Math.min(this.currentPage(), totalPages);
    const startIndex = (currentPage - 1) * this.cardsPerPage();
    const source = planned.slice(startIndex, startIndex + this.cardsPerPage());

    return source.map((event) => {
      const resolvedSchedule = this.resolveEventSchedule(event);

      return {
        id: event.id,
        eventId: event.id,
        title: event.title,
        location: event.location,
        dateLabel: this.buildDateLabel(resolvedSchedule.startDate, resolvedSchedule.endDate),
        compactDateLabel: this.buildCompactDateLabel(
          resolvedSchedule.startDate,
          resolvedSchedule.endDate,
        ),
        day: this.buildEventDayLabel(resolvedSchedule.startDate),
        month: this.buildEventMonthLabel(resolvedSchedule.startDate),
        imageUrl: event.imageUrl,
        categoryChip: this.translateCategoryKey(event.categoryKey),
        isAdded: event.isAdded,
        plannerId: event.plannerId,
        startDate: event.startDate,
        endDate: event.endDate,
        eventTypeName: event.eventTypeName,
        description: event.description,
      };
    });
  });

  protected readonly dateFilterOptions = computed<PreviewDateFilterOption[]>(() => {
    const options = new Map<string, PreviewDateFilterOption>();

    for (const item of this.visiblePlannerItems()) {
      const key = this.toDayKey(item.sortDate);
      if (!options.has(key)) {
        options.set(key, {
          key,
          label: new Intl.DateTimeFormat(this.translationService.currentLocale(), {
            day: '2-digit',
            month: 'short',
          })
            .format(item.sortDate)
            .replace('.', ''),
        });
      }
    }

    return [{ key: 'all', label: this.translate('planner.preview.dateFilterAll') }, ...options.values()];
  });

  protected readonly filterChips = computed<PlannerFilterChip[]>(() => {
    const typeMap = new Map<PreviewCategoryKey, PlannerFilterChip>();

    for (const plannerItem of this.visiblePlannerItems()) {
      const relatedEvent = this.allEvents().find((event) => event.id === plannerItem.eventId);
      const categoryKey = relatedEvent?.categoryKey;

      if (!categoryKey || categoryKey === 'all') {
        continue;
      }

      if (!typeMap.has(categoryKey)) {
        typeMap.set(categoryKey, {
          label: this.translateCategoryKey(categoryKey),
          value: categoryKey,
        });
      }
    }

    return [
      { label: this.translate('common.all'), value: 'all' },
      ...[...typeMap.values()].sort((left, right) => left.label.localeCompare(right.label)),
    ];
  });

  protected readonly mobilePrimaryFilterChips = computed(() => this.filterChips().slice(0, 4));
  protected readonly mobileSecondaryFilterChips = computed(() =>
    this.filterChips().slice(4),
  );
  protected readonly selectedCategoryLabel = computed(() => {
    if (this.activeChip() === 'all') {
      return this.translate('planner.preview.allCategories');
    }

    return this.filterChips().find((chip) => chip.value === this.activeChip())?.label
      ?? this.translate('planner.preview.allCategories');
  });
  protected readonly selectedRangeLabel = computed(() => {
    const match = this.rangeOptions().find((option) => option.value === this.selectedRangeDays());
    return match?.label ?? this.translate('planner.preview.range7');
  });
  protected readonly selectedCardsPerPageLabel = computed(() =>
    this.cardsPerPageLabel(this.cardsPerPage()),
  );

  protected readonly visiblePlannerItems = computed(() => {
    const eventIds = new Set(this.allEvents().map((event) => event.id));
    return this.allPlannerItems()
      .filter((item) => eventIds.has(item.eventId))
      .sort((left, right) => left.sortDate.getTime() - right.sortDate.getTime());
  });

  protected readonly plannerGroups = computed<PlannerGroup[]>(() => {
    const groups = new Map<string, PlannerItem[]>();

    for (const item of this.visiblePlannerItems()) {
      const groupLabel = this.formatPlannerGroupLabel(item.sortDate);
      const existing = groups.get(groupLabel) ?? [];
      existing.push(item);
      groups.set(groupLabel, existing);
    }

    return [...groups.entries()].map(([label, items]) => ({ label, items }));
  });

  protected readonly plannerCount = computed(() => this.visiblePlannerItems().length);
  protected readonly upcomingHighlights = computed<UpcomingHighlightItem[]>(() =>
    this.visiblePlannerItems()
      .slice(0, 2)
      .map((item) => {
        const relatedEvent = this.allEvents().find((event) => event.id === item.eventId);

        return {
          id: item.id,
          eventId: item.eventId,
          title: item.title,
          subtitle: this.buildUpcomingSubtitle(item.sortDate),
          imageUrl: relatedEvent?.imageUrl || FALLBACK_IMAGE_URL,
        };
      }),
  );
  protected readonly mobileHighlights = computed<UpcomingHighlightItem[]>(() =>
    this.previewCards()
      .slice(0, 2)
      .map((item, index) => ({
        id: index + 1,
        eventId: item.eventId,
        title: item.title,
        subtitle: this.buildMobileHighlightSubtitle(item.dateLabel),
        imageUrl: item.imageUrl,
      })),
  );
  protected readonly rangeOptions = computed<PlannerRangeOption[]>(() => [
    { value: 7, label: this.translate('planner.preview.range7') },
    { value: 14, label: this.translate('planner.preview.range14') },
    { value: 30, label: this.translate('planner.preview.range30') },
  ]);
  protected readonly cardsPerPageOptions = computed<PlannerCardsPerPageOption[]>(() => [
    { value: 3, label: this.cardsPerPageLabel(3) },
    { value: 5, label: this.cardsPerPageLabel(5) },
  ]);

  ngOnInit(): void {
    this.initializeViewportWatcher();
    this.loadEvents();
    this.loadPlanner();
  }

  ngOnDestroy(): void {
    this.mobileMediaQuery?.removeEventListener('change', this.mobileMediaListener);
  }

  @HostListener('document:click')
  protected handleDocumentClick(): void {
    this.closeDropdown();
  }

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    this.closeDropdown();
  }

  protected translate(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  protected setActiveChip(chip: PreviewCategoryKey): void {
    this.activeChip.set(chip);
    this.isMobileMoreFiltersOpen = false;
    this.resetPagination();
  }

  protected setMobileTab(tab: 'events' | 'planner'): void {
    this.activeMobileTab = tab;
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.resetPagination();
  }

  protected updateSelectedDateKey(value: string): void {
    this.selectedDateKey.set(value || 'all');
    this.resetPagination();
  }

  protected updateCategoryFilter(value: string): void {
    this.setActiveChip(this.isPreviewCategoryKey(value) ? value : 'all');
    this.closeDropdown();
  }

  protected updateRangeDays(value: string): void {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    this.selectedRangeDays.set(parsedValue);
    this.resetPagination();
    this.closeDropdown();
  }

  protected updateCardsPerPage(value: string): void {
    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) {
      return;
    }

    this.cardsPerPage.set(parsedValue);
    this.currentPage.set(1);
    this.closeDropdown();
  }

  protected toggleDropdown(dropdown: PlannerToolbarDropdown): void {
    this.openDropdown.update((current) => (current === dropdown ? null : dropdown));
  }

  protected closeDropdown(): void {
    this.openDropdown.set(null);
  }

  protected isDropdownOpen(dropdown: PlannerToolbarDropdown): boolean {
    return this.openDropdown() === dropdown;
  }

  protected previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  protected toggleMobileMoreFilters(): void {
    this.isMobileMoreFiltersOpen = !this.isMobileMoreFiltersOpen;
  }

  protected isMobileMoreActive(): boolean {
    return this.mobileSecondaryFilterChips().some((chip) => chip.value === this.activeChip()) || this.isMobileMoreFiltersOpen;
  }

  protected goBack(): void {
    this.routerHistory.goBack('/home');
  }

  protected openEvents(): void {
    void this.router.navigate(['/events'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  protected openEventDetails(eventId: number): void {
    void this.router.navigate(['/event', eventId]);
  }

  protected editPlannerEvent(event: PreviewEventItem | MobilePreviewCard): void {
    if (!event.isAdded || !event.plannerId) {
      return;
    }

    const resolvedSchedule = event.startDate
      ? this.plannerLocalPreferences.resolveSchedule(event.plannerId, event.startDate, event.endDate)
      : null;

    void this.router.navigate(['/planner/add'], {
      state: {
        plannerId: event.plannerId,
        eventId: event.id,
        title: event.title,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        type: event.eventTypeName || this.translate('planner.preview.eventTypeFallback'),
        imageUrl: event.imageUrl,
        description: event.description,
        plannedDate: resolvedSchedule ? this.toDayKey(resolvedSchedule.startDate) : undefined,
        startTime: resolvedSchedule ? this.toTimeValue(resolvedSchedule.startDate) : undefined,
        returnUrl: this.router.url,
      },
    });
  }

  protected addToPlanner(eventId: number): void {
    if (this.removingPlannerId()) {
      return;
    }

    const targetEvent = this.allEvents().find((event) => event.id === eventId);
    if (!targetEvent || targetEvent.isAdded) {
      return;
    }

    if (!this.authService.isLoggedIn()) {
      void this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    void this.router.navigate(['/planner/add'], {
      state: {
        eventId: targetEvent.id,
        title: targetEvent.title,
        location: targetEvent.location,
        startDate: targetEvent.startDate,
        endDate: targetEvent.endDate,
        type: targetEvent.eventTypeName || this.translate('planner.preview.eventTypeFallback'),
        imageUrl: targetEvent.imageUrl,
        description: targetEvent.description,
        returnUrl: this.router.url,
      },
    });
  }

  protected removeFromPlanner(plannerId: number): void {
    if (this.removingPlannerId()) {
      return;
    }

    this.removingPlannerId.set(plannerId);

    this.eventPlannerService
      .remove(plannerId)
      .pipe(
        catchError(() => {
          this.plannerError.set(this.translate('planner.removeError'));
          return of(false);
        }),
        finalize(() => this.removingPlannerId.set(null)),
      )
      .subscribe((success) => {
        if (success === false) {
          return;
        }

        this.plannerLocalPreferences.remove(plannerId);
        this.allPlannerItems.update((items) => items.filter((item) => item.id !== plannerId));
        this.syncEventAddedState();
        this.plannerError.set('');
      });
  }

  protected getTagClass(tag: string): string {
    const normalized = tag.toLowerCase();

    if (normalized.includes('festival') || normalized.includes('muzika') || normalized.includes('koncert')) {
      return 'preview-tag preview-tag--violet';
    }

    if (
      normalized.includes('kultura') ||
      normalized.includes('pozorište') ||
      normalized.includes('izlož') ||
      normalized.includes('predstava') ||
      normalized.includes('radionica')
    ) {
      return 'preview-tag preview-tag--peach';
    }

    if (
      normalized.includes('sport') ||
      normalized.includes('bicikl') ||
      normalized.includes('turnir') ||
      normalized.includes('utakmica') ||
      normalized.includes('takmi')
    ) {
      return 'preview-tag preview-tag--mint';
    }

    if (normalized.includes('hrana') || normalized.includes('degust') || normalized.includes('vino')) {
      return 'preview-tag preview-tag--sand';
    }

    return 'preview-tag preview-tag--blue';
  }

  protected getPriorityClass(priority: PlannerItem['priority']): string {
    switch (priority) {
      case 'must':
        return 'planner-priority planner-priority--must';
      case 'maybe':
        return 'planner-priority planner-priority--maybe';
      default:
        return 'planner-priority planner-priority--later';
    }
  }

  protected priorityLabel(priority: PlannerPriorityKey): string {
    return this.translate(`planner.preview.priority.${priority}`);
  }

  protected shouldShowPriorityBadge(priority: PlannerPriorityKey): boolean {
    return priority === 'must';
  }

  private initializeViewportWatcher(): void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    this.mobileMediaQuery = window.matchMedia('(max-width: 768px)');
    this.isMobileViewport.set(this.mobileMediaQuery.matches);
    this.mobileMediaQuery.addEventListener('change', this.mobileMediaListener);
  }

  private loadEvents(): void {
    this.isLoading.set(true);
    this.hasError.set(false);

    const regionId = this.activeRegionService.getActiveRegionId() ?? 1;

    forkJoin({
      eventTypes: this.eventService.getTypes().pipe(catchError(() => of([] as EventTypeOptionDto[]))),
      events: this.eventService.getAllItems({ regionId, sortBy: 'startDate', sortOrder: 'asc' }),
    }).subscribe({
      next: ({ eventTypes, events }) => {
        const typeChipMap = this.buildEventTypeChipMap(eventTypes);
        const mappedEvents = events
          .filter((event) => event.id > 0 && event.isActive !== false)
          .map((event) => this.mapEvent(event, typeChipMap));

        const firstRegionName = events.find((event) => !!event.regionName)?.regionName?.trim();
        if (firstRegionName) {
          this.regionName.set(firstRegionName);
        }

        this.allEvents.set(mappedEvents);
        this.syncEventAddedState();
        this.hasError.set(false);
        this.isLoading.set(false);
      },
      error: () => {
        this.allEvents.set([]);
        this.hasError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  private loadPlanner(): void {
    if (!this.authService.isLoggedIn()) {
      this.allPlannerItems.set([]);
      this.syncEventAddedState();
      this.plannerError.set('');
      this.plannerLoading.set(false);
      return;
    }

    this.plannerLoading.set(true);
    this.plannerError.set('');

    this.eventPlannerService
      .getMyPlanner({
        page: 1,
        pageSize: 100,
        sortBy: 'startDate',
        sortOrder: 'asc',
      })
      .pipe(
        map((result) => (result.items ?? []).map((item) => this.mapPlannerItem(item))),
        catchError(() => {
          this.plannerError.set(this.translate('planner.loadError'));
          return of([] as PlannerItem[]);
        }),
        finalize(() => this.plannerLoading.set(false)),
      )
      .subscribe((items) => {
        this.allPlannerItems.set(items);
        this.syncEventAddedState();
      });
  }

  private syncEventAddedState(): void {
    const plannerMap = new Map(this.allPlannerItems().map((item) => [item.eventId, item.id]));

    this.allEvents.update((events) =>
      events.map((event) => ({
        ...event,
        isAdded: plannerMap.has(event.id),
        plannerId: plannerMap.get(event.id),
      })),
    );

    this.ensureActiveChipIsValid();
    this.ensureCurrentPageIsValid();
  }

  private mapEvent(event: EventDto, typeChipMap: Map<string, PreviewCategoryKey>): PreviewEventItem {
    const categoryKey = this.resolveCategoryKey(event, typeChipMap);
    const eventTypeName = event.eventTypeName?.trim() || this.translateCategoryKey(categoryKey);

    return {
      id: event.id,
      title: event.name?.trim() || this.translate('planner.preview.eventTitleFallback'),
      location: this.buildEventLocation(event),
      imageUrl: this.buildImageUrl(event),
      categoryKey,
      searchableCategory: eventTypeName,
      startDate: event.startDate,
      endDate: event.endDate,
      eventTypeName,
      description: event.description?.trim() || '',
      isAdded: false,
    };
  }

  private mapPlannerItem(item: EventPlannerDto): PlannerItem {
    const resolvedSchedule = this.plannerLocalPreferences.resolveSchedule(
      item.id,
      item.startDate,
      item.endDate,
    );
    const startDate = resolvedSchedule.startDate;
    const notes = resolvedSchedule.notes.trim();

    return {
      id: item.id,
      eventId: item.eventId,
      title: item.eventName?.trim() || this.translate('planner.preview.eventTitleFallback'),
      location: this.buildPlannerLocation(item),
      priority: resolvedSchedule.isPriority ? 'must' : notes ? 'later' : 'maybe',
      sortDate: startDate,
    };
  }

  private buildEventTypeChipMap(eventTypes: EventTypeOptionDto[]): Map<string, PreviewCategoryKey> {
    const map = new Map<string, PreviewCategoryKey>();

    for (const eventType of eventTypes) {
      const normalizedName = this.normalizeText(eventType.name);
      map.set(normalizedName, this.resolveTypeNameToCategoryKey(normalizedName));
    }

    return map;
  }

  private resolveTypeNameToCategoryKey(normalizedName: string): PreviewCategoryKey {
    if (this.matchesAny(normalizedName, ['koncert', 'dj', 'nastup'])) {
      return 'concerts';
    }

    if (this.matchesAny(normalizedName, ['festival', 'karneval', 'proslava', 'sajam', 'okupljanje'])) {
      return 'festival';
    }

    if (this.matchesAny(normalizedName, ['sport', 'takmic', 'turnir', 'utakmic'])) {
      return 'sport';
    }

    if (
      this.matchesAny(normalizedName, [
        'izlozb',
        'predstav',
        'konferenc',
        'radionic',
        'seminar',
        'stand-up',
        'stand up',
        'tura',
      ])
    ) {
      return 'culture';
    }

    return 'festival';
  }

  private buildEventLocation(event: EventDto): string {
    const locationParts = [
      event.localityName?.trim(),
      event.objectName?.trim(),
      event.destinationName?.trim(),
    ].filter((part): part is string => !!part);

    return locationParts.length > 0
      ? locationParts.join(', ')
      : this.translate('planner.preview.locationFallback');
  }

  private buildPlannerLocation(item: EventPlannerDto): string {
    const locationParts = [
      item.objectName?.trim(),
      item.localityName?.trim(),
      item.destinationName?.trim(),
    ].filter((part): part is string => !!part);

    return locationParts.length > 0
      ? locationParts.join(', ')
      : this.translate('planner.preview.locationFallback');
  }

  private buildDateLabel(startDate: Date | null, endDate: Date | null): string {
    if (!startDate) {
      return this.translate('common.dateNotAvailable');
    }

    const formattedStart = this.formatDate(startDate);
    const formattedEnd = endDate ? this.formatDate(endDate) : null;
    const timePart = this.formatTime(startDate);

    if (formattedEnd && formattedEnd !== formattedStart) {
      return `${formattedStart} - ${formattedEnd}`;
    }

    if (timePart) {
      return this.translate('planner.preview.dateAtTime', {
        date: formattedStart,
        time: timePart,
      });
    }

    return formattedStart;
  }

  private buildCompactDateLabel(startDate: Date | null, endDate: Date | null): string {
    if (!startDate) {
      return this.translate('common.dateNotAvailable');
    }

    const formattedStart = this.formatDate(startDate);
    const startTime = this.formatTime(startDate);
    const endTime = endDate ? this.formatTime(endDate) : '';

    if (startTime && endTime) {
      return `${formattedStart} • ${startTime}-${endTime}`;
    }

    if (startTime) {
      return `${formattedStart} • ${startTime}`;
    }

    return formattedStart;
  }

  private buildImageUrl(event: EventDto): string {
    const mainImage = event.images?.find((image) => image.isMain)?.url;
    return event.mainImageUrl || mainImage || event.images?.[0]?.url || FALLBACK_IMAGE_URL;
  }

  private resolveCategoryKey(
    event: EventDto,
    typeChipMap: Map<string, PreviewCategoryKey>,
  ): PreviewCategoryKey {
    const normalizedTypeName = this.normalizeText(event.eventTypeName ?? '');
    const mappedTypeChip = typeChipMap.get(normalizedTypeName);
    if (mappedTypeChip) {
      return mappedTypeChip;
    }

    const eventText = this.normalizeText(
      [event.eventTypeName, event.name, event.description].filter(Boolean).join(' '),
    );

    if (this.matchesAny(eventText, ['hrana', 'vino', 'degust', 'gastro', 'food', 'piće', 'pice', 'wine'])) {
      return 'foodDrinks';
    }

    if (this.matchesAny(eventText, ['deca', 'deč', 'decu', 'kids', 'family', 'porodi'])) {
      return 'forKids';
    }

    if (this.matchesAny(eventText, ['koncert', 'muzik', 'music', 'gig', 'dj', 'nastup'])) {
      return 'concerts';
    }

    if (this.matchesAny(eventText, ['festival', 'fest', 'karneval', 'proslava', 'sajam', 'okupljanje'])) {
      return 'festival';
    }

    if (this.matchesAny(eventText, ['sport', 'bicikl', 'maraton', 'trka', 'planinar', 'turnir', 'utakmic', 'takmic'])) {
      return 'sport';
    }

    if (this.matchesAny(eventText, ['kultura', 'pozori', 'izloz', 'izlož', 'muzej', 'galerij', 'teatar', 'art', 'seminar', 'radionica'])) {
      return 'culture';
    }

    return 'other';
  }

  private ensureActiveChipIsValid(): void {
    const activeChip = this.activeChip();
    if (activeChip === 'all') {
      return;
    }

    const availableChips = new Set(this.filterChips().map((chip) => chip.value));
    if (!availableChips.has(activeChip)) {
      this.activeChip.set('all');
      this.isMobileMoreFiltersOpen = false;
      this.resetPagination();
    }
  }

  private ensureCurrentPageIsValid(): void {
    const totalPages = this.totalPages();
    if (this.currentPage() > totalPages) {
      this.currentPage.set(totalPages);
    }
  }

  private resetPagination(): void {
    this.currentPage.set(1);
  }

  private formatPlannerGroupLabel(date: Date): string {
    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      weekday: 'long',
    }).format(date).toUpperCase();
  }

  protected formatPlannerTime(date: Date): string {
    return date.toLocaleTimeString(this.translationService.currentLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private buildUpcomingSubtitle(date: Date): string {
    const dayPart = date.toLocaleDateString(this.translationService.currentLocale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    const timePart = this.formatPlannerTime(date);
    return this.translate('planner.preview.upcomingSubtitle', {
      day: dayPart.toLowerCase(),
      time: timePart,
    });
  }

  private buildMobileHighlightSubtitle(label: string): string {
    return label.replace(/\s*-\s*/g, ' • ');
  }

  private buildEventDayLabel(date: Date | null): string {
    return date
      ? date.toLocaleDateString(this.translationService.currentLocale(), { day: '2-digit' })
      : '--';
  }

  private buildEventMonthLabel(date: Date | null): string {
    return date
      ? date
          .toLocaleDateString(this.translationService.currentLocale(), { month: 'short' })
          .replace('.', '')
          .toUpperCase()
      : '--';
  }

  private resolveEventSchedule(event: PreviewEventItem): { startDate: Date | null; endDate: Date | null } {
    if (event.plannerId && event.startDate) {
      const resolved = this.plannerLocalPreferences.resolveSchedule(
        event.plannerId,
        event.startDate,
        event.endDate,
      );

      return {
        startDate: resolved.startDate,
        endDate: resolved.endDate,
      };
    }

    return {
      startDate: this.parseDate(event.startDate),
      endDate: this.parseDate(event.endDate),
    };
  }

  private cardsPerPageLabel(count: number): string {
    const key = this.usesSerbianCardPlural(count)
      ? 'planner.preview.cardsPerPageFew'
      : 'planner.preview.cardsPerPageMany';

    return this.translate(key, { count });
  }

  private translateCategoryKey(categoryKey: PreviewCategoryKey): string {
    if (categoryKey === 'all') {
      return this.translate('common.all');
    }

    return this.translate(`planner.preview.category.${categoryKey}`);
  }

  private isPreviewCategoryKey(value: string): value is PreviewCategoryKey {
    return [
      'all',
      'foodDrinks',
      'forKids',
      'concerts',
      'festival',
      'sport',
      'culture',
      'other',
    ].includes(value);
  }

  private toDayKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toTimeValue(date: Date): string {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private getStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private matchesAny(value: string, needles: string[]): boolean {
    return needles.some((needle) => value.includes(this.normalizeText(needle)));
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private formatTime(date: Date): string {
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    if (!hasTime) {
      return '';
    }

    return date.toLocaleTimeString(this.translationService.currentLocale(), {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private usesSerbianCardPlural(count: number): boolean {
    if (this.translationService.language() !== 'sr') {
      return false;
    }

    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    return lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14);
  }
}
