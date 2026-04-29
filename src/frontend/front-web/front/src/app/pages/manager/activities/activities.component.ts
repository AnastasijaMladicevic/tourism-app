import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivitiesService, ActivityDto, ActivityTypeOption } from '../../../services/activities';

@Component({
  selector: 'app-manager-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.css']
})
export class ManagerActivitiesComponent implements OnInit {
  private readonly activitiesService = inject(ActivitiesService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

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
  statusFilter = 'all';
  typeFilter = 'all';
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  filterPanelOpen = false;

  activityTypeOptions: ActivityTypeOption[] = [];
  isLoadingTypes = true;

  readonly statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  readonly sortByOptions = [
    { value: 'name', label: 'Name' },
    { value: 'price', label: 'Price' },
    { value: 'durationMinutes', label: 'Duration' },
    { value: 'createdAt', label: 'Created date' }
  ];

  ngOnInit(): void {
    this.loadActivityTypes();
    this.loadActivities();
  }

  private loadActivityTypes(): void {
    this.activitiesService.getActivityTypeOptions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (types) => {
          this.activityTypeOptions = types;
          this.isLoadingTypes = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.activityTypeOptions = [];
          this.isLoadingTypes = false;
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
      search: this.searchQuery || undefined,
      status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          let items = response.items ?? [];

          if (this.typeFilter !== 'all') {
            const typeId = Number(this.typeFilter);
            if (Number.isFinite(typeId)) {
              items = items.filter((activity) => activity.activityTypeId === typeId);
            }
          }

          this.activities = items;
          this.totalCount = response.totalCount ?? items.length;
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
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Failed to load activities';
          this.activities = [];
          this.totalCount = 0;
          this.totalPages = 1;
          this.selectedActivity = null;
          this.selectedActivityDetails = null;
          this.isLoading = false;
          this.cdr.detectChanges();
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

  onApplyFilters(): void {
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadActivities();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.draftSearchQuery = '';
    this.statusFilter = 'all';
    this.typeFilter = 'all';
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

  onReviewActivity(activity: ActivityDto): void {
    this.router.navigate(['/manager/activities/review', activity.id]);
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

  getStatusLabel(status?: string): string {
    const normalized = (status ?? '').trim().toLowerCase();
    if (normalized === 'approved') return 'Approved';
    if (normalized === 'rejected') return 'Rejected';
    return 'Pending';
  }

  getStatusClass(status?: string): string {
    const normalized = (status ?? '').trim().toLowerCase();
    if (normalized === 'approved') return 'status-published';
    if (normalized === 'rejected') return 'status-archived';
    return 'status-pending';
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
      return 'A submitted activity awaiting your oversight. Review the details, location, and metadata before approving or declining.';
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

  get hasSelectedRejection(): boolean {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    if (!activity) {
      return false;
    }

    return (activity.status ?? '').trim().toLowerCase() === 'rejected'
      && !!activity.rejectionReason?.trim();
  }

  get selectedRejectionReason(): string {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    return activity?.rejectionReason?.trim() ?? '';
  }

  private loadSelectedActivityDetails(activityId: number): void {
    this.isDetailsLoading = true;
    this.selectedActivityDetails = this.selectedActivity;

    this.activitiesService.getById(activityId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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
