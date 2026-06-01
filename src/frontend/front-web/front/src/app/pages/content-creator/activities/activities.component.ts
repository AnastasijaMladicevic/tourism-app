import { Component, OnDestroy, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ActivitiesService, ActivityDto, ActivityImageDto, ActivityTypeOption } from '../../../services/activities';
import { DestinationDto, DestinationService } from '../../../services/destination.service';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';
import { HERO_IMAGE_ROTATION_INTERVAL_MS } from '../../../shared/constants/hero-image-rotation';

interface ActivityInsightCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'amber';
}

interface ActivityFilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-content-creator-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SharedMapComponent],
  templateUrl: './activities.component.html',
  styleUrls: [
    './activities.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/cc-list-page-header.css',
    '../shared/cc-list-detail-layout.css',
    '../shared/cc-page-stats-scroll.css',
    '../shared/cc-stat-cards.css'
  ]
})
export class ContentCreatorActivitiesComponent implements OnInit, OnDestroy {
  private readonly activitiesService = inject(ActivitiesService);
  private readonly destinationService = inject(DestinationService);
  private readonly cdr = inject(ChangeDetectorRef);

  private static readonly DEFAULT_BANNER_URL = '/assets/pozadina.png';

  activities: ActivityDto[] = [];
  isLoading = true;
  errorMessage = '';
  selectedActivity: ActivityDto | null = null;
  selectedActivityDetails: ActivityDto | null = null;
  isDetailsLoading = false;

  heroImageUrls: string[] = [];
  currentHeroImageIndex = 0;
  private heroRotationTimerId: ReturnType<typeof setInterval> | null = null;

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
  sortBy = 'status';
  sortOrder: 'asc' | 'desc' = 'desc';
  filterPanelOpen = true;
  statsTotalCount: number | null = null;
  statsPendingCount: number | null = null;

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

  typeOptions: ActivityFilterOption[] = [];
  destinationOptions: ActivityFilterOption[] = [];

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadActivities();
  }

  ngOnDestroy(): void {
    this.stopHeroImageRotation();
  }

  /**
   * Same structure as content-creator events: summary KPI → current page → pipeline insight (blue → green → amber).
   */
  get insightCards(): ActivityInsightCard[] {
    return [
      {
        label: 'Total activities',
        value: this.statsTotalCount != null ? String(this.statsTotalCount) : '—',
        hint: 'Matching active filters',
        tone: 'blue',
      },
      {
        label: 'On this page',
        value: this.isLoading ? '—' : String(this.activities.length),
        hint: 'Visible rows',
        tone: 'green',
      },
      {
        label: 'Pending review',
        value: this.statsPendingCount != null ? String(this.statsPendingCount) : '—',
        hint: 'Matching active filters',
        tone: 'amber',
      },
    ];
  }

  loadActivities(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.loadActivityStats();

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
        this.activities = this.sortActivitiesLocally(response.items ?? []);
        this.totalCount = response.totalCount ?? 0;
        this.currentPage = response.page ?? this.currentPage;
        this.pageSize = response.pageSize ?? this.pageSize;
        this.totalPages = response.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));

        if (!this.selectedActivity || !this.activities.some((activity) => activity.id === this.selectedActivity?.id)) {
          this.setSelectedActivity(this.activities[0] ?? null);
        } else if (this.selectedActivity) {
          this.selectedActivityDetails = this.selectedActivity;
          this.loadSelectedActivityDetails(this.selectedActivity.id);
          this.loadHeroImagesForSelectedActivity();
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
        this.setSelectedActivity(null);
        this.statsTotalCount = null;
        this.statsPendingCount = null;
        this.isLoading = false;
      }
    });
  }

  private loadActivityStats(): void {
    const baseQuery = {
      search: this.searchQuery || undefined,
      type: this.typeFilter !== 'all' ? this.typeFilter : undefined,
      destination: this.destinationFilter !== 'all' ? this.destinationFilter : undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      startDate: this.rangeStartDate || undefined,
      endDate: this.rangeEndDate || undefined,
      page: 1,
      pageSize: 1
    };

    forkJoin({
      all: this.activitiesService.getMyActivities({
        ...baseQuery,
        status: undefined
      }),
      pending: this.activitiesService.getMyActivities({
        ...baseQuery,
        status: 'pending'
      })
    }).subscribe({
      next: ({ all, pending }) => {
        this.statsTotalCount = all.totalCount ?? 0;
        this.statsPendingCount = pending.totalCount ?? 0;
        this.cdr.detectChanges();
      },
      error: () => {
        this.statsTotalCount = null;
        this.statsPendingCount = null;
        this.cdr.detectChanges();
      }
    });
  }

  private sortActivitiesLocally(items: ActivityDto[]): ActivityDto[] {
    const direction = this.sortOrder === 'desc' ? -1 : 1;
    const normalizedSortBy = (this.sortBy ?? '').trim().toLowerCase();

    return [...items].sort((a, b) => {
      let result = 0;

      if (normalizedSortBy === 'status') {
        result = (a.status ?? '').localeCompare(b.status ?? '', undefined, { sensitivity: 'base' });
      } else if (normalizedSortBy === 'name') {
        result = (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
      } else if (normalizedSortBy === 'activitytypename') {
        result = (a.activityTypeName ?? '').localeCompare(b.activityTypeName ?? '', undefined, { sensitivity: 'base' });
      } else if (normalizedSortBy === 'durationminutes') {
        result = (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0);
      } else if (normalizedSortBy === 'createdat') {
        result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      if (result !== 0) {
        return result * direction;
      }

      return a.id - b.id;
    });
  }

  onSearch(): void {
    // Search is applied on every keyup.
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadActivities();
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onSearch();
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
    this.sortBy = 'status';
    this.sortOrder = 'desc';
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
    this.setSelectedActivity(activity);
  }

  getHeroSlideStyle(url: string): Record<string, string> {
    return { 'background-image': `url("${url}")` };
  }

  trackByHeroImage(index: number, url: string): string {
    return `${index}-${url}`;
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

  getActivityDestinationSubLabel(activity: ActivityDto): string {
    return activity.localityName || activity.objectName || activity.regionName || '—';
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

  get activitiesCountLabel(): string {
    if (this.isLoading) {
      return '…';
    }

    const count = this.totalCount;
    return `${count} activit${count === 1 ? 'y' : 'ies'}`;
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
    return this.getHeroFallbackUrl(this.selectedActivityDetails ?? this.selectedActivity);
  }

  get heroMediaFallbackStyle(): Record<string, string> {
    const url = this.selectedBanner;
    return url ? { 'background-image': `url("${url}")` } : {};
  }

  get hasSelectedActivityCoordinates(): boolean {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    return activity?.latitude != null && activity?.longitude != null;
  }

  get selectedActivityLat(): number {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    return activity?.latitude ?? 42.424;
  }

  get selectedActivityLng(): number {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    return activity?.longitude ?? 18.771;
  }

  get selectedActivityLocationLabel(): string {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    if (!activity) {
      return 'Selected activity';
    }

    const location = activity.localityName || activity.destinationName || activity.regionName || activity.objectName;
    return location ? `${activity.name} · ${location}` : activity.name;
  }

  private loadFilterOptions(): void {
    forkJoin({
      activityTypes: this.activitiesService.getActivityTypeOptions().pipe(catchError(() => of([] as ActivityTypeOption[]))),
      destinations: this.destinationService
        .getAll({
          page: 1,
          pageSize: 300,
          sortBy: 'name',
          sortOrder: 'asc'
        })
        .pipe(
          map((response: DestinationDto[] | { items?: DestinationDto[] }) => {
            return Array.isArray(response) ? response : (response.items ?? []);
          }),
          catchError(() => of([] as DestinationDto[]))
        )
    }).subscribe({
      next: ({ activityTypes, destinations }) => {
        this.typeOptions = this.toFilterOptions(activityTypes.map((type) => type.name));
        this.destinationOptions = this.toFilterOptions(destinations.map((destination) => destination.name));

        if (this.typeFilter !== 'all' && !this.typeOptions.some((option) => option.value === this.typeFilter)) {
          this.typeFilter = 'all';
        }

        if (
          this.destinationFilter !== 'all' &&
          !this.destinationOptions.some((option) => option.value === this.destinationFilter)
        ) {
          this.destinationFilter = 'all';
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.typeOptions = [];
        this.destinationOptions = [];
        this.cdr.detectChanges();
      }
    });
  }

  private setSelectedActivity(activity: ActivityDto | null): void {
    const previousId = this.selectedActivity?.id ?? null;
    this.selectedActivity = activity;

    if (!activity) {
      this.selectedActivityDetails = null;
      this.stopHeroImageRotation();
      this.heroImageUrls = [];
      this.currentHeroImageIndex = 0;
      return;
    }

    this.selectedActivityDetails = activity;
    this.loadHeroImagesForSelectedActivity();

    if (activity.id !== previousId) {
      this.loadSelectedActivityDetails(activity.id);
    }
  }

  private getHeroFallbackUrl(activity: ActivityDto | null): string {
    if (!activity) {
      return ContentCreatorActivitiesComponent.DEFAULT_BANNER_URL;
    }

    if (activity.mainImageUrl) {
      return this.normalizeImageUrl(activity.mainImageUrl);
    }

    return ContentCreatorActivitiesComponent.DEFAULT_BANNER_URL;
  }

  private loadHeroImagesForSelectedActivity(): void {
    this.stopHeroImageRotation();

    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    if (!activity) {
      this.heroImageUrls = [];
      this.currentHeroImageIndex = 0;
      return;
    }

    const fallbackUrl = this.getHeroFallbackUrl(activity);
    this.heroImageUrls = [fallbackUrl];
    this.currentHeroImageIndex = 0;
    this.cdr.detectChanges();

    this.activitiesService.getImages(activity.id).subscribe({
      next: (images: ActivityImageDto[]) => {
        const orderedUrls = (images ?? [])
          .slice()
          .sort((a, b) => Number(b.isMain) - Number(a.isMain))
          .map((image) => this.normalizeImageUrl(image.url))
          .filter((url): url is string => !!url);

        this.heroImageUrls = orderedUrls.length > 0 ? orderedUrls : [fallbackUrl];
        this.currentHeroImageIndex = 0;

        if (orderedUrls.length > 0 && this.selectedActivity && !this.selectedActivity.mainImageUrl) {
          const mainUrl = orderedUrls[0];
          this.selectedActivity = { ...this.selectedActivity, mainImageUrl: mainUrl };
          if (this.selectedActivityDetails && !this.selectedActivityDetails.mainImageUrl) {
            this.selectedActivityDetails = { ...this.selectedActivityDetails, mainImageUrl: mainUrl };
          }
          const idx = this.activities.findIndex((a) => a.id === this.selectedActivity?.id);
          if (idx >= 0) {
            this.activities[idx] = { ...this.activities[idx], mainImageUrl: mainUrl };
          }
        }

        if (this.heroImageUrls.length > 1) {
          this.startHeroImageRotation();
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.heroImageUrls = [fallbackUrl];
        this.currentHeroImageIndex = 0;
        this.cdr.detectChanges();
      }
    });
  }

  private startHeroImageRotation(): void {
    this.stopHeroImageRotation();

    this.heroRotationTimerId = setInterval(() => {
      if (this.heroImageUrls.length <= 1) {
        return;
      }

      this.currentHeroImageIndex =
        (this.currentHeroImageIndex + 1) % this.heroImageUrls.length;
      this.cdr.detectChanges();
    }, HERO_IMAGE_ROTATION_INTERVAL_MS);
  }

  private stopHeroImageRotation(): void {
    if (this.heroRotationTimerId != null) {
      clearInterval(this.heroRotationTimerId);
      this.heroRotationTimerId = null;
    }
  }

  private syncHeroFallbackAfterDetailsLoad(): void {
    const fallbackUrl = this.getHeroFallbackUrl(this.selectedActivityDetails ?? this.selectedActivity);

    if (!fallbackUrl) {
      return;
    }

    if (this.heroImageUrls.length === 0) {
      this.heroImageUrls = [fallbackUrl];
      return;
    }

    if (this.heroImageUrls.length === 1) {
      this.heroImageUrls = [fallbackUrl];
    }
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

  private toFilterOptions(values: Array<string | null | undefined>): ActivityFilterOption[] {
    const unique = new Map<string, ActivityFilterOption>();

    for (const rawValue of values) {
      const label = rawValue?.trim();
      if (!label) {
        continue;
      }

      const key = label.toLowerCase();
      if (!unique.has(key)) {
        unique.set(key, {
          value: label,
          label
        });
      }
    }

    return Array.from(unique.values()).sort((first, second) => first.label.localeCompare(second.label));
  }

  private loadSelectedActivityDetails(activityId: number): void {
    this.isDetailsLoading = true;
    this.selectedActivityDetails = this.selectedActivity;

    this.activitiesService.getById(activityId).subscribe({
      next: (activity) => {
        this.selectedActivityDetails = activity;
        this.isDetailsLoading = false;
        this.syncHeroFallbackAfterDetailsLoad();
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
