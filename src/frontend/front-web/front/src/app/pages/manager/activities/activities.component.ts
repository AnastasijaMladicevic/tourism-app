import { Component, OnInit, inject, ChangeDetectorRef, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import {
  ActivitiesService,
  ActivityDto,
  ActivityImageDto,
  ActivityTypeOption
} from '../../../services/activities';
import { DestinationService } from '../../../services/destination.service';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';
import { HERO_IMAGE_ROTATION_INTERVAL_MS } from '../../../shared/constants/hero-image-rotation';
import { TranslationService } from '../../../services/translation.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-manager-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SharedMapComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './activities.component.html',
  styleUrls: [
    './activities.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/manager-list-page-header.css',
    '../shared/manager-list-page-responsive.css',
    '../shared/manager-cc-page-parity.css',
    '../shared/manager-list-detail-layout.css',
    '../shared/manager-page-stats-scroll.css',
    '../shared/manager-stat-cards.css',
    '../shared/manager-hero-slides.css'
  ]
})
export class ManagerActivitiesComponent implements OnInit {
  private readonly activitiesService = inject(ActivitiesService);
  private readonly destinationService = inject(DestinationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly translationService = inject(TranslationService);

  private static readonly DEFAULT_BANNER_URL = '/assets/pozadina.png';

  activities: ActivityDto[] = [];
  heroImageUrls: string[] = [];
  currentHeroImageIndex = 0;
  private heroRotationTimerId: ReturnType<typeof setInterval> | null = null;
  /** Destination name(s) the manager oversees — same source as manager Objects page. */
  managedCityLabel = '';
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
  sortBy = 'status';
  sortOrder: 'asc' | 'desc' = 'desc';
  filterPanelOpen = true;

  activityTypeOptions: ActivityTypeOption[] = [];
  isLoadingTypes = true;

  /** From dedicated lightweight manager queries (pageSize 1); not derived from mocks. */
  statsTotalAllStatuses: number | null = null;
  statsPendingCount: number | null = null;

  readonly statusOptions = [
    { value: 'all', label: 'manager.activities.filters.allStatuses' },
    { value: 'pending', label: 'manager.activities.status.pending' },
    { value: 'approved', label: 'manager.activities.status.approved' },
    { value: 'rejected', label: 'manager.activities.status.rejected' }
  ];

  readonly sortByOptions = [
    { value: 'name', label: 'manager.activities.filters.name' },
    { value: 'price', label: 'activity.participationFee' },
    { value: 'durationMinutes', label: 'manager.activities.duration' },
    { value: 'status', label: 'manager.activities.filters.status' },
    { value: 'createdAt', label: 'manager.activities.filters.createdDate' }
  ];

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.stopHeroImageRotation());
    this.loadManagedCityLabel();
    this.loadActivityTypes();
    this.loadActivities();
  }

  private loadManagedCityLabel(): void {
    this.destinationService
      .getAll({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })
      .subscribe({
        next: (response: unknown) => {
          const list = Array.isArray(response) ? response : (response as { items?: unknown[] })?.items ?? [];
          const destinations = list as Array<{ name?: string }>;

          const cityNames = [
            ...new Set(
              destinations
                .map((d) => d.name?.trim())
                .filter((n): n is string => !!n)
            )
          ].sort((a, b) => a.localeCompare(b));

          this.managedCityLabel = cityNames.join(', ') || this.translationService.translate('common.notAvailable');
          this.cdr.detectChanges();
        },
        error: () => {
          this.managedCityLabel = this.translationService.translate('common.notAvailable');
          this.cdr.detectChanges();
        }
      });
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
    this.loadActivityStats();

    this.activitiesService.getForManager({
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.searchQuery || undefined,
      status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
      sortBy: this.sortBy,
      sortOrder: this.sortOrder,
      type: this.getManagerActivityTypeSearchToken()
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          let items = response.items ?? [];

          items = this.sortActivitiesLocally(items);

          this.activities = items;
          this.totalCount = response.totalCount ?? items.length;
          this.currentPage = response.page ?? this.currentPage;
          this.pageSize = response.pageSize ?? this.pageSize;
          this.totalPages = response.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));

          const nextSelected =
            !this.selectedActivity ||
            !this.activities.some((activity) => activity.id === this.selectedActivity?.id)
              ? this.activities[0] ?? null
              : this.selectedActivity;
          this.setSelectedActivity(nextSelected);

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? this.translationService.translate('manager.activities.error.load');
          this.activities = [];
          this.totalCount = 0;
          this.totalPages = 1;
          this.setSelectedActivity(null);
          this.statsTotalAllStatuses = null;
          this.statsPendingCount = null;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /** Totals for stat cards: same search/sort as the table, but status breakdown from BE counts. */
  private loadActivityStats(): void {
    const search = this.searchQuery.trim() || undefined;
    const type = this.getManagerActivityTypeSearchToken();

    forkJoin({
      all: this.activitiesService.getForManager({
        page: 1,
        pageSize: 1,
        search,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        type
      }),
      pending: this.activitiesService.getForManager({
        page: 1,
        pageSize: 1,
        search,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder,
        status: 'pending',
        type
      })
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ all, pending }) => {
          this.statsTotalAllStatuses = all.totalCount ?? 0;
          this.statsPendingCount = pending.totalCount ?? 0;
          this.cdr.detectChanges();
        },
        error: () => {
          this.statsTotalAllStatuses = null;
          this.statsPendingCount = null;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Backend filters by activity type name (case-insensitive substring). Uses the selected filter option name when set.
   */
  private getManagerActivityTypeSearchToken(): string | undefined {
    if (this.typeFilter === 'all') {
      return undefined;
    }

    const typeId = Number(this.typeFilter);
    if (!Number.isFinite(typeId)) {
      return undefined;
    }

    const option = this.activityTypeOptions.find((t) => t.id === typeId);
    const name = option?.name?.trim();
    return name || undefined;
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
      } else if (normalizedSortBy === 'price') {
        result = (a.price ?? 0) - (b.price ?? 0);
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
    this.sortBy = 'status';
    this.sortOrder = 'desc';
    this.currentPage = 1;
    this.loadActivities();
  }

  onFilterChange(): void {
    // Filters are applied explicitly via the panel's Apply button.
  }

  onGoToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadActivities();
    }
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

  private setSelectedActivity(activity: ActivityDto | null): void {
    const previousId = this.selectedActivity?.id ?? null;
    this.selectedActivity = activity;
    this.selectedActivityDetails = activity;

    if (!activity) {
      this.stopHeroImageRotation();
      this.heroImageUrls = [];
      this.currentHeroImageIndex = 0;
      return;
    }

    if (activity.id !== previousId) {
      this.loadHeroImagesForSelectedActivity();
      this.loadSelectedActivityDetails(activity.id);
    }
  }

  private loadHeroImagesForSelectedActivity(): void {
    this.stopHeroImageRotation();
    this.heroImageUrls = [];
    this.currentHeroImageIndex = 0;

    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    if (!activity) {
      return;
    }

    const fallbackUrl = this.getHeroFallbackUrl(activity);

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

  private getHeroFallbackUrl(activity: ActivityDto | null): string {
    if (!activity) {
      return ManagerActivitiesComponent.DEFAULT_BANNER_URL;
    }

    const normalized = this.normalizeImageUrl(activity.mainImageUrl);
    return normalized || ManagerActivitiesComponent.DEFAULT_BANNER_URL;
  }

  getHeroSlideStyle(url: string): Record<string, string> {
    return { 'background-image': `url("${url}")` };
  }

  trackByHeroImage(index: number, url: string): string {
    return `${index}-${url}`;
  }

  private normalizeImageUrl(value?: string | null): string {
    const trimmed = value?.trim();
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

  onReviewActivity(activity: ActivityDto): void {
    this.router.navigate(['/manager/activities/review', activity.id]);
  }

  trackByActivityId(_: number, activity: ActivityDto): number {
    return activity.id;
  }

  formatDuration(minutes?: number): string {
    if (!minutes || minutes <= 0) {
      return this.translationService.translate('common.notAvailable');
    }

    if (minutes < 60) {
      return this.translationService.translate('manager.activities.durationMinutes', { count: minutes });
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return this.translationService.translate(hours === 1 ? 'manager.activities.oneHour' : 'manager.activities.hours', { count: hours });
    }

    return this.translationService.translate('manager.activities.hoursMinutes', {
      hours,
      minutes: remainingMinutes
    });
  }

  formatParticipationFee(price?: number | null): string {
    if (price == null) {
      return this.translationService.translate('common.free');
    }

    return `$${Number(price).toFixed(2)}`;
  }

  getActivityLocation(activity: ActivityDto): string {
    return activity.destinationName || activity.localityName || activity.objectName || activity.regionName || this.translationService.translate('common.notAvailable');
  }

  getActivityLocalityLabel(activity: ActivityDto): string {
    return activity.localityName || activity.objectName || activity.destinationName || this.translationService.translate('common.notAvailable');
  }

  getActivityLocalitySubLabel(activity: ActivityDto): string {
    return activity.destinationName || activity.regionName || this.managedCityLabel || this.translationService.translate('common.notAvailable');
  }

  getStatusLabel(status?: string): string {
    const normalized = (status ?? '').trim().toLowerCase();
    if (normalized === 'approved') return this.translationService.translate('manager.activities.status.approved');
    if (normalized === 'rejected') return this.translationService.translate('manager.activities.status.rejected');
    return this.translationService.translate('manager.activities.status.pending');
  }

  getStatusClass(status?: string): string {
    const normalized = (status ?? '').trim().toLowerCase();
    if (normalized === 'approved') return 'status-published';
    if (normalized === 'rejected') return 'status-archived';
    return 'status-pending';
  }

  get activitiesCountLabel(): string {
    if (this.isLoading) {
      return '…';
    }

    return this.translationService.translate('manager.activities.totalCount', { count: this.totalCount });
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
      return this.translationService.translate('manager.activities.noDescription');
    }

    return activity.description;
  }

  get selectedCategory(): string {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;
    return activity?.activityTypeName || this.translationService.translate('layout.activities');
  }

  get selectedLocation(): string {
    const activity = this.selectedActivityDetails ?? this.selectedActivity;

    if (!activity) {
      return this.translationService.translate('common.notAvailable');
    }

    return activity.destinationName || activity.localityName || activity.objectName || activity.regionName || this.translationService.translate('common.notAvailable');
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
      return this.translationService.translate('manager.activities.selectedActivity');
    }

    const location = activity.localityName || activity.destinationName || activity.regionName;
    return location ? `${activity.name} · ${location}` : activity.name;
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
