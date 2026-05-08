import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocalityDto, LocalityService } from '../../../services/locality.service';

@Component({
  selector: 'app-manager-localities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './localities.component.html',
  styleUrls: ['./localities.component.css']
})
export class ManagerLocalitiesComponent implements OnInit {
  private readonly localityService = inject(LocalityService);
  private readonly cdr = inject(ChangeDetectorRef);

  localities: LocalityDto[] = [];
  selectedLocality: LocalityDto | null = null;

  isLoading = true;
  errorMessage = '';

  draftSearchQuery = '';
  searchQuery = '';
  destinationFilter = 'all';
  typeFilter = 'all';
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 1;
  readonly pageSizeOptions = [10, 20, 50];

  ngOnInit(): void {
    this.loadLocalities();
  }

  get totalLocalitiesOnPage(): number {
    return this.localities.length;
  }

  get pageStart(): number {
    if (!this.totalCount || !this.localities.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.pageStart + this.localities.length - 1;
  }

  get activePercent(): string {
    if (!this.localities.length) {
      return '0%';
    }
    const active = this.localities.filter((item) => item.isActive).length;
    return `${Math.round((active / this.localities.length) * 100)}%`;
  }

  get selectedCoordinates(): string {
    if (this.selectedLocality?.latitude == null || this.selectedLocality?.longitude == null) {
      return 'N/A';
    }
    return `${this.selectedLocality.latitude.toFixed(4)}, ${this.selectedLocality.longitude.toFixed(4)}`;
  }

  loadLocalities(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.localityService
      .getAll({
        page: this.currentPage,
        pageSize: this.pageSize,
        search: this.searchQuery || undefined,
        destination: this.destinationFilter !== 'all' ? this.destinationFilter : undefined,
        type: this.typeFilter !== 'all' ? this.typeFilter : undefined,
        sortBy: this.sortBy,
        sortOrder: this.sortOrder
      })
      .subscribe({
        next: (response) => {
          this.localities = response?.items ?? [];
          this.totalCount = response?.totalCount ?? 0;
          this.currentPage = response?.page ?? this.currentPage;
          this.pageSize = response?.pageSize ?? this.pageSize;
          this.totalPages = response?.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));

          if (!this.selectedLocality || !this.localities.some((item) => item.id === this.selectedLocality?.id)) {
            this.selectedLocality = this.localities[0] ?? null;
          }

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.errorMessage = error?.error?.message ?? 'Failed to load localities';
          this.localities = [];
          this.selectedLocality = null;
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
    this.loadLocalities();
  }

  onResetFilters(): void {
    this.searchQuery = '';
    this.draftSearchQuery = '';
    this.destinationFilter = 'all';
    this.typeFilter = 'all';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.currentPage = 1;
    this.loadLocalities();
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onApplyFilters();
  }

  onPreviousPage(): void {
    if (this.currentPage <= 1) {
      return;
    }
    this.currentPage--;
    this.loadLocalities();
  }

  onNextPage(): void {
    if (this.currentPage >= this.totalPages) {
      return;
    }
    this.currentPage++;
    this.loadLocalities();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.loadLocalities();
  }

  selectLocality(locality: LocalityDto): void {
    this.selectedLocality = locality;
  }

  trackByLocalityId(_: number, locality: LocalityDto): number {
    return locality.id;
  }

  getStatusLabel(locality: LocalityDto): string {
    return locality.isActive ? 'Published' : 'Archived';
  }

  getStatusClass(locality: LocalityDto): string {
    return locality.isActive ? 'published' : 'draft';
  }

  getCreatedByLabel(locality: LocalityDto): string {
    return locality.createdByUserId != null ? `User #${locality.createdByUserId}` : 'N/A';
  }

  getCoordinatesLabel(locality: LocalityDto): string {
    if (locality.latitude == null || locality.longitude == null) {
      return 'N/A';
    }
    return `${locality.latitude.toFixed(4)}, ${locality.longitude.toFixed(4)}`;
  }

  getHeroStyle(): Record<string, string> {
    const image = this.selectedLocality?.mainImageUrl?.trim();
    if (!image) {
      return {};
    }
    return { 'background-image': `url("${image}")` };
  }
}
