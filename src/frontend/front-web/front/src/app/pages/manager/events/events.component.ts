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
  draftSearchQuery = '';
  statusFilter = 'all';
  categoryFilter = 'all';
  sortBy = 'startDate';
  sortOrder: 'asc' | 'desc' = 'asc';
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 20, 50];
  filterPanelOpen = false;

  currentPage = 1;
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
    next: (response: any) => {
      const list = Array.isArray(response) ? response : (response?.items ?? []);
      this.managedDestinationLabel = list.map((d: any) => d.name).join(', ') || 'Manager Events';
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
      statusFilter: this.statusFilter,
      categoryFilter: this.categoryFilter,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    };

    const query: EventQueryDto = buildEventQueryDto(filterState, {
      page: this.currentPage,
      pageSize: this.pageSize,
      includeStatus: true,
      includeCategoryAsType: true,
      includeDateFilters: false
    });

    this.eventService.getForManager(query).subscribe({
      next: (response) => {
        this.events = response.items;
        this.filteredEvents = response.items;
        this.pagedEvents = response.items;
        this.totalCount = response.totalCount;
        this.currentPage = response.page;

        if (!this.selectedEvent || !this.pagedEvents.some((event) => event.id === this.selectedEvent?.id)) {
          this.selectedEvent = this.pagedEvents[0] ?? null;
        }

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

  onSearchChange(): void {
    // Intentionally no-op: search is applied on Enter or when filters are applied.
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.applySearch();
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onApplyFilters(): void {
    this.currentPage = 1;
    this.searchQuery = this.draftSearchQuery.trim();
    this.loadEvents();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.draftSearchQuery = '';
    this.statusFilter = 'all';
    this.categoryFilter = 'all';
    this.sortBy = 'startDate';
    this.sortOrder = 'asc';
    this.pageSize = 5;
    this.currentPage = 1;
    this.loadEvents();
  }

  onEditEvent(event: EventDto): void {
    this.router.navigate(['/manager/events/edit', event.id]);
  }

  onViewEvent(event: EventDto): void {
    this.selectedEvent = event;
    this.cdr.detectChanges();
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadEvents();
    }
  }

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadEvents();
    }
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadEvents();
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
    return this.pageStart + this.pagedEvents.length - 1;
  }

  get totalPages(): number {
    if (!this.totalCount || this.pageSize < 1) {
      return 1;
    }

    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  private applySearch(): void {
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadEvents();
  }
}
