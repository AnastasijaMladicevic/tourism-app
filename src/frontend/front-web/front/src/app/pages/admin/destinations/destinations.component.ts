import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MapComponent as SharedMapComponent } from '../../../shared/components/map/map';

export type AdminDestinationStatus = 'active' | 'draft' | 'archived';

export interface AdminDestinationRow {
  id: number;
  name: string;
  region: string;
  country: string;
  code: string;
  status: AdminDestinationStatus;
  localityCount: number;
  featured: boolean;
  summary: string;
  mainImageUrl?: string;
  latitude?: number;
  longitude?: number;
  updatedAt: string;
}

interface DestinationInsightCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'amber';
}

@Component({
  selector: 'app-destinations',
  standalone: true,
  imports: [CommonModule, FormsModule, SharedMapComponent],
  templateUrl: './destinations.component.html',
  styleUrls: ['./destinations.component.css']
})
export class DestinationsComponent {
  /** Layout-only seed data; replace with API when wired. */
  private readonly allDestinations: AdminDestinationRow[] = [
    {
      id: 1,
      name: 'Bay of Kotor',
      region: 'Coastal Montenegro',
      country: 'Montenegro',
      code: 'me-kotor-bay',
      status: 'active',
      localityCount: 12,
      featured: true,
      summary:
        'UNESCO-listed fjord-like bay with medieval towns, sailing routes, and high seasonal demand.',
      mainImageUrl: '/assets/pozadina.png',
      latitude: 42.424,
      longitude: 18.771,
      updatedAt: '2026-04-02'
    },
    {
      id: 2,
      name: 'Durmitor National Park',
      region: 'Northern Montenegro',
      country: 'Montenegro',
      code: 'me-durmitor',
      status: 'active',
      localityCount: 8,
      featured: true,
      summary: 'Alpine plateau, glacial lakes, and winter sports hub with growing eco-tourism.',
      latitude: 43.129,
      longitude: 19.02,
      updatedAt: '2026-03-18'
    },
    {
      id: 3,
      name: 'Lake Skadar',
      region: 'Skadar Lake',
      country: 'Montenegro / Albania',
      code: 'me-skadar-lake',
      status: 'draft',
      localityCount: 5,
      featured: false,
      summary: 'Largest lake in Southern Europe; birdwatching and wine routes pending content review.',
      updatedAt: '2026-02-28'
    },
    {
      id: 4,
      name: 'Budva Riviera',
      region: 'Adriatic coast',
      country: 'Montenegro',
      code: 'me-budva',
      status: 'active',
      localityCount: 15,
      featured: true,
      summary: 'Beach resorts, nightlife, and family-friendly bays with strong summer occupancy.',
      mainImageUrl: '/assets/pozadina.png',
      latitude: 42.286,
      longitude: 18.85,
      updatedAt: '2026-05-01'
    },
    {
      id: 5,
      name: 'Prokletije range',
      region: 'Prokletije',
      country: 'Montenegro',
      code: 'me-prokletije',
      status: 'archived',
      localityCount: 3,
      featured: false,
      summary: 'Remote hiking destination; temporarily hidden while trail data is validated.',
      updatedAt: '2025-11-10'
    },
    {
      id: 6,
      name: 'Podgorica capital district',
      region: 'Central Montenegro',
      country: 'Montenegro',
      code: 'me-podgorica',
      status: 'active',
      localityCount: 6,
      featured: false,
      summary: 'Business travel, airport transfers, and city-break itineraries.',
      latitude: 42.441,
      longitude: 19.262,
      updatedAt: '2026-01-22'
    }
  ];

  draftSearchQuery = '';
  searchQuery = '';
  statusFilter = 'all';
  regionFilter = 'all';
  sortBy: 'name' | 'region' | 'localityCount' | 'status' | 'updatedAt' = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';
  filterPanelOpen = false;

  currentPage = 1;
  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 20, 50];

  selectedDestination: AdminDestinationRow | null = null;

  readonly statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'draft', label: 'Draft' },
    { value: 'archived', label: 'Archived' }
  ];

  readonly regionOptions = [
    { value: 'all', label: 'All regions' },
    { value: 'Coastal Montenegro', label: 'Coastal Montenegro' },
    { value: 'Northern Montenegro', label: 'Northern Montenegro' },
    { value: 'Skadar Lake', label: 'Skadar Lake' },
    { value: 'Adriatic coast', label: 'Adriatic coast' },
    { value: 'Prokletije', label: 'Prokletije' },
    { value: 'Central Montenegro', label: 'Central Montenegro' }
  ];

  readonly sortByOptions = [
    { value: 'name', label: 'Name' },
    { value: 'region', label: 'Region' },
    { value: 'localityCount', label: 'Localities' },
    { value: 'status', label: 'Status' },
    { value: 'updatedAt', label: 'Last updated' }
  ];

  constructor() {
    const first = this.filteredSorted[0] ?? null;
    this.selectedDestination = first;
  }

  get insightCards(): DestinationInsightCard[] {
    const filtered = this.applyFiltersToAll();
    const featured = filtered.filter((d) => d.featured).length;
    return [
      {
        label: 'Total destinations',
        value: String(filtered.length),
        hint: 'Matching current filters',
        tone: 'blue'
      },
      {
        label: 'On this page',
        value: String(this.visibleDestinations.length),
        hint: 'Visible rows',
        tone: 'green'
      },
      {
        label: 'Featured',
        value: String(featured),
        hint: 'Flagged for discovery',
        tone: 'amber'
      }
    ];
  }

  get filteredSorted(): AdminDestinationRow[] {
    return this.applyFiltersToAll();
  }

  get totalCount(): number {
    return this.filteredSorted.length;
  }

  get totalPages(): number {
    if (!this.totalCount || this.pageSize < 1) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  get visibleDestinations(): AdminDestinationRow[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredSorted.slice(start, start + this.pageSize);
  }

  get pageStart(): number {
    if (!this.totalCount || !this.visibleDestinations.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.pageStart + this.visibleDestinations.length - 1;
  }

  get selectedBanner(): string {
    return this.selectedDestination?.mainImageUrl || '/assets/pozadina.png';
  }

  get hasSelectedCoordinates(): boolean {
    return (
      this.selectedDestination?.latitude != null && this.selectedDestination?.longitude != null
    );
  }

  get selectedLat(): number {
    return this.selectedDestination?.latitude ?? 42.424;
  }

  get selectedLng(): number {
    return this.selectedDestination?.longitude ?? 18.771;
  }

  get selectedMapLabel(): string {
    if (!this.selectedDestination) {
      return 'Destination';
    }
    return `${this.selectedDestination.name} · ${this.selectedDestination.region}`;
  }

  trackByDestinationId(_: number, row: AdminDestinationRow): number {
    return row.id;
  }

  selectDestination(row: AdminDestinationRow): void {
    this.selectedDestination = row;
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.onApplyFilters();
  }

  onApplyFilters(): void {
    this.searchQuery = this.draftSearchQuery.trim().toLowerCase();
    this.currentPage = 1;
    this.syncSelectionAfterFilter();
  }

  onResetFilters(): void {
    this.draftSearchQuery = '';
    this.searchQuery = '';
    this.statusFilter = 'all';
    this.regionFilter = 'all';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.currentPage = 1;
    this.syncSelectionAfterFilter();
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
    this.syncSelectionAfterFilter();
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.syncSelectionToVisiblePage();
    }
  }

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.syncSelectionToVisiblePage();
    }
  }

  onAddDestination(): void {
    // Wire to create flow when backend is ready.
  }

  onEditDestination(_row: AdminDestinationRow): void {
    // Wire to edit route when backend is ready.
  }

  formatStatus(status: AdminDestinationStatus): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getStatusClass(status: AdminDestinationStatus): string {
    switch (status) {
      case 'active':
        return 'status-published';
      case 'draft':
        return 'status-draft';
      case 'archived':
        return 'status-archived';
      default:
        return 'status-draft';
    }
  }

  private applyFiltersToAll(): AdminDestinationRow[] {
    let rows = [...this.allDestinations];

    if (this.searchQuery) {
      const q = this.searchQuery;
      rows = rows.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.region.toLowerCase().includes(q) ||
          d.country.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q)
      );
    }

    if (this.statusFilter !== 'all') {
      rows = rows.filter((d) => d.status === this.statusFilter);
    }

    if (this.regionFilter !== 'all') {
      rows = rows.filter((d) => d.region === this.regionFilter);
    }

    const dir = this.sortOrder === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      let cmp = 0;
      switch (this.sortBy) {
        case 'region':
          cmp = a.region.localeCompare(b.region);
          break;
        case 'localityCount':
          cmp = a.localityCount - b.localityCount;
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'updatedAt':
          cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        default:
          cmp = a.name.localeCompare(b.name);
      }
      if (cmp !== 0) {
        return cmp * dir;
      }
      return a.id - b.id;
    });

    return rows;
  }

  private syncSelectionAfterFilter(): void {
    const visible = this.visibleDestinations;
    if (!this.selectedDestination || !visible.some((d) => d.id === this.selectedDestination?.id)) {
      this.selectedDestination = visible[0] ?? this.filteredSorted[0] ?? null;
    }
  }

  private syncSelectionToVisiblePage(): void {
    const visible = this.visibleDestinations;
    if (!visible.length) {
      this.selectedDestination = null;
      return;
    }
    if (!this.selectedDestination || !visible.some((d) => d.id === this.selectedDestination?.id)) {
      this.selectedDestination = visible[0];
    }
  }
}
