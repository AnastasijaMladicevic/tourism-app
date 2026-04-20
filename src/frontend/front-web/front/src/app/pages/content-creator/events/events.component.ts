import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventService } from '../../../services/event.service';
import { EventDto, EventQueryDto } from '../../../models/event.model';

interface EventInsightCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'amber';
}

interface EventCrewMember {
  name: string;
  role: string;
  initials: string;
}

interface EventScheduleRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-content-creator-events',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.css']
})
export class ContentCreatorEventsComponent implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  Math = Math;

  events: EventDto[] = [];
  filteredEvents: EventDto[] = [];
  pagedEvents: EventDto[] = [];
  isLoading = true;
  errorMessage = '';
  selectedEvent: EventDto | null = null;
  
  currentPage = 1;
  pageSize = 5;
  totalCount = 0;

  searchQuery = '';
  statusFilter = 'all';
  categoryFilter = 'all';
  sortBy = 'startDate';
  sortOrder: 'asc' | 'desc' = 'asc';

  readonly stats: EventInsightCard[] = [
    { label: 'Upcoming this week', value: '12', hint: 'Events published in the next 7 days', tone: 'blue' },
    { label: 'Active staff', value: '48', hint: 'Content creators and coordinators online', tone: 'green' },
    { label: 'Total capacity filled', value: '64%', hint: 'Average occupancy across published events', tone: 'amber' }
  ];

  readonly crew: EventCrewMember[] = [
    { name: 'Marcus Chen', role: 'Content Creator', initials: 'MC' },
    { name: 'Elena Rodriguez', role: 'Content Creator', initials: 'ER' },
    { name: 'Ana Petrovic', role: 'Event Support', initials: 'AP' }
  ];

  readonly categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'Festival', label: 'Festival' },
    { value: 'Workshop', label: 'Workshop' },
    { value: 'Sports', label: 'Sports' },
    { value: 'Cultural', label: 'Cultural' },
    { value: 'Exhibition', label: 'Exhibition' },
    { value: 'Concert', label: 'Concert' }
  ];

  readonly statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const query: EventQueryDto = {
      page: 1,
      pageSize: 100,
      search: this.searchQuery || undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
    };

    this.eventService.getMy(query).subscribe({
      next: (response) => {
        this.events = response.items;
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
    const selectedCategory = this.categoryFilter.toLowerCase();
    const selectedStatus = this.statusFilter.toLowerCase();

    this.filteredEvents = this.events.filter((event) => {
      const eventStatus = this.getStatusForComparison(event.status);
      const eventCategory = this.getCategoryLabel(event).toLowerCase();
      const eventText = [event.name, event.description, event.eventTypeName, event.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !search || eventText.includes(search);
      const matchesStatus = selectedStatus === 'all' || eventStatus === selectedStatus;
      const matchesCategory = selectedCategory === 'all' || eventCategory === selectedCategory;

      return matchesSearch && matchesStatus && matchesCategory;
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

  onSearch(): void {
    this.currentPage = 1;
    this.loadEvents();
  }

  onClearSearch(): void {
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.categoryFilter = 'all';
    this.currentPage = 1;
    this.loadEvents();
  }

  onChangeSortBy(value: string): void {
    this.sortBy = value;
    this.currentPage = 1;
    this.loadEvents();
  }

  onChangeSortOrder(value: 'asc' | 'desc'): void {
    this.sortOrder = value;
    this.currentPage = 1;
    this.loadEvents();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyLocalFilters();
  }
  onCreateEvent(): void {
    this.router.navigate(['/content-creator/events/create']);
  }

  onEditEvent(event: EventDto): void {
    this.router.navigate(['/content-creator/events/edit', event.id]);
  }

  onViewEvent(event: EventDto): void {
    this.selectedEvent = event;
    this.cdr.detectChanges();
  }

  openEventDetails(event: EventDto): void {
    this.router.navigate(['/content-creator/events/view', event.id]);
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

  selectEvent(event: EventDto): void {
    this.selectedEvent = event;
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
      case 'rejected':
      case 'cancelled':
        return 'badge-rejected';
      default:
        return 'badge-default';
    }
  }

  getRejectionReason(event: EventDto | null): string {
    const reason = event?.rejectionReason?.trim();
    if (!reason || (event?.status ?? '').toLowerCase() !== 'rejected') {
      return '';
    }

    return reason;
  }

  hasRejectionReason(event: EventDto | null): boolean {
    return this.getRejectionReason(event).length > 0;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusForComparison(status: string | undefined): string {
    return (status ?? '').toLowerCase();
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

  getCapacityLabel(event: EventDto): string {
    if (!event.maxVisitors) {
      return '—';
    }

    return `${new Intl.NumberFormat('en-US').format(event.maxVisitors)} max`;
  }

  getDetailBanner(event: EventDto | null): string {
    if (event?.mainImageUrl) {
      return this.normalizeImageUrl(event.mainImageUrl);
    }

    return '/assets/pozadina.png';
  }

  getSelectedSummary(event: EventDto | null): string {
    if (!event?.description) {
      return 'A featured event selected from the creator workspace. Use this panel to inspect the schedule, media, and staffing for the event.';
    }

    return event.description;
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

  get selectedInsightCards(): EventInsightCard[] {
    return this.stats;
  }

  get selectedSchedule(): EventScheduleRow[] {
    if (!this.selectedEvent) {
      return [];
    }

    return [
      { label: 'Starts', value: this.formatDate(this.selectedEvent.startDate) },
      { label: 'Ends', value: this.formatDate(this.selectedEvent.endDate ?? this.selectedEvent.startDate) },
      { label: 'Location', value: this.getLocationLabel(this.selectedEvent) },
      { label: 'Category', value: this.getCategoryLabel(this.selectedEvent) }
    ];
  }

  private normalizeImageUrl(value: string): string {
    const trimmed = value.trim();

    if (!trimmed) {
      return '';
    }

    if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(trimmed)) {
      return trimmed;
    }

    try {
      return encodeURI(new URL(trimmed, document.baseURI).href);
    } catch {
      return encodeURI(trimmed);
    }
  }

}