import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { DestinationService } from '../../../services/destination.service';
import { EventDto, EventQueryDto } from '../../../models/event.model';
import { buildEventQueryDto, EventFilterState } from '../../../models/event-filters.model';

interface EventInsightCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'neutral';
}

interface EventScheduleRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-manager-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class ManagerEventsComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly destinationService = inject(DestinationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  Math = Math;

  events: EventDto[] = [];
  filteredEvents: EventDto[] = [];
  pagedEvents: EventDto[] = [];
  selectedEvent: EventDto | null = null;
  managedDestinationLabel = 'Manager Events';

  isLoading = true;
  errorMessage = '';

  searchQuery = '';
  currentPage = 1;
  pageSize = 5;
  totalCount = 0;

  readonly stats: EventInsightCard[] = [
    { label: 'Upcoming this week', value: '12', hint: '+2 from last month', tone: 'blue' },
    { label: 'Active staff', value: '48', hint: '98% availability', tone: 'green' },
    { label: 'Total capacity filled', value: '64%', hint: 'Across all published events', tone: 'neutral' }
  ];

  ngOnInit(): void {
    this.loadManagedDestinationLabel();
    this.loadEvents();
  }

  loadManagedDestinationLabel(): void {
    this.destinationService.getAll({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }).subscribe({
      next: (response) => {
        this.managedDestinationLabel = response.items.map((destination) => destination.name).join(', ') || 'Manager Events';
      },
      error: () => {
        this.managedDestinationLabel = 'Manager Events';
      }
    });
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filterState: EventFilterState = {
      searchQuery: this.searchQuery,
      statusFilter: 'all',
      categoryFilter: 'all',
      sortBy: 'startDate',
      sortOrder: 'asc'
    };

    const query: EventQueryDto = buildEventQueryDto(filterState, {
      page: 1,
      pageSize: 100,
      includeStatus: false,
      includeCategoryAsType: false,
      includeDateFilters: false
    });

    this.loadManagerEventsPage(query, 1, []);
  }

  private loadManagerEventsPage(baseQuery: EventQueryDto, page: number, accumulatedEvents: EventDto[]): void {
    this.eventService.getForManager({ ...baseQuery, page }).subscribe({
      next: (response) => {
        const nextEvents = accumulatedEvents.concat(response.items);

        if (page < response.totalPages) {
          this.loadManagerEventsPage(baseQuery, page + 1, nextEvents);
          return;
        }

        this.events = nextEvents;
        this.applyLocalFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load events';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyLocalFilters(): void {
    const search = this.searchQuery.trim().toLowerCase();

    this.filteredEvents = this.events.filter((event) => {
      const eventText = [event.name, event.description, event.eventTypeName, event.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return !search || eventText.includes(search);
    });

    this.totalCount = this.filteredEvents.length;
    const maxPage = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    if (this.currentPage > maxPage) {
      this.currentPage = maxPage;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.pagedEvents = this.filteredEvents.slice(startIndex, startIndex + this.pageSize);

    if (!this.selectedEvent || !this.filteredEvents.some((event) => event.id === this.selectedEvent?.id)) {
      this.selectedEvent = this.pagedEvents[0] ?? this.filteredEvents[0] ?? null;
    }
  }

  onSearchChange(): void {
    this.currentPage = 1;
    this.applyLocalFilters();
  }

  onMoreFilters(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.applyLocalFilters();
  }

  onEditEvent(event: EventDto): void {
    this.router.navigate(['/manager/events/edit', event.id]);
  }

  onViewEvent(event: EventDto): void {
    this.selectedEvent = event;
    this.cdr.detectChanges();
  }

  onNextPage(): void {
    if (this.currentPage * this.pageSize < this.totalCount) {
      this.currentPage++;
      this.applyLocalFilters();
    }
  }

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.applyLocalFilters();
    }
  }

  trackByEventId(_: number, event: EventDto): number {
    return event.id;
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'published':
        return 'badge-approved';
      case 'pending':
        return 'badge-pending';
      case 'cancelled':
      case 'rejected':
        return 'badge-cancelled';
      case 'draft':
        return 'badge-draft';
      default:
        return 'badge-draft';
    }
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) {
      return '-';
    }

    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  formatTime(date: string | Date | undefined): string {
    if (!date) {
      return '-';
    }

    const d = new Date(date);
    return d.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCategoryLabel(event: EventDto): string {
    if (event.eventTypeName) {
      return event.eventTypeName;
    }

    const categories = ['Festival', 'Workshop', 'Sports', 'Cultural', 'Exhibition', 'Concert'];
    return categories[(event.id - 1) % categories.length] ?? 'Festival';
  }

  getLocationLabel(event: EventDto): string {
    const locations = [
      'Grand Highland Park',
      'Clay & Co. Studio',
      'Azure Bay Waterfront',
      'The Blue Note Lounge',
      'Central Exhibition Hall',
      'Riverside Open Arena'
    ];

    return locations[(event.id - 1) % locations.length] ?? 'Central Venue';
  }

  getLocationSubLabel(event: EventDto): string {
    const subLabels = [
      'Summit Peaks Region',
      'Old Town District',
      'Coastal Haven',
      'Metro Central',
      'Old Town District',
      'Green Belt'
    ];

    return subLabels[(event.id - 1) % subLabels.length] ?? 'City Center';
  }

  getCapacityLabel(event: EventDto): string {
    if (!event.maxVisitors) {
      return '—';
    }

    return `${new Intl.NumberFormat('en-US').format(event.maxVisitors)} max`;
  }

  getCapacityProgress(event: EventDto): number {
    const max = event.maxVisitors ?? 2500;
    return Math.min((max / 5000) * 100, 100);
  }

  getCategoryIcon(event: EventDto): string {
    switch (this.getCategoryLabel(event).toLowerCase()) {
      case 'festival':
        return 'public';
      case 'workshop':
        return 'sell';
      case 'sports':
        return 'event';
      case 'cultural':
        return 'location_on';
      case 'exhibition':
        return 'image';
      case 'concert':
        return 'music_note';
      default:
        return 'category';
    }
  }

  getDetailBanner(event: EventDto | null): string {
    if (event?.mainImageUrl) {
      return event.mainImageUrl;
    }

    return 'assets/pozadina.png';
  }

  getSelectedEventRejectionReason(event: EventDto | null): string {
    const reason = event?.rejectionReason?.trim();
    if (!reason || (event?.status ?? '').toLowerCase() !== 'rejected') {
      return '';
    }

    return reason;
  }

  hasSelectedEventRejectionReason(event: EventDto | null): boolean {
    return this.getSelectedEventRejectionReason(event).length > 0;
  }

  getSelectedSummary(event: EventDto | null): string {
    if (!event?.description) {
      return 'A grand celebration of the longest night with light installations, traditional food, and live folk music across the Highland Park.';
    }

    return event.description;
  }

  get selectedSchedule(): EventScheduleRow[] {
    if (!this.selectedEvent) {
      return [];
    }

    return [
      {
        label: `Starts: ${this.formatDate(this.selectedEvent.startDate)}`,
        value: `${this.formatTime(this.selectedEvent.startDate)} Local Time`
      },
      {
        label: `Ends: ${this.formatDate(this.selectedEvent.endDate ?? this.selectedEvent.startDate)}`,
        value: `${this.formatTime(this.selectedEvent.endDate ?? this.selectedEvent.startDate)} Local Time`
      }
    ];
  }

  get pageStart(): number {
    if (!this.totalCount || !this.pagedEvents.length) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalCount);
  }
}
