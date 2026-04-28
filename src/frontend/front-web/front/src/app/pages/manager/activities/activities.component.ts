import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivitiesService, ActivityDto, ActivityTypeOption } from '../../../services/activities';
import { DestinationService } from '../../../services/destination.service';

interface ActivityInsightCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'neutral';
}

interface ActivityDetailRow {
  label: string;
  value: string;
}

@Component({
  selector: 'app-manager-activities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.css']
})
export class ManagerActivitiesComponent implements OnInit {
  private readonly activitiesService = inject(ActivitiesService);
  private readonly destinationService = inject(DestinationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  Math = Math;

  activities: ActivityDto[] = [];
  filteredActivities: ActivityDto[] = [];
  pagedActivities: ActivityDto[] = [];
  selectedActivity: ActivityDto | null = null;
  managedDestinationLabel = 'Manager Activities';

  isLoading = true;
  errorMessage = '';

  searchQuery = '';
  draftSearchQuery = '';
  statusFilter = 'all';
  typeFilter = 'all';
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 20, 50];
  filterPanelOpen = false;

  currentPage = 1;
  totalCount = 0;

  readonly stats: ActivityInsightCard[] = [
    { label: 'Active activities', value: '34', hint: '+5 pending review', tone: 'blue' },
    { label: 'Total bookings', value: '892', hint: 'This month', tone: 'green' },
    { label: 'Avg. rating', value: '4.7/5', hint: 'From 156 reviews', tone: 'neutral' }
  ];

  activityTypeOptions: ActivityTypeOption[] = [];
  isLoadingFilters = true;

  ngOnInit(): void {
    this.loadManagedDestinationLabel();
    this.loadFilterOptions();
    this.loadActivities();
  }

  loadManagedDestinationLabel(): void {
    this.destinationService.getAll({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: any) => {
          const list = Array.isArray(response) ? response : (response?.items ?? []);
          this.managedDestinationLabel = list.map((d: any) => d.name).join(', ') || 'Manager Activities';
        },
        error: () => {
          this.managedDestinationLabel = 'Manager Activities';
        }
      });
  }

  loadFilterOptions(): void {
    this.activitiesService.getActivityTypeOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          this.activityTypeOptions = types;
          this.isLoadingFilters = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.activityTypeOptions = [];
          this.isLoadingFilters = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadActivities(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.activitiesService.getForManager({
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (response) => {
        this.activities = response.items;
        this.filteredActivities = this.applyFilters(response.items);
        this.pagedActivities = this.filteredActivities;
        this.totalCount = response.totalCount;
        this.currentPage = response.page;

        if (!this.selectedActivity || !this.pagedActivities.some((activity) => activity.id === this.selectedActivity?.id)) {
          this.selectedActivity = this.pagedActivities[0] ?? null;
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load activities';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private applyFilters(activities: ActivityDto[]): ActivityDto[] {
    let result = activities;

    // Apply status filter
    if (this.statusFilter !== 'all') {
      result = result.filter((activity) => this.getActivityStatusKey(activity.status) === this.statusFilter.toLowerCase());
    }

    // Apply type filter
    if (this.typeFilter !== 'all' && this.typeFilter) {
      const typeId = Number(this.typeFilter);
      result = result.filter((activity) => activity.activityTypeId === typeId);
    }

    // Apply search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      result = result.filter((activity) =>
        activity.name.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }

  onSearchChange(): void {
    // Intentionally no-op: search is applied on Enter or when filters are applied.
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.applySearch();
  }

  applySearch(): void {
    this.currentPage = 1;
    this.searchQuery = this.draftSearchQuery.trim();
    this.filteredActivities = this.applyFilters(this.activities);
    this.pagedActivities = this.filteredActivities;
    this.totalCount = this.filteredActivities.length;
    this.cdr.detectChanges();
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onApplyFilters(): void {
    this.currentPage = 1;
    this.searchQuery = this.draftSearchQuery.trim();
    this.loadActivities();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.draftSearchQuery = '';
    this.statusFilter = 'all';
    this.typeFilter = 'all';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.pageSize = 5;
    this.currentPage = 1;
    this.loadActivities();
  }

  onEditActivity(activity: ActivityDto): void {
    this.router.navigate(['/manager/activities/edit', activity.id]);
  }

  onViewActivity(activity: ActivityDto): void {
    this.selectedActivity = activity;
    this.cdr.detectChanges();
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadActivities();
    }
  }

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadActivities();
    }
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadActivities();
  }

  trackByActivityId(_: number, activity: ActivityDto): number {
    return activity.id;
  }

  getStatusBadgeClass(isActive: boolean | undefined): string {
    return isActive ? 'badge-approved' : 'badge-pending';
  }

  getActivityStatusKey(status: string | undefined): string {
    return (status || 'pending').trim().toLowerCase();
  }

  getActivityStatusLabel(status: string | undefined): string {
    const normalized = this.getActivityStatusKey(status);

    if (normalized === 'approved') {
      return 'Approved';
    }

    if (normalized === 'rejected') {
      return 'Rejected';
    }

    return 'Pending';
  }

  getActivityStatusBadgeClass(status: string | undefined): string {
    const normalized = this.getActivityStatusKey(status);

    if (normalized === 'approved') {
      return 'badge-approved';
    }

    if (normalized === 'rejected') {
      return 'badge-rejected';
    }

    return 'badge-pending';
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

  getActivityTypeLabel(activity: ActivityDto): string {
    return activity.activityTypeName || 'Activity';
  }

  getActivityLocation(activity: ActivityDto): string {
    return activity.destinationName || activity.localityName || 'Location TBD';
  }

  getActivityLocationSub(activity: ActivityDto): string {
    if (activity.localityName && activity.destinationName) {
      return activity.destinationName;
    }
    return '';
  }

  getDurationLabel(activity: ActivityDto): string {
    if (!activity.durationMinutes) {
      return '—';
    }

    const hours = Math.floor(activity.durationMinutes / 60);
    const minutes = activity.durationMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${minutes}m`;
    }
  }

  getPriceLabel(activity: ActivityDto): string {
    if (!activity.price) {
      return 'Free';
    }

    return `$${activity.price.toFixed(2)}`;
  }

  getActivityIcon(activity: ActivityDto): string {
    const type = this.getActivityTypeLabel(activity).toLowerCase();
    switch (type) {
      case 'tour':
        return 'map';
      case 'workshop':
        return 'school';
      case 'sport':
        return 'sports_soccer';
      case 'cultural':
        return 'museum';
      case 'dining':
        return 'restaurant';
      case 'wellness':
        return 'spa';
      default:
        return 'location_on';
    }
  }

  getDetailBanner(activity: ActivityDto | null): string {
    if (activity?.mainImageUrl) {
      return activity.mainImageUrl;
    }

    return 'assets/pozadina.png';
  }

  getSelectedSummary(activity: ActivityDto | null): string {
    if (!activity?.description) {
      return 'An exciting activity curated for your experience.';
    }

    return activity.description;
  }

  get selectedMetrics(): ActivityDetailRow[] {
    if (!this.selectedActivity) {
      return [];
    }

    return [
      {
        label: 'Duration',
        value: this.getDurationLabel(this.selectedActivity)
      },
      {
        label: 'Price',
        value: this.getPriceLabel(this.selectedActivity)
      }
    ];
  }

  get pageStart(): number {
    if (!this.totalCount || !this.pagedActivities.length) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    const end = this.pageStart + this.pagedActivities.length - 1;
    return end > 0 ? end : 0;
  }

  get totalPages(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }
}
