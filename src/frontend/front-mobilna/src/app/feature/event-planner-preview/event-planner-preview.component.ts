import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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

interface PreviewEventItem {
  id: number;
  title: string;
  location: string;
  dateLabel: string;
  day: string;
  month: string;
  price: string;
  tags: string[];
  imageUrl: string;
  categoryChip: string;
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
  plannerTime: string;
  plannerGroupLabel: string;
  priority: 'Obavezno' | 'Možda' | 'Ako bude vremena';
  sortDate: Date;
}

interface PlannerGroup {
  label: string;
  items: PlannerItem[];
}

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
export class EventPlannerPreviewComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly activeRegionService = inject(ActiveRegionService);
  private readonly eventPlannerService = inject(EventPlannerService);
  private readonly plannerLocalPreferences = inject(PlannerLocalPreferencesService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly filterChips = [
    'Svi',
    'Koncerti',
    'Kultura',
    'Sport',
    'Festival',
    'Hrana i piće',
    'Za decu',
  ];

  protected readonly regionName = signal('Crna Gora');
  protected readonly activeChip = signal('Svi');
  protected readonly searchTerm = signal('');
  protected readonly isLoading = signal(true);
  protected readonly hasError = signal(false);
  protected readonly allEvents = signal<PreviewEventItem[]>([]);
  protected readonly allPlannerItems = signal<PlannerItem[]>([]);
  protected readonly plannerLoading = signal(false);
  protected readonly plannerError = signal('');
  protected readonly removingPlannerId = signal<number | null>(null);

  protected readonly events = computed(() => {
    const query = this.normalizeText(this.searchTerm());
    const activeChip = this.activeChip();

    return this.allEvents().filter((event) => {
      const matchesChip = activeChip === 'Svi' || event.categoryChip === activeChip;
      if (!matchesChip) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = this.normalizeText(
        [event.title, event.location, event.searchableCategory, ...event.tags].join(' '),
      );

      return haystack.includes(query);
    });
  });

  protected readonly plannedEvents = computed(() =>
    this.events()
      .filter((event) => event.isAdded)
      .sort((left, right) => {
        const leftDate = this.parseDate(left.startDate)?.getTime() ?? 0;
        const rightDate = this.parseDate(right.startDate)?.getTime() ?? 0;
        return leftDate - rightDate;
      }),
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
      const existing = groups.get(item.plannerGroupLabel) ?? [];
      existing.push(item);
      groups.set(item.plannerGroupLabel, existing);
    }

    return [...groups.entries()].map(([label, items]) => ({ label, items }));
  });

  protected readonly plannerCount = computed(() => this.visiblePlannerItems().length);

  ngOnInit(): void {
    this.loadEvents();
    this.loadPlanner();
  }

  protected setActiveChip(chip: string): void {
    this.activeChip.set(chip);
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected openEvents(): void {
    void this.router.navigate(['/events'], {
      queryParams: { returnUrl: this.router.url },
    });
  }

  protected openEventDetails(eventId: number): void {
    void this.router.navigate(['/event', eventId]);
  }

  protected editPlannerEvent(event: PreviewEventItem): void {
    if (!event.isAdded || !event.plannerId) {
      return;
    }

    void this.router.navigate(['/planner/add'], {
      state: {
        plannerId: event.plannerId,
        eventId: event.id,
        title: event.title,
        location: event.location,
        startDate: event.startDate,
        endDate: event.endDate,
        type: event.eventTypeName || 'Dogadjaj',
        imageUrl: event.imageUrl,
        description: event.description,
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
        type: targetEvent.eventTypeName || 'Dogadjaj',
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
          this.plannerError.set('Greška pri uklanjanju događaja iz planera.');
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
      case 'Obavezno':
        return 'planner-priority planner-priority--must';
      case 'Možda':
        return 'planner-priority planner-priority--maybe';
      default:
        return 'planner-priority planner-priority--later';
    }
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
          this.plannerError.set('Greška pri učitavanju planera.');
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
  }

  private mapEvent(event: EventDto, typeChipMap: Map<string, string>): PreviewEventItem {
    const startDate = this.parseDate(event.startDate);
    const endDate = this.parseDate(event.endDate);
    const categoryChip = this.resolveCategoryChip(event, typeChipMap);
    const eventTypeName = event.eventTypeName?.trim() || categoryChip;
    const tags = this.buildTags(categoryChip, eventTypeName);

    return {
      id: event.id,
      title: event.name?.trim() || 'Naziv događaja nije dostupan',
      location: this.buildEventLocation(event),
      dateLabel: this.buildDateLabel(startDate, endDate),
      day: startDate
        ? startDate.toLocaleDateString('sr-RS', { day: '2-digit' })
        : '--',
      month: startDate
        ? startDate.toLocaleDateString('sr-RS', { month: 'short' }).replace('.', '').toUpperCase()
        : 'DAT',
      price: this.buildPrice(event.price),
      tags,
      imageUrl: this.buildImageUrl(event),
      categoryChip,
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
      title: item.eventName?.trim() || 'Naziv događaja nije dostupan',
      location: this.buildPlannerLocation(item),
      plannerTime: this.formatPlannerTime(startDate),
      plannerGroupLabel: this.formatPlannerGroupLabel(startDate),
      priority: resolvedSchedule.isPriority ? 'Obavezno' : notes ? 'Ako bude vremena' : 'Možda',
      sortDate: startDate,
    };
  }

  private buildEventTypeChipMap(eventTypes: EventTypeOptionDto[]): Map<string, string> {
    const map = new Map<string, string>();

    for (const eventType of eventTypes) {
      const normalizedName = this.normalizeText(eventType.name);
      map.set(normalizedName, this.resolveTypeNameToChip(normalizedName));
    }

    return map;
  }

  private resolveTypeNameToChip(normalizedName: string): string {
    if (this.matchesAny(normalizedName, ['koncert', 'dj', 'nastup'])) {
      return 'Koncerti';
    }

    if (this.matchesAny(normalizedName, ['festival', 'karneval', 'proslava', 'sajam', 'okupljanje'])) {
      return 'Festival';
    }

    if (this.matchesAny(normalizedName, ['sport', 'takmic', 'turnir', 'utakmic'])) {
      return 'Sport';
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
      return 'Kultura';
    }

    return 'Festival';
  }

  private buildTags(categoryChip: string, eventTypeName: string): string[] {
    const tags = [categoryChip];

    if (eventTypeName && this.normalizeText(eventTypeName) !== this.normalizeText(categoryChip)) {
      tags.push(eventTypeName);
    }

    return [...new Set(tags)].slice(0, 2);
  }

  private buildEventLocation(event: EventDto): string {
    const locationParts = [
      event.localityName?.trim(),
      event.objectName?.trim(),
      event.destinationName?.trim(),
    ].filter((part): part is string => !!part);

    return locationParts.length > 0 ? locationParts.join(', ') : 'Lokacija nije navedena';
  }

  private buildPlannerLocation(item: EventPlannerDto): string {
    const locationParts = [
      item.objectName?.trim(),
      item.localityName?.trim(),
      item.destinationName?.trim(),
    ].filter((part): part is string => !!part);

    return locationParts.length > 0 ? locationParts.join(', ') : 'Lokacija nije navedena';
  }

  private buildDateLabel(startDate: Date | null, endDate: Date | null): string {
    if (!startDate) {
      return 'Datum nije naveden';
    }

    const formattedStart = this.formatDate(startDate);
    const formattedEnd = endDate ? this.formatDate(endDate) : null;
    const timePart = this.formatTime(startDate);

    if (formattedEnd && formattedEnd !== formattedStart) {
      return `${formattedStart} - ${formattedEnd}`;
    }

    if (timePart) {
      return `${formattedStart} u ${timePart}`;
    }

    return formattedStart;
  }

  private buildPrice(price?: number): string {
    if (price == null || price <= 0) {
      return 'BESPLATNO';
    }

    return `od ${Math.round(price)} RSD`;
  }

  private buildImageUrl(event: EventDto): string {
    const mainImage = event.images?.find((image) => image.isMain)?.url;
    return event.mainImageUrl || mainImage || event.images?.[0]?.url || FALLBACK_IMAGE_URL;
  }

  private resolveCategoryChip(event: EventDto, typeChipMap: Map<string, string>): string {
    const normalizedTypeName = this.normalizeText(event.eventTypeName ?? '');
    const mappedTypeChip = typeChipMap.get(normalizedTypeName);
    if (mappedTypeChip) {
      return mappedTypeChip;
    }

    const eventText = this.normalizeText(
      [event.eventTypeName, event.name, event.description].filter(Boolean).join(' '),
    );

    if (this.matchesAny(eventText, ['hrana', 'vino', 'degust', 'gastro', 'food', 'piće', 'pice', 'wine'])) {
      return 'Hrana i piće';
    }

    if (this.matchesAny(eventText, ['deca', 'deč', 'decu', 'kids', 'family', 'porodi'])) {
      return 'Za decu';
    }

    if (this.matchesAny(eventText, ['koncert', 'muzik', 'music', 'gig', 'dj', 'nastup'])) {
      return 'Koncerti';
    }

    if (this.matchesAny(eventText, ['festival', 'fest', 'karneval', 'proslava', 'sajam', 'okupljanje'])) {
      return 'Festival';
    }

    if (this.matchesAny(eventText, ['sport', 'bicikl', 'maraton', 'trka', 'planinar', 'turnir', 'utakmic', 'takmic'])) {
      return 'Sport';
    }

    if (this.matchesAny(eventText, ['kultura', 'pozori', 'izloz', 'izlož', 'muzej', 'galerij', 'teatar', 'art', 'seminar', 'radionica'])) {
      return 'Kultura';
    }

    return 'Svi';
  }

  private formatPlannerGroupLabel(date: Date): string {
    return new Intl.DateTimeFormat('sr-RS', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      weekday: 'long',
    }).format(date).toUpperCase();
  }

  private formatPlannerTime(date: Date): string {
    return date.toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  private matchesAny(value: string, needles: string[]): boolean {
    return needles.some((needle) => value.includes(this.normalizeText(needle)));
  }

  private formatDate(date: Date): string {
    const day = date.toLocaleDateString('sr-RS', { day: '2-digit' });
    const month = date.toLocaleDateString('sr-RS', { month: '2-digit' });
    const year = date.toLocaleDateString('sr-RS', { year: 'numeric' });
    return `${day}.${month}.${year}.`;
  }

  private formatTime(date: Date): string {
    const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
    if (!hasTime) {
      return '';
    }

    return date.toLocaleTimeString('sr-RS', {
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
}
