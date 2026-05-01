import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ObjectDto, ObjectService } from '../../../services/object';

@Component({
  selector: 'app-content-creator-objects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './objects.component.html',
  styleUrls: ['./objects.component.css']
})
export class ContentCreatorObjectsComponent implements OnInit {
  private readonly objectService = inject(ObjectService);
  private readonly cdr = inject(ChangeDetectorRef);

  objects: ObjectDto[] = [];
  pagedObjects: ObjectDto[] = [];
  selectedObject: ObjectDto | null = null;

  isLoading = true;
  errorMessage = '';

  draftSearchQuery = '';
  searchQuery = '';
  statusFilter = 'all';
  typeFilter = 'all';
  ratingFilter = 'all';
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
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

  ngOnInit(): void {
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

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load objects';
        this.objects = [];
        this.pagedObjects = [];
        this.selectedObject = null;
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
    this.sortBy = 'name';
    this.sortOrder = 'asc';
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

  selectObject(object: ObjectDto): void {
    this.selectedObject = object;
  }

  trackByObjectId(_: number, object: ObjectDto): number {
    return object.id;
  }

  getStatusBadgeClass(status?: string): string {
    switch ((status ?? '').toLowerCase()) {
      case 'published':
      case 'approved':
        return 'published';
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
    const image = this.normalizeImageUrl(this.selectedObject?.mainImageUrl);
    if (!image) {
      return {};
    }

    return { 'background-image': `url("${image}")` };
  }

  getTypeOptions(): string[] {
    const unique = this.objects
      .map((item) => item.objectTypeName?.trim())
      .filter((name): name is string => !!name)
      .filter((name, index, all) => all.findIndex((x) => x.toLowerCase() === name.toLowerCase()) === index)
      .sort((a, b) => a.localeCompare(b));

    return unique;
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

  formatPrice(price?: number | null): string {
    if (price == null) {
      return 'N/A';
    }

    return `$${Number(price).toFixed(2)}`;
  }

  get averageRatingDisplay(): string {
    if (!this.pagedObjects.length) {
      return '0.0';
    }

    const total = this.pagedObjects.reduce((sum, item) => sum + (item.averageRating ?? 0), 0);
    return (total / this.pagedObjects.length).toFixed(1);
  }

  private getMinRatingFromFilter(value: string): number | undefined {
    if (value === 'all') {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
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