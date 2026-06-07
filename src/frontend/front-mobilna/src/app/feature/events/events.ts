import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, effect, ElementRef, HostListener, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, forkJoin, of, Subscription } from 'rxjs';
import { environment } from '../../../environment/environment';
import { EventDto, EventService } from '../../services/event';
import { ActivatedRoute, Router } from '@angular/router';
import { LazyBackgroundDirective } from '../../shared/directives/lazy-background.directive';
import { LocationTrackingService } from '../../services/location-tracking';
import { AuthService } from '../../services/auth';
import { PlannerLocalPreferencesService } from '../../services/planner-local-preferences';
import { EventPlannerService } from '../../services/event-planner';
import { PendingActionService } from '../../services/pending-action';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { RouterHistoryService } from '../../services/router-history';
import { TranslationService } from '../../services/translation.service';
import { ActiveRegionService } from '../../services/active-region';
import { DataCacheService } from '../../services/data-cache';
import { LocationRequiredModalComponent } from '../../shared/components/location-required-modal/location-required-modal.component';

type EventCategory = 'All' | string;

interface EventCard {
  id: number;
  title: string;
  category: string;
  dateText: string;
  timeText: string;
  location: string;
  priceText: string;
  imageUrl?: string;
  attendeesText: string;
  latitude?: number;
  longitude?: number;
  distanceMeters?: number;
  eventTypeName?: string;
  eventTypeId?: number;
  description?: string;
  startDate?: string;
  endDate?: string | null;
  isPlanned?: boolean;
  plannerId?: number;
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, LazyBackgroundDirective, TranslatePipe, LocationRequiredModalComponent],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class EventsComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly locationTrackingService = inject(LocationTrackingService);
  private readonly authService = inject(AuthService);
  private readonly plannerService = inject(PlannerLocalPreferencesService);
  private readonly eventPlannerService = inject(EventPlannerService);
  private readonly pendingActionService = inject(PendingActionService);
  private readonly routerHistory = inject(RouterHistoryService);
  private readonly translationService = inject(TranslationService);
  private readonly activeRegionService = inject(ActiveRegionService);
  private readonly dataCacheService = inject(DataCacheService);
  private readonly listStateKey = 'events-list-state';
  private readonly returnFlagKey = 'events-return-from-detail';
  private readonly pendingSortKey = 'events-pending-sort';
  activeFilters = new Set<string>();
  activeCategory: EventCategory = 'All';
  isLoading = true;
  showSearch = false;
  showSortMenu = false;
  showPageSizeMenu = false;
  showLocationModal = false;
  searchQuery = '';
  sortOption: 'date' | 'az' | 'za' | 'distance' | 'price' = 'az';
  events: EventCard[] = [];
  visibleEvents: EventCard[] = [];
  currentPage = 1;
  pageSize = 8;
  hasNextPage = false;
  totalCount = 0;
  pageSizeOptions = [8, 12, 16, 24, 32];
  userLocation: { lat: number; lng: number } | null = null;
  isTracking = false;
  eventTypes: { id: number; name: string }[] = [];
  isPlannerBusy = false;
  private plannerMap = new Map<number, number>();
  private readonly locationSubs = new Subscription();
  private readonly handleAddToPlanner = (event: any) => {
    const obj = event.detail;
    if (obj) this.togglePlanner(obj, new Event('click'));
  };
  private hasInitializedLanguageWatcher = false;
  private lastLanguage = 'sr';

  constructor() {
    effect(() => {
      const language = this.translationService.language();
      if (!this.hasInitializedLanguageWatcher) {
        this.lastLanguage = language;
        this.hasInitializedLanguageWatcher = true;
        return;
      }
      if (language === this.lastLanguage) return;
      this.lastLanguage = language;
      this.currentPage = 1;
      this.loadEvents();
    });
  }

  @ViewChild('top') top!: ElementRef;
  ngOnInit(): void {
    this.locationSubs.add(
      this.locationTrackingService.trackingEnabled$.subscribe(enabled => {
        this.isTracking = enabled;
        if (!enabled) this.clearDistances();
        else this.updateDistances();
        this.flushUi();
      })
    );

    this.locationSubs.add(
      this.locationTrackingService.location$.subscribe(loc => {
        this.userLocation = loc ? { lat: loc.latitude, lng: loc.longitude } : null;
        if (this.userLocation) this.updateDistances();
        else this.clearDistances();
        this.refreshVisibleEvents();
        this.cdr.detectChanges();
      })
    );

    this.restoreSortOption();
    if (sessionStorage.getItem(this.returnFlagKey)) {
      sessionStorage.removeItem(this.returnFlagKey);
      this.restoreListState();
    }
    this.applyPendingSortIfReady();
    this.loadEvents();
    this.loadPlanner();

    window.addEventListener('add-to-planner', this.handleAddToPlanner);
  }

  ngOnDestroy(): void {
    this.locationSubs.unsubscribe();
    window.removeEventListener('add-to-planner', this.handleAddToPlanner);
  }

  private saveListState(): void {
    sessionStorage.setItem(this.listStateKey, JSON.stringify({
      searchQuery: this.searchQuery,
      activeFilters: [...this.activeFilters],
      activeCategory: this.activeCategory,
      sortOption: this.sortOption,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
    }));
  }

  private restoreListState(): void {
    const raw = sessionStorage.getItem(this.listStateKey);
    if (!raw) return;

    try {
      const state = JSON.parse(raw);

      this.searchQuery = state.searchQuery ?? '';
      this.activeFilters = new Set(Array.isArray(state.activeFilters) ? state.activeFilters : []);
      this.activeCategory = state.activeCategory ?? 'All';
      this.sortOption = state.sortOption ?? 'az';
      this.currentPage = state.currentPage ?? 1;
      this.pageSize = state.pageSize ?? 8;
    } catch {
      sessionStorage.removeItem(this.listStateKey);
    }
  }

  private applyPendingSortIfReady(): void {
    const pending = sessionStorage.getItem(this.pendingSortKey);
    if (!pending) return;
    sessionStorage.removeItem(this.pendingSortKey);
    if (pending === 'distance' && this.isTracking) {
      this.sortOption = 'distance';
      this.saveListState();
    }
  }

  private restoreSortOption(): void {
    const raw = sessionStorage.getItem(this.listStateKey);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as { sortOption?: string };
      const valid: Array<typeof this.sortOption> = ['date', 'az', 'za', 'price'];
      if (state.sortOption && valid.includes(state.sortOption as typeof this.sortOption)) {
        this.sortOption = state.sortOption as typeof this.sortOption;
      }
    } catch { /* ignore */ }
  }

  togglePlanner(eventItem: EventCard, e?: Event): void {
    e?.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({ type: 'add-to-planner', payload: eventItem });
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    if (this.isPlannerBusy) return;

    this.isPlannerBusy = true;
    const existingId = this.plannerMap.get(eventItem.id);

    if (existingId) {
      this.eventPlannerService.remove(existingId).subscribe({
        next: () => {
          this.plannerService.remove(existingId);
          this.plannerMap.delete(eventItem.id);
          eventItem.isPlanned = false;
          eventItem.plannerId = undefined;
          this.applyPlannerState(this.events);
          this.applyPlannerState(this.visibleEvents);
          this.isPlannerBusy = false;
          this.flushUi();
        },
        error: () => { this.isPlannerBusy = false; this.flushUi(); }
      });
      return;
    }

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    this.router.navigate(['/planner/add'], {
      state: {
        eventId: eventItem.id,
        title: eventItem.title,
        location: eventItem.location,
        startDate: eventItem.startDate,
        endDate: eventItem.endDate,
        type: eventItem.eventTypeName || 'Dogadjaj',
        imageUrl: eventItem.imageUrl,
        description: eventItem.description,
        returnUrl: returnUrl && returnUrl.startsWith('/') ? returnUrl : undefined,
      }
    });

    this.isPlannerBusy = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;

    if (!target.closest('.sort-anchor')) {
      this.showSortMenu = false;
      this.showPageSizeMenu = false;
    }
  }

  get categories(): { key: EventCategory; label: string; icon: string }[] {
    const unique = Array.from(new Set(this.events.map((event) => event.category)));
    return [
      { key: 'All', label: 'All', icon: '' },
      ...unique.map((name) => ({ key: name, label: name, icon: this.categoryIcon(name) })),
    ];
  }

  get filteredEvents(): EventCard[] {
    let list = [...this.events];

    const q = this.searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (event) =>
          event.title.toLowerCase().includes(q) || event.location.toLowerCase().includes(q),
      );
    }

    if (this.activeFilters.size > 0) {
      list = list.filter((event) => this.activeFilters.has(event.category));
    }

    switch (this.sortOption) {
      case 'date':
        list.sort((a, b) => new Date(a.dateText).getTime() - new Date(b.dateText).getTime());
        break;
      case 'az':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'za':
        list.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case 'price':
        list.sort((a, b) => this.priceToNumber(a.priceText) - this.priceToNumber(b.priceText));
        break;
      case 'distance':
        list.sort((a, b) =>
          (a.distanceMeters ?? 999999) - (b.distanceMeters ?? 999999)
        );
        break;
    }

    return list;
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.saveListState();
    void this.refreshVisibleEvents();
    this.cdr.detectChanges();
  }

  togglePageSizeMenu(event: Event): void {
    event.stopPropagation();

    if (this.showSortMenu) {
      this.showSortMenu = false;
    }

    this.showPageSizeMenu = !this.showPageSizeMenu;
  }
  setCategory(category: EventCategory): void {
    this.activeCategory = category;
    this.currentPage = 1;
    this.saveListState();
    this.refreshVisibleEvents();
  }

  setSort(option: 'date' | 'az' | 'za' | 'price' | 'distance'): void {
    if (option === 'distance' && !this.isTracking) {
      this.showSortMenu = false;
      sessionStorage.setItem(this.pendingSortKey, 'distance');
      this.showLocationModal = true;
      return;
    }
    this.sortOption = option;
    this.showSortMenu = false;
    this.currentPage = 1;
    this.saveListState();
    this.refreshVisibleEvents();
  }

  openLocationSettings(): void {
    this.showLocationModal = false;
    void this.router.navigate(['/location-settings'], {
      queryParams: { locationConsent: '1', returnUrl: this.router.url }
    });
  }

  dismissLocationModal(): void {
    this.showLocationModal = false;
  }

  sortLabel(): string {
    switch (this.sortOption) {
      case 'date':
        return this.translationService.translate('common.soonest');
  
      case 'distance':
        return this.translationService.translate('common.nearest');
  
      case 'az':
        return 'A -> Z';
  
      case 'price':
        return this.translationService.translate('common.lowestPrice');
  
      default:
        return 'Z -> A';
    }
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchQuery = '';
      this.currentPage = 1;
      this.saveListState();
      this.refreshVisibleEvents();
    }
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.saveListState();
    this.refreshVisibleEvents();
  }

  prevPage(): void {
    if (this.currentPage === 1) return;

    this.currentPage--;
    this.saveListState();
    this.refreshVisibleEvents();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    this.saveListState();
    this.refreshVisibleEvents();
    this.top.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  goBack(): void {
    this.routerHistory.goBack('/home');
  }

  openEvent(id: number): void {
    this.saveListState();
    sessionStorage.setItem(this.returnFlagKey, 'true');

    this.router.navigate(['/event', id], {
      queryParams: {
        returnUrl: this.router.url
      }
    });
  }

  private applyPlannerState(list: EventCard[]): void {
    for (const item of list) {
      item.isPlanned = this.plannerMap.has(item.id);
      item.plannerId = this.plannerMap.get(item.id);
    }
  }

  private loadPlanner(): void {
    if (!this.authService.isLoggedIn()) {
      this.plannerMap.clear();
      this.applyPlannerState(this.events);
      this.applyPlannerState(this.visibleEvents);
      this.flushUi();
      return;
    }

    this.eventPlannerService.getMyPlanner({ page: 1, pageSize: 200 }).subscribe(res => {
      this.plannerMap.clear();
      res.items.forEach(item => this.plannerMap.set(Number(item.eventId), item.id));
      this.applyPlannerState(this.events);
      this.applyPlannerState(this.visibleEvents);
      this.flushUi();
    });
  }

  private loadEvents(): void {
    this.isLoading = true;

    const regionId = this.activeRegionService.getActiveRegionId() ?? 0;
    const lang = this.translationService.language();
    const cacheKey = `events-list:r${regionId}:l${lang}`;
    const cached = this.dataCacheService.get<EventDto[]>(cacheKey);
    if (cached) {
      this.isLoading = false;
      this.applyEventsData(cached);
      return;
    }

    const pageSize = 100;
    this.eventService.getPage({ page: 1, pageSize, sortBy: 'startDate', sortOrder: 'asc' }).subscribe({
      next: (firstPage) => {
        const firstItems = firstPage.items ?? [];
        const totalPages = Math.max(1, firstPage.totalPages ?? 1);

        this.isLoading = false;
        this.applyEventsData(firstItems);

        if (totalPages <= 1) {
          this.dataCacheService.set(cacheKey, firstItems);
          return;
        }

        forkJoin(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            this.eventService.getPage({ page: i + 2, pageSize, sortBy: 'startDate', sortOrder: 'asc' })
          )
        ).subscribe({
          next: (pages) => {
            const all = [...firstItems, ...pages.flatMap(p => p.items ?? [])];
            this.dataCacheService.set(cacheKey, all);
            this.applyEventsData(all);
          },
          error: () => { /* first page already shown */ }
        });
      },
      error: () => {
        this.events = [];
        this.visibleEvents = [];
        this.totalCount = 0;
        this.hasNextPage = false;
        this.isLoading = false;
        this.flushUi();
      },
    });
  }

  private applyEventsData(rawList: EventDto[]): void {
    try {
      const eventList = rawList.map((event) => this.normalizeEvent(event));

      const active = eventList
        .filter((event) => event.id > 0 && event.isActive !== false)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

      const now = new Date();
      const futureOnly = active.filter((event) => new Date(event.startDate) >= now);
      const source = futureOnly.length ? futureOnly : active;

      this.events = source.map((event) => ({
        id: event.id,
        title: event.name,
        category: this.normalizeCategory(event.eventTypeName),
        dateText: this.formatDate(event.startDate),
        timeText: this.formatTimeRange(event.startDate, event.endDate),
        location: event.localityName ?? event.destinationName ?? 'Montenegro',
        priceText: this.formatPrice(event.price),
        imageUrl: this.resolveMediaUrl(event.mainImageUrl),
        attendeesText: event.maxVisitors
          ? `Max ${event.maxVisitors} visitors`
          : 'No attendee data',
        latitude: event.latitude,
        longitude: event.longitude,
        eventTypeName: event.eventTypeName ?? '',
        eventTypeId: event.eventTypeId ?? 0,
        description: this.getShortDescription(event.description, 1),
        startDate: event.startDate,
        endDate: event.endDate,
      }));
      this.updateDistances();
      this.applyPlannerState(this.events);
      this.eventTypes = this.extractUniqueTypes(this.events);
      this.refreshVisibleEvents();
    } catch {
      this.events = [];
      this.visibleEvents = [];
      this.totalCount = 0;
      this.hasNextPage = false;
    }
    this.flushUi();
  }

  private getShortDescription(text?: string, maxSentences = 2): string {
    if (!text) return '';

    const sentences = text
      .replace(/\s+/g, ' ')
      .match(/[^.!?]+[.!?]+/g);

    if (!sentences) return text;

    return sentences.slice(0, maxSentences).join(' ').trim();
  }
  private extractUniqueTypes(events: EventCard[]): { id: number; name: string }[] {
    const map = new Map<string, { id: number; name: string }>();

    events.forEach((event) => {
      if (event.eventTypeName) {
        map.set(event.eventTypeName, {
          id: event.eventTypeId ?? 0,
          name: event.eventTypeName,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
  private refreshVisibleEvents(): void {
    const filteredEvents = this.filteredEvents;
    this.totalCount = filteredEvents.length;

    if (this.totalCount === 0) {
      this.currentPage = 1;
      this.hasNextPage = false;
      this.visibleEvents = [];
      this.flushUi();
      return;
    }

    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    this.currentPage = Math.min(this.currentPage, totalPages);
    this.hasNextPage = this.currentPage < totalPages;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.visibleEvents = filteredEvents.slice(startIndex, startIndex + this.pageSize);
    this.applyPlannerState(this.visibleEvents);
    this.flushUi();
  }

  setFilter(filter: string): void {
    if (filter === 'All') {
      this.activeFilters = new Set();
    } else if (this.activeFilters.has(filter)) {
      this.activeFilters.delete(filter);
      this.activeFilters = new Set(this.activeFilters);
    } else {
      this.activeFilters = new Set([...this.activeFilters, filter]);
    }
    this.currentPage = 1;
    this.saveListState();
    void this.refreshVisibleEvents();
  }

  private normalizeEvent(raw: EventDto): {
    eventTypeId?: number | null;
    latitude?: number;
    longitude?: number;
    mainImageUrl?: string;
    id: number;
    name: string;
    eventTypeName?: string | null;
    startDate: string;
    endDate?: string | null;
    price?: number | null;
    maxVisitors?: number | null;
    isActive: boolean;
    localityName?: string | null;
    destinationName?: string | null;
    description?: string;
  } {
    const dto = raw as unknown as Record<string, unknown>;
    const startDate = dto['startDate'] ?? dto['StartDate'];
    const endDate = dto['endDate'] ?? dto['EndDate'];
    const mainImageUrl = dto['mainImageUrl'] ?? dto['MainImageUrl'];

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      mainImageUrl: typeof mainImageUrl === 'string' ? mainImageUrl : undefined,
      eventTypeName: (dto['eventTypeName'] ?? dto['EventTypeName'] ?? null) as string | null,
      startDate: typeof startDate === 'string'
        ? startDate
        : new Date(startDate as string | number | Date).toISOString(),
      endDate: typeof endDate === 'string' || endDate == null
        ? (endDate as string | null | undefined)
        : new Date(endDate as string | number | Date).toISOString(),
      price: this.readOptionalNumber(dto, ['price', 'Price']),
      maxVisitors: this.readOptionalNumber(dto, ['maxVisitors', 'MaxVisitors']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? null) as string | null,
      destinationName: (dto['destinationName'] ?? dto['DestinationName'] ?? null) as string | null,
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      eventTypeId: this.readOptionalNumber(dto, ['eventTypeId', 'EventTypeId']),
      description: String(dto['description'] ?? dto['Description'] ?? ''),
    };
  }


  private toArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (!raw || typeof raw !== 'object') return [];
    const obj = raw as any;
    return obj.items || obj.data || obj.results || obj.value || [];
  }

  private readOptionalNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = obj[key];
      if (value == null) continue;
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
    return undefined;
  }

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (trimmed.startsWith('/')) return `${apiBase}${trimmed}`;
    return `${apiBase}/${trimmed}`;
  }

  private normalizeCategory(raw?: string | null): string {
    if (!raw?.trim()) return 'Events';
    const value = raw.trim().toLowerCase();
    if (value.includes('route')) return 'Rute';
    return raw.trim();
  }

  private categoryIcon(category: string): string {
    const value = category.toLowerCase();
    if (value.includes('music')) return '♫';
    if (value.includes('food')) return '🍴';
    return '';
  }

  private formatDate(startDate: string): string {
    const date = new Date(startDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  private formatPrice(price?: number | null): string {
    if (!price || price <= 0) return 'Free';
    return `€${price.toFixed(2)}`;
  }

  private formatTimeRange(startDate: string, endDate?: string | null): string {
    const start = new Date(startDate);
    const startText = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
    if (!endDate) return startText;
    const end = new Date(endDate);
    const endText = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
    return `${startText} - ${endText}`;
  }

  private priceToNumber(text: string): number {
    if (!text) return 0;

    if (text.toLowerCase().includes('free')) return 0;

    const parsed = Number(text.replace(/[^\d.]/g, ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private flushUi(): void {
    this.ngZone.run(() => this.cdr.detectChanges());
  }

  getDistanceText(item: any): string | null {
    if (!this.isTracking || !this.userLocation) return null;
    if (!item.latitude || !item.longitude) return null;

    const km = this.getDistanceKm(
      this.userLocation.lat,
      this.userLocation.lng,
      item.latitude,
      item.longitude
    );

    return km < 1
      ? `${Math.round(km * 1000)} m`
      : `${km.toFixed(1)} km`;
  }
  private getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  private updateDistances(): void {
    if (!this.userLocation) return;

    this.events = this.events.map(a => {
      if (a.latitude == null || a.longitude == null) {
        return { ...a, distanceMeters: undefined };
      }

      return {
        ...a,
        distanceMeters: this.getDistanceKm(
          this.userLocation!.lat,
          this.userLocation!.lng,
          a.latitude,
          a.longitude
        )
      };
    });
  }
  private clearDistances(): void {
    this.events = this.events.map(a => ({
      ...a,
      distanceMeters: undefined
    }));
  }
}
