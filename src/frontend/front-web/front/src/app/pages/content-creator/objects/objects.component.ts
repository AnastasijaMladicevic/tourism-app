import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FilterOption, ObjectDto, ObjectService } from '../../../services/object';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';
import { ReviewDto, ReviewService } from '../../../services/review';

interface WorkingHoursRow {
  day: string;
  open: string;
  close: string;
}

@Component({
  selector: 'app-content-creator-objects',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent],
  templateUrl: './objects.component.html',
  styleUrls: ['./objects.component.css']
})
export class ContentCreatorObjectsComponent implements OnInit {
  private readonly objectService = inject(ObjectService);
  private readonly reviewService = inject(ReviewService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);

  objects: ObjectDto[] = [];
  pagedObjects: ObjectDto[] = [];
  selectedObject: ObjectDto | null = null;
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
  filterPanelOpen = false;

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 1;
  readonly pageSizeOptions = [5, 10, 20, 50];

  readonly sortByOptions = [
    { value: 'name', label: 'Name' },
    { value: 'averageRating', label: 'Rating' },
    { value: 'status', label: 'Status' },
    { value: 'createdAt', label: 'Created date' }
  ];

  readonly ratingOptions = [
    { value: 'all', label: 'Any Rating' },
    { value: '1', label: '1.0+' },
    { value: '2', label: '2.0+' },
    { value: '3', label: '3.0+' },
    { value: '3.5', label: '3.5+' },
    { value: '4', label: '4.0+' },
    { value: '4.5', label: '4.5+' }
  ];

  private readonly fallbackStatusOptions: FilterOption[] = [
    { value: 'published', label: 'Published' },
    { value: 'approved', label: 'Approved' },
    { value: 'pending', label: 'Pending' },
    { value: 'draft', label: 'Draft' },
    { value: 'rejected', label: 'Rejected' }
  ];

  statusOptions: FilterOption[] = [...this.fallbackStatusOptions];
  typeOptions: FilterOption[] = [];

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadObjects();
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
    }).subscribe({
      next: (response) => {
        const items = response?.items ?? [];
        this.objects = items;
        this.pagedObjects = items;
        this.totalCount = response?.totalCount ?? 0;
        this.currentPage = response?.page ?? this.currentPage;
        this.pageSize = response?.pageSize ?? this.pageSize;
        this.totalPages = response?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));

        if (!this.selectedObject || !items.some((item) => item.id === this.selectedObject?.id)) {
          this.selectedObject = items[0] ?? null;
        }
        this.loadPreviewReviews();

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load objects';
        this.objects = [];
        this.pagedObjects = [];
        this.selectedObject = null;
        this.previewReviews = [];
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
    this.selectedObject = object;
    this.loadPreviewReviews();
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

  getHeroStyle(): Record<string, string> {
    const overlay =
      'linear-gradient(180deg, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.28))';
    const placeholder = 'linear-gradient(135deg, #dbeafe, #bfdbfe)';
    const image = this.normalizeImageUrl(this.selectedObject?.mainImageUrl);

    if (!image) {
      return { 'background-image': `${overlay}, ${placeholder}` };
    }

    return { 'background-image': `${overlay}, url("${image}")` };
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

    return addr || locality || destination || region || '—';
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
      return 'Draft';
    }

    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  /** Secondary line under destination (matches activities location column). */
  getObjectTableSubline(object: ObjectDto): string {
    if (object.destinationName && object.localityName) {
      return object.localityName;
    }
    if (object.regionName) {
      return object.regionName;
    }
    return '—';
  }

  formatPrice(price?: number | null): string {
    if (price == null) {
      return 'N/A';
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
        pon: 'Mon',
        uto: 'Tue',
        sre: 'Wed',
        cet: 'Thu',
        'čet': 'Thu',
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
      return 'Selected object';
    }

    const location = this.selectedObject.localityName || this.selectedObject.destinationName || this.selectedObject.regionName;
    return location ? `${this.selectedObject.name} · ${location}` : this.selectedObject.name;
  }

  get hasPreviewReviews(): boolean {
    return this.previewReviews.length > 0;
  }

  get previewReviewsCountLabel(): string {
    const count = this.previewReviews.length;
    return `${count} review${count === 1 ? '' : 's'}`;
  }

  getReviewInitials(review: ReviewDto): string {
    const fullName = review.userFullName?.trim();
    if (!fullName) {
      return 'U';
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
      return 'just now';
    }
    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days}d ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 5) {
      return `${weeks}w ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months}mo ago`;
    }

    const years = Math.floor(days / 365);
    return `${years}y ago`;
  }

  onViewMoreReviews(): void {
    if (!this.selectedObject) {
      return;
    }

    this.router.navigate(['/content-creator/reviews'], {
      queryParams: { objectId: this.selectedObject.id }
    });
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
    this.reviewService.getAll({
      page: 1,
      pageSize: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    }, { bypassRegion: true }).subscribe({
      next: (response) => {
        const reviewsForObject = (response.items ?? [])
          .filter((review) => review.objectId === objectId)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.previewReviews = reviewsForObject.slice(0, 3);
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