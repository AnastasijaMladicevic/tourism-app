import { CommonModule, Location } from '@angular/common';
import { ChangeDetectorRef, Component, HostListener, NgZone, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { catchError, finalize, forkJoin, of } from 'rxjs';
import { environment } from '../../../environment/environment';
import { EventDto, EventService } from '../../services/event';
import { ImageDto, ImageService } from '../../services/image';
import { Router } from '@angular/router';
import { LazyBackgroundDirective } from '../../shared/directives/lazy-background.directive';

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
}

@Component({
  selector: 'app-events',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, LazyBackgroundDirective],
  templateUrl: './events.html',
  styleUrl: './events.scss',
})
export class EventsComponent implements OnInit {
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly eventService = inject(EventService);
  private readonly imageService = inject(ImageService);
  private readonly router = inject(Router);

  activeCategory: EventCategory = 'All';
  isLoading = true;
  showSearch = false;
  showSortMenu = false;
  searchQuery = '';
  sortOption: 'date' | 'az' | 'za' | 'price' = 'date';
  events: EventCard[] = [];
  visibleEvents: EventCard[] = [];
  currentPage = 1;
  pageSize = 8;
  hasNextPage = false;
  totalCount = 0;
  pageSizeOptions = [8, 12, 16, 24, 32];
  ngOnInit(): void {
    this.loadEvents();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.sort-anchor')) this.showSortMenu = false;
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

    if (this.activeCategory !== 'All') {
      list = list.filter((event) => event.category === this.activeCategory);
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
    }

    return list;
  }
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    void this.refreshVisibleEvents();
  }
  setCategory(category: EventCategory): void {
    this.activeCategory = category;
    this.currentPage = 1;
    this.refreshVisibleEvents();
  }

  setSort(option: 'date' | 'az' | 'za' | 'price'): void {
    this.sortOption = option;
    this.showSortMenu = false;
    this.currentPage = 1;
    this.refreshVisibleEvents();
  }

  sortLabel(): string {
    const map = { date: 'Soonest', az: 'A -> Z', za: 'Z -> A', price: 'Lowest Price' };
    return map[this.sortOption];
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.searchQuery = '';
      this.currentPage = 1;
      this.refreshVisibleEvents();
    }
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.refreshVisibleEvents();
  }

  prevPage(): void {
    if (this.currentPage === 1) return;

    this.currentPage--;
    this.refreshVisibleEvents();
  }

  nextPage(): void {
    if (!this.hasNextPage) return;

    this.currentPage++;
    this.refreshVisibleEvents();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  goBack(): void {
    this.location.back();
  }

  openEvent(id: number): void {
    this.router.navigate(['/event', id]);
  }

  private loadEvents(): void {
    this.isLoading = true;

    this.eventService.getAll().subscribe({
      next: async (events) => {
        try {
          const eventList = this.toArray<EventDto>(events).map((event) =>
            this.normalizeEvent(event),
          );

          const active = eventList
            .filter((event) => event.id > 0 && event.isActive !== false)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

          const now = new Date();
          const futureOnly = active.filter((event) => new Date(event.startDate) >= now);
          const source = futureOnly.length ? futureOnly : active;

          this.events = await Promise.all(
            source.map(async (event) => {
              let imageUrl: string | undefined = undefined;

              try {
                const images = await this.imageService.getForEvent(event.id).toPromise();
                if (images && images.length > 0) {
                  const main = images.find((i) => i.isMain) ?? images[0];
                  imageUrl = this.resolveMediaUrl(main.url);
                }
              } catch {
                imageUrl = undefined;
              }

              return {
                id: event.id,
                title: event.name,
                category: this.normalizeCategory(event.eventTypeName),
                dateText: this.formatDate(event.startDate),
                timeText: this.formatTimeRange(event.startDate, event.endDate),
                location: event.localityName ?? event.destinationName ?? 'Montenegro',
                priceText: this.formatPrice(event.price),
                imageUrl,
                attendeesText: event.maxVisitors
                  ? `Max ${event.maxVisitors} visitors`
                  : 'No attendee data',
              };
            })
          );
          this.refreshVisibleEvents();
        } catch {
          this.events = [];
          this.visibleEvents = [];
          this.totalCount = 0;
          this.hasNextPage = false;
        }

        this.isLoading = false;
        this.flushUi();
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
    this.flushUi();
  }

  private normalizeEvent(raw: EventDto): {
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
  } {
    const dto = raw as unknown as Record<string, unknown>;
    const startDate = dto['startDate'] ?? dto['StartDate'];
    const endDate = dto['endDate'] ?? dto['EndDate'];

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      eventTypeName: (dto['eventTypeName'] ?? dto['EventTypeName'] ?? null) as string | null,
      startDate:
        typeof startDate === 'string'
          ? startDate
          : new Date(startDate as string | number | Date).toISOString(),
      endDate:
        typeof endDate === 'string' || endDate == null
          ? (endDate as string | null | undefined)
          : new Date(endDate as string | number | Date).toISOString(),
      price: this.readOptionalNumber(dto, ['price', 'Price']),
      maxVisitors: this.readOptionalNumber(dto, ['maxVisitors', 'MaxVisitors']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? null) as string | null,
      destinationName: (dto['destinationName'] ?? dto['DestinationName'] ?? null) as string | null,
    };
  }

  private toArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (!raw || typeof raw !== 'object') return [];
    const obj = raw as Record<string, unknown>;
    const keys = ['items', 'data', 'results', 'value'];
    for (const key of keys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }
    return [];
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

  private pickMainImageMap(images: ImageDto[], key: 'eventId'): Map<number, string> {
    const grouped = new Map<number, ImageDto[]>();

    for (const image of images ?? []) {
      const raw = image as unknown as Record<string, unknown>;
      const refId = Number(raw[key] ?? raw['EventId']);
      if (!refId) continue;
      const list = grouped.get(refId) ?? [];
      list.push(image);
      grouped.set(refId, list);
    }

    const result = new Map<number, string>();
    for (const [id, list] of grouped.entries()) {
      const main = list.find((i) => this.isMainImage(i)) ?? list[0];
      const resolved = this.resolveMediaUrl(this.readImageUrl(main));
      if (resolved) result.set(id, resolved);
    }
    return result;
  }

  private readImageUrl(image?: ImageDto): string | undefined {
    if (!image) return undefined;
    const raw = image as unknown as Record<string, unknown>;
    const value = raw['url'] ?? raw['Url'];
    return typeof value === 'string' ? value : undefined;
  }

  private isMainImage(image?: ImageDto): boolean {
    if (!image) return false;
    const raw = image as unknown as Record<string, unknown>;
    const value = raw['isMain'] ?? raw['IsMain'];
    return Boolean(value);
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
    if (text.toLowerCase() === 'free') return 0;
    const parsed = Number(text.replace(/[^\d.]/g, ''));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private flushUi(): void {
    this.ngZone.run(() => {
      this.cdr.detectChanges();
    });
  }
}
