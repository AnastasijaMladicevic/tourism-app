import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { DestinationService } from '../../../services/destination.service';
import { FilterOption, ObjectDto, ObjectImageDto, ObjectService } from '../../../services/object';
import { ReviewDto, ReviewService } from '../../../services/review';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';
import { mapReviewDtosToObjectThreads } from '../shared/manager-object-review.mapper';
import {
  isConcerningCreatorReply,
  ManagerObjectReviewThread,
} from '../shared/manager-object-review.mock';
import { HERO_IMAGE_ROTATION_INTERVAL_MS } from '../../../shared/constants/hero-image-rotation';

interface WorkingHoursRow {
  day: string;
  open: string;
  close: string;
}

@Component({
  selector: 'app-manager-objects',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent, RouterLink],
  templateUrl: './objects.component.html',
  styleUrls: [
    './objects.component.css',
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
export class ManagerObjectsComponent implements OnInit, OnDestroy {
  private readonly objectService = inject(ObjectService);
  private readonly destinationService = inject(DestinationService);
  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  private static readonly DEFAULT_BANNER_URL = '/assets/pozadina.png';

  pagedObjects: ObjectDto[] = [];
  selectedObject: ObjectDto | null = null;
  heroImageUrls: string[] = [];
  currentHeroImageIndex = 0;
  private heroRotationTimerId: ReturnType<typeof setInterval> | null = null;
  selectedObjectReviews: ManagerObjectReviewThread[] = [];
  reviewsLoading = false;
  private reviewsRequestToken = 0;

  /** Destination name(s) the manager oversees - cities/towns (not region/country). */
  managedCityLabel = '';

  isLoading = true;
  errorMessage = '';

  draftSearchQuery = '';
  searchQuery = '';
  statusFilter = 'all';
  typeFilter = 'all';
  ratingFilter = 'all';
  /** Secondary column for ordering within the same status group (pending is always listed first). */
  sortBy = 'status';
  sortOrder: 'asc' | 'desc' = 'desc';
  filterPanelOpen = true;

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 1;
  readonly pageSizeOptions = [5, 10, 20, 50];

  readonly sortByOptions = [
    { value: 'name', label: 'Name' },
    { value: 'averageRating', label: 'Rating' },
    { value: 'status', label: 'Status' }
  ];

  readonly ratingOptions = [
    { value: 'all', label: 'Any rating' },
    { value: '1', label: '1.0+' },
    { value: '2', label: '2.0+' },
    { value: '3', label: '3.0+' },
    { value: '3.5', label: '3.5+' },
    { value: '4', label: '4.0+' },
    { value: '4.5', label: '4.5+' }
  ];

  private readonly fallbackStatusOptions: FilterOption[] = [
    { value: 'Approved', label: 'Approved' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Rejected', label: 'Rejected' }
  ];

  statusOptions: FilterOption[] = [...this.fallbackStatusOptions];
  typeOptions: FilterOption[] = [];

  ngOnInit(): void {
    this.loadManagedCityLabel();
    this.loadFilterOptions();
    this.loadObjects();
  }

  ngOnDestroy(): void {
    this.stopHeroImageRotation();
  }

  loadManagedCityLabel(): void {
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

          this.managedCityLabel = cityNames.join(', ') || '-';
          this.cdr.detectChanges();
        },
        error: () => {
          this.managedCityLabel = '-';
          this.cdr.detectChanges();
        }
      });
  }

  loadObjects(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.objectService
      .getForManager({
        page: this.currentPage,
        pageSize: this.pageSize,
        search: this.searchQuery || undefined,
        status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
        type: this.typeFilter !== 'all' ? this.typeFilter : undefined,
        minRating: this.getMinRatingFromFilter(this.ratingFilter),
        sortBy: this.sortBy,
        sortOrder: this.sortOrder
      })
      .subscribe({
        next: (response) => {
          const items = response?.items ?? [];
          const sorted = this.sortManagerTableRows(items);
          this.pagedObjects = sorted;
          this.totalCount = response?.totalCount ?? 0;
          this.currentPage = response?.page ?? this.currentPage;
          this.pageSize = response?.pageSize ?? this.pageSize;
          this.totalPages = response?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));

          const nextSelected =
            !this.selectedObject || !sorted.some((item) => item.id === this.selectedObject?.id)
              ? sorted[0] ?? null
              : this.selectedObject;
          this.setSelectedObject(nextSelected);

          this.loadSelectedObjectReviews();
          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Failed to load objects';
          this.pagedObjects = [];
          this.setSelectedObject(null);
          this.selectedObjectReviews = [];
          this.totalCount = 0;
          this.totalPages = 1;
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadFilterOptions(): void {
    this.objectService.getManagerFilterOptions().subscribe({
      next: ({ typeOptions, statusOptions }) => {
        this.typeOptions = typeOptions;
        this.statusOptions = statusOptions.length > 0 ? statusOptions : [...this.fallbackStatusOptions];

        if (this.typeFilter !== 'all' && !this.typeOptions.some((option) => option.value === this.typeFilter)) {
          this.typeFilter = 'all';
        }

        if (this.statusFilter !== 'all' && !this.statusOptions.some((option) => option.value === this.statusFilter)) {
          this.statusFilter = 'all';
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.typeOptions = [];
        this.statusOptions = [...this.fallbackStatusOptions];
      }
    });
  }

  get averageRatingDisplay(): string {
    if (!this.pagedObjects.length) {
      return '0.0';
    }

    const total = this.pagedObjects.reduce((sum, item) => sum + (item.averageRating ?? 0), 0);
    return (total / this.pagedObjects.length).toFixed(1);
  }

  get objectsCountLabel(): string {
    if (this.isLoading) {
      return '...';
    }

    const count = this.totalCount;
    return `${count} objects`;
  }

  get pageStart(): number {
    if (!this.totalCount || !this.pagedObjects.length) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.pageStart + this.pagedObjects.length - 1;
  }

  onApplyFilters(): void {
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadObjects();
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.draftSearchQuery = '';
    this.statusFilter = 'all';
    this.typeFilter = 'all';
    this.ratingFilter = 'all';
    this.sortBy = 'status';
    this.sortOrder = 'desc';
    this.currentPage = 1;
    this.loadObjects();
  }

  /** Pending first, then approved, then rejected - then user's secondary sort (within each status group). */
  private sortManagerTableRows(items: ObjectDto[]): ObjectDto[] {
    return [...items].sort((a, b) => {
      const primary = this.managerStatusRank(a.status) - this.managerStatusRank(b.status);
      if (primary !== 0) {
        return primary;
      }
      return this.compareManagerSecondarySort(a, b);
    });
  }

  private managerStatusRank(status?: string): number {
    switch ((status ?? '').toLowerCase()) {
      case 'pending':
        return 0;
      case 'approved':
        return 1;
      case 'rejected':
        return 2;
      default:
        return 3;
    }
  }

  private compareManagerSecondarySort(a: ObjectDto, b: ObjectDto): number {
    const dir = this.sortOrder === 'desc' ? -1 : 1;

    switch (this.sortBy) {
      case 'averageRating': {
        const diff = (a.averageRating ?? 0) - (b.averageRating ?? 0);
        if (diff !== 0) {
          return diff * dir;
        }
        break;
      }
      case 'status': {
        const diff =
          (a.status ?? '').localeCompare(b.status ?? '', undefined, { sensitivity: 'base' }) * dir;
        if (diff !== 0) {
          return diff;
        }
        break;
      }
      case 'name':
      default: {
        const diff = (a.name ?? '').localeCompare(b.name ?? '', undefined, { sensitivity: 'base' });
        if (diff !== 0) {
          return diff * dir;
        }
        break;
      }
    }

    return a.id - b.id;
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onApplyFilters();
  }

  onNextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }

    this.currentPage++;
    this.loadObjects();
  }

  onPreviousPage(): void {
    if (this.currentPage <= 1) {
      return;
    }

    this.currentPage--;
    this.loadObjects();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadObjects();
  }

  selectObject(obj: ObjectDto): void {
    this.setSelectedObject(obj);
    this.loadSelectedObjectReviews();
  }

  private setSelectedObject(object: ObjectDto | null): void {
    const previousId = this.selectedObject?.id ?? null;
    this.selectedObject = object;

    if (!object) {
      this.stopHeroImageRotation();
      this.heroImageUrls = [];
      this.currentHeroImageIndex = 0;
      return;
    }

    if (object.id !== previousId) {
      this.loadHeroImagesForSelectedObject();
    }
  }

  private loadHeroImagesForSelectedObject(): void {
    this.stopHeroImageRotation();
    this.heroImageUrls = [];
    this.currentHeroImageIndex = 0;

    if (!this.selectedObject) {
      return;
    }

    const fallbackUrl = this.getHeroFallbackUrl(this.selectedObject);

    this.objectService.getImages(this.selectedObject.id).subscribe({
      next: (images: ObjectImageDto[]) => {
        const orderedUrls = (images ?? [])
          .slice()
          .sort((a, b) => Number(b.isMain) - Number(a.isMain))
          .map((image) => this.normalizeImageUrl(image.url))
          .filter((url): url is string => !!url);

        this.heroImageUrls = orderedUrls.length > 0 ? orderedUrls : [fallbackUrl];
        this.currentHeroImageIndex = 0;

        // Backfill mainImageUrl in the list row if the list endpoint didn't return it
        if (orderedUrls.length > 0 && this.selectedObject && !this.selectedObject.mainImageUrl) {
          const mainUrl = orderedUrls[0];
          this.selectedObject = { ...this.selectedObject, mainImageUrl: mainUrl };
          const idx = this.pagedObjects.findIndex((o) => o.id === this.selectedObject?.id);
          if (idx >= 0) {
            this.pagedObjects[idx] = { ...this.pagedObjects[idx], mainImageUrl: mainUrl };
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

  private getHeroFallbackUrl(object: ObjectDto | null): string {
    const normalized = this.normalizeImageUrl(object?.mainImageUrl);
    return normalized || ManagerObjectsComponent.DEFAULT_BANNER_URL;
  }

  getHeroSlideStyle(url: string): Record<string, string> {
    return { 'background-image': `url("${url}")` };
  }

  trackByHeroImage(index: number, url: string): string {
    return `${index}-${url}`;
  }

  private loadSelectedObjectReviews(): void {
    const object = this.selectedObject;
    if (!object?.id) {
      this.selectedObjectReviews = [];
      this.reviewsLoading = false;
      return;
    }

    const token = ++this.reviewsRequestToken;
    this.reviewsLoading = true;
    const creatorId = object.createdByUserId ?? 0;
    const creatorName = 'Content Creator';

    this.reviewService
      .getAll({ objectId: object.id, sortBy: 'createdAt', sortOrder: 'desc', pageSize: 100 })
      .pipe(
        catchError(() => of({ items: [] as ReviewDto[], page: 1, pageSize: 0, totalCount: 0, totalPages: 1 })),
        finalize(() => {
          if (token === this.reviewsRequestToken) {
            this.reviewsLoading = false;
            this.cdr.detectChanges();
          }
        })
      )
      .subscribe((response) => {
        if (token !== this.reviewsRequestToken) {
          return;
        }

        this.selectedObjectReviews = mapReviewDtosToObjectThreads(response.items ?? [], creatorId, creatorName);
        this.cdr.detectChanges();
      });
  }

  trackByObjectId(_: number, obj: ObjectDto): number {
    return obj.id;
  }

  getStatusBadgeClass(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'published':
      case 'approved':
        return 'published';
      case 'rejected':
      case 'cancelled':
        return 'rejected';
      case 'draft':
      case 'pending':
        return 'draft';
      default:
        return 'draft';
    }
  }

  /** Sidebar pill styles - matches manager Activities .detail-status palette. */
  getObjectDetailStatusClass(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'published':
      case 'approved':
        return 'status-published';
      case 'pending':
        return 'status-pending';
      case 'rejected':
      case 'cancelled':
        return 'status-archived';
      case 'draft':
        return 'status-draft';
      default:
        return 'status-pending';
    }
  }

  formatStatus(status?: string): string {
    return this.statusLabel(status);
  }

  getMediaStyle(object: ObjectDto): Record<string, string> {
    const image = this.normalizeImageUrl(object.mainImageUrl);
    if (!image) {
      return {};
    }

    return { 'background-image': `url("${image}")` };
  }

  formatPrice(price?: number | null): string {
    if (price == null) {
      return 'Not available';
    }

    return `$${Number(price).toFixed(2)}`;
  }

  getWorkingHoursRows(workingHours?: string | null): WorkingHoursRow[] {
    const raw = workingHours?.trim();
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') {
        return [];
      }

      const dayOrder = ['pon', 'uto', 'sre', 'cet', '\u010det', 'pet', 'sub', 'ned'] as const;
      const dayLabels: Record<string, string> = {
        pon: 'Mon',
        uto: 'Tue',
        sre: 'Wed',
        cet: 'Thu',
        '\u010det': 'Thu',
        pet: 'Fri',
        sub: 'Sat',
        ned: 'Sun'
      };

      return dayOrder
        .map((dayKey) => {
          const value = parsed[dayKey];
          if (typeof value !== 'string' || !value.trim()) {
            return null;
          }

          const normalized = value.replace(/\s+/g, '');
          const splitIndex = normalized.indexOf('-');
          if (splitIndex < 0) {
            return null;
          }

          const open = normalized.slice(0, splitIndex);
          const close = normalized.slice(splitIndex + 1);

          if (!open || !close) {
            return null;
          }

          return {
            day: dayLabels[dayKey],
            open,
            close
          };
        })
        .filter((row): row is WorkingHoursRow => !!row);
    } catch {
      return [];
    }
  }

  get hasSelectedObjectCoordinates(): boolean {
    return this.selectedObject?.latitude != null && this.selectedObject?.longitude != null;
  }

  get selectedObjectLat(): number {
    return this.selectedObject?.latitude ?? 42.424;
  }

  get selectedObjectLng(): number {
    return this.selectedObject?.longitude ?? 18.771;
  }

  get selectedObjectLocationLabel(): string {
    if (!this.selectedObject) {
      return 'Selected object';
    }

    const location =
      this.selectedObject.localityName || this.selectedObject.destinationName || this.selectedObject.regionName;
    return location ? `${this.selectedObject.name} - ${location}` : this.selectedObject.name;
  }

  destinationCellText(obj: ObjectDto): string {
    return obj.localityName || obj.destinationName || '-';
  }

  onRowAction(obj: ObjectDto, event: Event): void {
    event.stopPropagation();
    this.router.navigate(['/manager/objects/review', obj.id]);
  }

  onOpenSelectedObjectReview(): void {
    if (!this.selectedObject) {
      return;
    }

    this.router.navigate(['/manager/objects/review', this.selectedObject.id]);
  }

  get selectedObjectReviewsPreview(): ManagerObjectReviewThread[] {
    return this.selectedObjectReviews.slice(0, 2);
  }

  get showSelectedObjectReviewLink(): boolean {
    return this.selectedObjectReviews.length > this.selectedObjectReviewsPreview.length;
  }

  get concerningReportThread(): ManagerObjectReviewThread | null {
    return this.selectedObjectReviews.find((thread) => isConcerningCreatorReply(thread)) ?? null;
  }

  isConcerningReply(thread: ManagerObjectReviewThread): boolean {
    return isConcerningCreatorReply(thread);
  }

  formatReviewDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  ratingStars(rating: number): string {
    return '\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating);
  }

  reportCreatorQuery(thread: ManagerObjectReviewThread): Record<string, string> {
    return { creatorId: String(thread.creatorId) };
  }

  private getMinRatingFromFilter(value: string): number | undefined {
    if (value === 'all') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  statusOptionLabel(option: FilterOption): string {
    return this.statusLabel(option.value || option.label);
  }

  private statusLabel(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'approved':
      case 'published':
        return 'Approved';
      case 'pending':
      case 'draft':
        return 'Pending';
      case 'rejected':
      case 'cancelled':
        return 'Rejected';
      default:
        return status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Pending';
    }
  }

  private normalizeImageUrl(value?: string): string {
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
}
