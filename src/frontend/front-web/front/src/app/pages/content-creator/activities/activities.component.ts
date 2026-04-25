import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivitiesService, ActivityDto } from '../../../services/activities';

@Component({
  selector: 'app-content-creator-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.css']
})
export class ContentCreatorActivitiesComponent implements OnInit {
  private readonly activitiesService = inject(ActivitiesService);
  private readonly cdr = inject(ChangeDetectorRef);

  activities: ActivityDto[] = [];
  isLoading = true;
  errorMessage = '';
  selectedActivity: ActivityDto | null = null;
  selectedActivityDetails: ActivityDto | null = null;
  isDetailsLoading = false;

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 1;
  readonly pageSizeOptions = [5, 10, 20, 50];

  searchQuery = '';
  draftSearchQuery = '';
  rangeStartDate = '';
  rangeEndDate = '';
  statusFilter = 'all';
  typeFilter = 'all';
  destinationFilter = 'all';
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  filterPanelOpen = false;

  readonly statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'published', label: 'Published' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'archived', label: 'Archived' }
  ];

  readonly sortByOptions = [
    { value: 'name', label: 'Name' },
    { value: 'activityTypeName', label: 'Type' },
    { value: 'durationMinutes', label: 'Duration' },
    { value: 'status', label: 'Status' },
    { value: 'createdAt', label: 'Created date' }
  ];

  ngOnInit(): void {
    this.loadActivities();
  }

  loadActivities(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.activitiesService.getMyActivities({
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.searchQuery || undefined,
      status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
      type: this.typeFilter !== 'all' ? this.typeFilter : undefined,
      destination: this.destinationFilter !== 'all' ? this.destinationFilter : undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      startDate: this.rangeStartDate || undefined,
      endDate: this.rangeEndDate || undefined
    }).subscribe({
      next: (response) => {
        this.activities = response.items ?? [];
        this.totalCount = response.totalCount ?? 0;
        this.currentPage = response.page ?? this.currentPage;
        this.pageSize = response.pageSize ?? this.pageSize;
        this.totalPages = response.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));

        if (!this.selectedActivity || !this.activities.some((activity) => activity.id === this.selectedActivity?.id)) {
          this.selectedActivity = this.activities[0] ?? null;
        }

        if (this.selectedActivity) {
          this.loadSelectedActivityDetails(this.selectedActivity.id);
        } else {
          this.selectedActivityDetails = null;
        }

        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load activities';
        this.activities = [];
        this.totalCount = 0;
        this.totalPages = 1;
        this.selectedActivity = null;
        this.selectedActivityDetails = null;
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    // Search is applied explicitly on Enter or via the filter panel's Apply button.
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onApplyFilters();
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onDateRangeChange(): void {
    if (!this.rangeStartDate || !this.rangeEndDate) {
      return;
    }

    if (this.rangeStartDate > this.rangeEndDate) {
      const originalStart = this.rangeStartDate;
      this.rangeStartDate = this.rangeEndDate;
      this.rangeEndDate = originalStart;
    }

    this.currentPage = 1;
    this.loadActivities();
  }

  onApplyFilters(): void {
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadActivities();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.draftSearchQuery = '';
    this.rangeStartDate = '';
    this.rangeEndDate = '';
    this.statusFilter = 'all';
    this.typeFilter = 'all';
    this.destinationFilter = 'all';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.currentPage = 1;
    this.loadActivities();
  }

  onFilterChange(): void {
    // Filters are applied explicitly via the panel's Apply button.
  }

  onNextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }

    this.currentPage += 1;
    this.loadActivities();
  }

  onPreviousPage(): void {
    if (this.currentPage <= 1) {
      return;
    }

    this.currentPage -= 1;
    this.loadActivities();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadActivities();
  }

  onSelectActivity(activity: ActivityDto): void {
    this.selectedActivity = activity;
    this.selectedActivityDetails = activity;
    this.loadSelectedActivityDetails(activity.id);
  }

  trackByActivityId(_: number, activity: ActivityDto): number {
    return activity.id;
  }

  formatDuration(minutes?: number): string {
    if (!minutes || minutes <= 0) {
      return '-';
    }

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return hours === 1 ? '1 Hour' : `${hours} Hours`;
    }

    return `${hours}h ${remainingMinutes}m`;
  }

  getActivityLocation(activity: ActivityDto): string {
    return activity.destinationName || activity.localityName || activity.objectName || activity.regionName || '-';
  }

  getStatusClass(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'published':
      case 'approved':
        return 'status-published';
      case 'draft':
        return 'status-draft';
      case 'archived':
      case 'rejected':
        return 'status-archived';
      case 'pending':
        return 'status-pending';
      default:
        return 'status-draft';
    }
  }

  get pageStart(): number {
    if (!this.totalCount || this.activities.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.pageStart + this.activities.length - 1;
  }

  get selectedSummary(): string {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;

    if (!activity?.description) {
      return 'A featured activity selected from the creator workspace. Use this panel to inspect the location, logistics, and metadata for the activity.';
    }

    return activity.description;
  }

  get selectedCategory(): string {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    return activity?.activityTypeName || 'Activity';
  }

  get selectedLocation(): string {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;

    if (!activity) {
      return '-';
    }

    return activity.destinationName || activity.localityName || activity.objectName || activity.regionName || '-';
  }

  get selectedBanner(): string {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    return activity?.mainImageUrl || '/assets/pozadina.png';
  }

  private loadSelectedActivityDetails(activityId: number): void {
    this.isDetailsLoading = true;
    this.selectedActivityDetails = this.selectedActivity;

    this.activitiesService.getById(activityId).subscribe({
      next: (activity) => {
        this.selectedActivityDetails = activity;
        this.isDetailsLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedActivityDetails = this.selectedActivity;
        this.isDetailsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
}