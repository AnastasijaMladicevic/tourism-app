import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator';
import {
  FilterOption,
  getObjectPriceLabelKey,
  getObjectPriceMode,
  ObjectDto,
  ObjectImageDto,
  ObjectService
} from '../../../services/object';
import { TranslationService } from '../../../services/translation.service';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';
import { ReviewDto, ReviewService } from '../../../services/review';
import { HERO_IMAGE_ROTATION_INTERVAL_MS } from '../../../shared/constants/hero-image-rotation';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

interface WorkingHoursRow {
  day: string;
  open: string;
  close: string;
}

interface ObjectFilterOption {
  value: string;
  label?: string;
  labelKey?: string;
}

@Component({
  selector: 'app-content-creator-objects',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './objects.component.html',
  styleUrls: [
    './objects.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/cc-list-page-header.css',
    '../shared/cc-list-detail-layout.css',
    '../shared/cc-page-stats-scroll.css',
    '../shared/cc-stat-cards.css'
  ]
})
export class ContentCreatorObjectsComponent implements OnInit, OnDestroy {
  private readonly objectService = inject(ObjectService);
  private readonly reviewService = inject(ReviewService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  private static readonly DEFAULT_BANNER_URL = '/assets/pozadina.png';
  private static readonly PREVIEW_REVIEWS_LIMIT = 3;

  objects: ObjectDto[] = [];
  pagedObjects: ObjectDto[] = [];
  selectedObject: ObjectDto | null = null;

  heroImageUrls: string[] = [];
  currentHeroImageIndex = 0;
  private heroRotationTimerId: ReturnType<typeof setInterval> | null = null;
  previewReviews: ReviewDto[] = [];
  isLoadingPreviewReviews = false;

  isLoading = true;
  errorMessage = '';

  draftSearchQuery = '';
  searchQuery = '';
  statusFilter = 'all';
  typeFilter = 'all';
  ratingFilter = 'all';
  sortBy = 'status';
  sortOrder: 'asc' | 'desc' = 'desc';
  filterPanelOpen = true;

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 1;
  readonly pageSizeOptions = [5, 10, 20, 50];

  readonly sortByOptions = [
    { value: 'name', labelKey: 'contentCreator.objects.filters.name' },
    { value: 'averageRating', labelKey: 'contentCreator.objects.filters.rating' },
    { value: 'status', labelKey: 'contentCreator.objects.filters.status' },
    { value: 'createdAt', labelKey: 'contentCreator.objects.filters.createdDate' }
  ];

  readonly ratingOptions = [
    { value: 'all', labelKey: 'contentCreator.objects.filters.anyRating' },
    { value: '1', label: '1.0+' },
    { value: '2', label: '2.0+' },
    { value: '3', label: '3.0+' },
    { value: '3.5', label: '3.5+' },
    { value: '4', label: '4.0+' },
    { value: '4.5', label: '4.5+' }
  ];

  private readonly fallbackStatusOptions: ObjectFilterOption[] = [
    { value: 'published', labelKey: 'contentCreator.objects.status.published' },
    { value: 'approved', labelKey: 'contentCreator.objects.status.approved' },
    { value: 'pending', labelKey: 'contentCreator.objects.status.pending' },
    { value: 'draft', labelKey: 'contentCreator.objects.status.draft' },
    { value: 'rejected', labelKey: 'contentCreator.objects.status.rejected' }
  ];

  statusOptions: ObjectFilterOption[] = [...this.fallbackStatusOptions];
  typeOptions: FilterOption[] = [];

  translateOptionLabel(option: { label?: string; labelKey?: string }): string {
    if (option.labelKey) {
      return this.translationService.translate(option.labelKey);
    }

    return option.label ?? '';
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadObjects();
  }

  ngOnDestroy(): void {
    this.stopHeroImageRotation();
  }

  loadObjects(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.objectService.getMy({
      page: this.currentPage,
      pageSize: this.pageSize,
      search: this.searchQuery || undefined,
      status: this.statusFilter !== 'all' ? this.statusFilter : undefined,
      type: this.typeFilter !== 'all' ? this.typeFilter : undefined,
      minRating: this.getMinRatingFromFilter(this.ratingFilter),
      sortBy: this.sortBy,
      sortOrder: this.sortOrder
    }, { bypassRegion: true }).subscribe({
      next: (response) => {
        const items = response?.items ?? [];
        this.objects = items;
        this.pagedObjects = items;
        this.totalCount = response?.totalCount ?? 0;
        this.currentPage = response?.page ?? this.currentPage;
        this.pageSize = response?.pageSize ?? this.pageSize;
        this.totalPages = response?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));

        if (!this.selectedObject || !items.some((item) => item.id === this.selectedObject?.id)) {
          this.setSelectedObject(items[0] ?? null);
        } else {
          this.loadPreviewReviews();
        }

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? this.translationService.translate('contentCreator.objects.error.load');
        this.objects = [];
        this.pagedObjects = [];
        this.setSelectedObject(null);
        this.totalCount = 0;
        this.totalPages = 1;
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onApplyFilters(): void {
    this.searchQuery = this.draftSearchQuery.trim();
    this.currentPage = 1;
    this.loadObjects();
  }

  onFilterChange(): void {
    // Filters are applied explicitly through Apply Filters.
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

  onGoToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadObjects();
    }
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadObjects();
  }

  onCreateObject(): void {
    this.router.navigate(['/content-creator/objects/create']);
  }

  onEditObject(object: ObjectDto): void {
    this.router.navigate(['/content-creator/objects/edit', object.id]);
  }

  selectObject(object: ObjectDto): void {
    this.setSelectedObject(object);
  }

  getHeroSlideStyle(url: string): Record<string, string> {
    return { 'background-image': `url("${url}")` };
  }

  trackByHeroImage(index: number, url: string): string {
    return `${index}-${url}`;
  }

  trackByObjectId(_: number, object: ObjectDto): number {
    return object.id;
  }

  trackByReviewId(_: number, review: ReviewDto): number {
    return review.id;
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

  getMediaStyle(object: ObjectDto): Record<string, string> {
    const image = this.normalizeImageUrl(object.mainImageUrl);
    if (!image) {
      return {};
    }

    return { 'background-image': `url("${image}")` };
  }

  /** Location line below the title (venue/locality · destination). */
  getSidebarMetaLine(object: ObjectDto): string {
    const addr = object.address?.trim();
    const locality = object.localityName?.trim();
    const destination = object.destinationName?.trim();
    const region = object.regionName?.trim();

    if (addr && destination) {
      return `${addr} · ${destination}`;
    }
    if (addr && locality) {
      return `${addr} · ${locality}`;
    }
    if (locality && destination && locality !== destination) {
      return `${locality} · ${destination}`;
    }
    if (destination && region && destination !== region) {
      return `${destination} · ${region}`;
    }

    return addr || locality || destination || region || this.translationService.translate('common.notAvailable');
  }

  get objectsCountLabel(): string {
    if (this.isLoading) {
      return '…';
    }

    return this.translationService.translate('contentCreator.objects.totalCount', { count: this.totalCount });
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

  formatStatus(status?: string): string {
    if (!status) {
      return this.translationService.translate('contentCreator.objects.status.draft');
    }
    const normalized = status.trim().toLowerCase();
    const translated = this.translationService.translate(`contentCreator.objects.status.${normalized}`);
    return translated === `contentCreator.objects.status.${normalized}`
      ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
      : translated;
  }

  /** Secondary line under destination (matches activities location column). */
  getObjectTableSubline(object: ObjectDto): string {
    if (object.destinationName && object.localityName) {
      return object.localityName;
    }
    if (object.regionName) {
      return object.regionName;
    }
    return this.translationService.translate('common.notAvailable');
  }

  formatPrice(price?: number | null, typeName?: string | null): string {
    const mode = getObjectPriceMode(typeName);
    if (mode === 'hidden') {
      return this.translationService.translate('common.notApplicable');
    }

    if (price == null) {
      return this.translationService.translate('common.notSet');
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

      const dayOrder = ['pon', 'uto', 'sre', 'cet', 'čet', 'pet', 'sub', 'ned'] as const;
      const dayLabels: Record<string, string> = {
        pon: this.translationService.translate('contentCreatorObjectForm.dayShort.monday'),
        uto: this.translationService.translate('contentCreatorObjectForm.dayShort.tuesday'),
        sre: this.translationService.translate('contentCreatorObjectForm.dayShort.wednesday'),
        cet: this.translationService.translate('contentCreatorObjectForm.dayShort.thursday'),
        'čet': this.translationService.translate('contentCreatorObjectForm.dayShort.thursday'),
        pet: this.translationService.translate('contentCreatorObjectForm.dayShort.friday'),
        sub: this.translationService.translate('contentCreatorObjectForm.dayShort.saturday'),
        ned: this.translationService.translate('contentCreatorObjectForm.dayShort.sunday')
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

  get averageRatingDisplay(): string {
    if (!this.pagedObjects.length) {
      return '0.0';
    }

    const total = this.pagedObjects.reduce((sum, item) => sum + (item.averageRating ?? 0), 0);
    return (total / this.pagedObjects.length).toFixed(1);
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
      return this.translationService.translate('contentCreator.objects.selectedObject');
    }

    const location = this.selectedObject.localityName || this.selectedObject.destinationName || this.selectedObject.regionName;
    return location ? `${this.selectedObject.name} · ${location}` : this.selectedObject.name;
  }

  get hasPreviewReviews(): boolean {
    return this.previewReviews.length > 0;
  }

  get selectedObjectPriceLabel(): string {
    return this.translationService.translate(getObjectPriceLabelKey(this.selectedObject?.objectTypeName));
  }

  get showViewMoreReviews(): boolean {
    const total = this.selectedObject?.reviewCount ?? this.previewReviews.length;
    return this.previewReviews.length > 0 && total > this.previewReviews.length;
  }

  get previewReviewsCountLabel(): string {
    const total = this.selectedObject?.reviewCount ?? this.previewReviews.length;
    if (total > this.previewReviews.length) {
      return this.translationService.translate('contentCreatorObjectForm.reviews.showingOf', {
        shown: this.previewReviews.length,
        total,
      });
    }

    return this.translationService.translate('contentCreatorObjectForm.reviews.count', {
      count: this.previewReviews.length,
    });
  }

  getReviewInitials(review: ReviewDto): string {
    const fullName = review.userFullName?.trim();
    if (!fullName) {
      return this.translationService.translate('common.userFallbackInitial');
    }

    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return parts[0].slice(0, 1).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  getReviewTimeAgo(value?: string): string {
    if (!value) {
      return '';
    }

    const createdAt = new Date(value).getTime();
    if (!Number.isFinite(createdAt)) {
      return '';
    }

    const minutes = Math.max(0, Math.floor((Date.now() - createdAt) / 60000));
    if (minutes < 1) {
      return this.translationService.translate('common.time.justNow');
    }
    if (minutes < 60) {
      return this.translationService.translate('common.time.minutesAgoShort', { count: minutes });
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return this.translationService.translate('common.time.hoursAgoShort', { count: hours });
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return this.translationService.translate('common.time.daysAgoShort', { count: days });
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 5) {
      return this.translationService.translate('common.time.weeksAgoShort', { count: weeks });
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return this.translationService.translate('common.time.monthsAgoShort', { count: months });
    }

    const years = Math.floor(days / 365);
    return this.translationService.translate('common.time.yearsAgoShort', { count: years });
  }

  onViewMoreReviews(): void {
    if (!this.selectedObject) {
      return;
    }

    this.router.navigate(['/content-creator/reviews'], {
      queryParams: { objectId: this.selectedObject.id }
    });
  }

  private setSelectedObject(object: ObjectDto | null): void {
    const previousId = this.selectedObject?.id ?? null;
    this.selectedObject = object;

    if (!object) {
      this.stopHeroImageRotation();
      this.heroImageUrls = [];
      this.currentHeroImageIndex = 0;
      this.previewReviews = [];
      return;
    }

    if (object.id !== previousId) {
      this.loadHeroImagesForSelectedObject();
      this.loadPreviewReviews();
    }
  }

  private getDetailBanner(object: ObjectDto | null): string {
    if (object?.mainImageUrl) {
      return this.normalizeImageUrl(object.mainImageUrl);
    }

    return ContentCreatorObjectsComponent.DEFAULT_BANNER_URL;
  }

  private loadHeroImagesForSelectedObject(): void {
    this.stopHeroImageRotation();
    this.heroImageUrls = [];
    this.currentHeroImageIndex = 0;

    if (!this.selectedObject) {
      return;
    }

    const fallbackUrl = this.getDetailBanner(this.selectedObject);

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

  private getMinRatingFromFilter(value: string): number | undefined {
    if (value === 'all') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private loadPreviewReviews(): void {
    const objectId = this.selectedObject?.id;
    if (!objectId) {
      this.previewReviews = [];
      return;
    }

    this.isLoadingPreviewReviews = true;
    this.previewReviews = [];

    this.reviewService.getForCreator(
      { objectId, sortBy: 'createdAt', sortOrder: 'desc', pageSize: 100 },
      { bypassRegion: true }
    ).subscribe({
      next: (response) => {
        this.previewReviews = (response.items ?? [])
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, ContentCreatorObjectsComponent.PREVIEW_REVIEWS_LIMIT);
        this.isLoadingPreviewReviews = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.previewReviews = [];
        this.isLoadingPreviewReviews = false;
        this.cdr.detectChanges();
      }
    });
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

  private loadFilterOptions(): void {
    this.objectService.getMyFilterOptions().subscribe({
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
}
