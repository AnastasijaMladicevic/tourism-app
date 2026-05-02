import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ObjectInsightCard {
  label: string;
  value: string;
  hint: string;
  tone: 'blue' | 'green' | 'neutral';
}

interface ManagerObjectRow {
  id: number;
  status: string;
  name: string;
  detailLine: string;
  locationPrimary: string;
  locationSecondary: string;
  categoryLabel: string;
  categoryIcon: string;
  capacityProgress: number;
  capacityLabel: string;
  bannerUrl: string;
  metricLeftLabel: string;
  metricLeftValue: string;
  metricRightLabel: string;
  metricRightValue: string;
  hoursOpenLabel: string;
  hoursOpenValue: string;
  hoursCloseLabel: string;
  hoursCloseValue: string;
  description: string;
}

@Component({
  selector: 'app-manager-objects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './objects.component.html',
  styleUrls: ['./objects.component.css']
})
export class ManagerObjectsComponent {
  readonly managedDestinationLabel = 'Kotor';

  draftSearchQuery = '';
  filterPanelOpen = false;
  statusFilter = 'all';
  categoryFilter = 'all';
  sortBy = 'name';
  sortOrder: 'asc' | 'desc' = 'asc';

  pageSize = 5;
  readonly pageSizeOptions = [5, 10, 20, 50];
  currentPage = 1;

  readonly stats: ObjectInsightCard[] = [
    { label: 'New this week', value: '12', hint: '+2 from last month', tone: 'blue' },
    { label: 'Verified listings', value: '48', hint: '98% profile complete', tone: 'green' },
    { label: 'Visitor engagement', value: '64%', hint: 'Across all published objects', tone: 'neutral' }
  ];

  readonly mockRows: ManagerObjectRow[] = [
    {
      id: 1,
      status: 'Rejected',
      name: 'Maritime Heritage Pavilion',
      detailLine: 'Exhibition space · Updated 12 Apr 2026',
      locationPrimary: 'Old Town Harbor',
      locationSecondary: 'Waterfront District',
      categoryLabel: 'Museum',
      categoryIcon: 'museum',
      capacityProgress: 72,
      capacityLabel: '720 / 1,000 peak',
      bannerUrl: 'assets/pozadina.png',
      metricLeftLabel: 'Avg. dwell',
      metricLeftValue: '24 min',
      metricRightLabel: 'Daily cap.',
      metricRightValue: '1,000',
      hoursOpenLabel: 'Opens',
      hoursOpenValue: '09:00 · Mon–Sun',
      hoursCloseLabel: 'Closes',
      hoursCloseValue: '20:00 · Mon–Sun',
      description:
        'Interactive exhibits on local seafaring history, seasonal maritime festivals, and guided tours along the bay promenade.'
    },
    {
      id: 2,
      status: 'Approved',
      name: 'Cathedral Square Market Hall',
      detailLine: 'Retail & dining · Peak Sat–Sun',
      locationPrimary: 'St. Tryphon Square',
      locationSecondary: 'Historic Core',
      categoryLabel: 'Market',
      categoryIcon: 'storefront',
      capacityProgress: 45,
      capacityLabel: '450 / 1,000 peak',
      bannerUrl: 'assets/pozadina.png',
      metricLeftLabel: 'Avg. dwell',
      metricLeftValue: '18 min',
      metricRightLabel: 'Daily cap.',
      metricRightValue: '1,000',
      hoursOpenLabel: 'Opens',
      hoursOpenValue: '08:00 · Mon–Sun',
      hoursCloseLabel: 'Closes',
      hoursCloseValue: '23:00 · Fri–Sat',
      description:
        'Open-air stalls and indoor artisan boutiques framing the cathedral, with evening concerts during summer.'
    },
    {
      id: 3,
      status: 'Pending',
      name: 'Lovćen Viewpoint Trailhead',
      detailLine: 'Outdoor · Seasonal access',
      locationPrimary: 'Njegoš Road North',
      locationSecondary: 'Mountain access',
      categoryLabel: 'Nature',
      categoryIcon: 'forest',
      capacityProgress: 88,
      capacityLabel: '220 / 250 trail',
      bannerUrl: 'assets/pozadina.png',
      metricLeftLabel: 'Avg. dwell',
      metricLeftValue: '41 min',
      metricRightLabel: 'Trail cap.',
      metricRightValue: '250',
      hoursOpenLabel: 'Opens',
      hoursOpenValue: '06:00 · Apr–Oct',
      hoursCloseLabel: 'Closes',
      hoursCloseValue: 'Sunset · varies',
      description:
        'Gateway hikes and panoramic decks overlooking the bay; rangers monitor capacity on busy weekends.'
    }
  ];

  selectedObject: ManagerObjectRow = this.mockRows[0];

  get pagedRows(): ManagerObjectRow[] {
    return this.mockRows;
  }

  get totalCount(): number {
    return this.mockRows.length;
  }

  get pageStart(): number {
    if (!this.totalCount || !this.pagedRows.length) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.pageStart + this.pagedRows.length - 1;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalCount / this.pageSize));
  }

  onSearchChange(): void {
    // Search wiring deferred until backend is available.
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
  }

  onMoreFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  onApplyFilters(): void {
    this.currentPage = 1;
  }

  onResetFilters(): void {
    this.statusFilter = 'all';
    this.categoryFilter = 'all';
    this.sortBy = 'name';
    this.sortOrder = 'asc';
    this.pageSize = 5;
    this.currentPage = 1;
  }

  onViewObject(row: ManagerObjectRow): void {
    this.selectedObject = row;
  }

  onOpenObjectLink(row: ManagerObjectRow, event: Event): void {
    event.stopPropagation();
    // Navigation deferred.
    void row;
  }

  onNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  onPreviousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  onPageSizeChange(value: number | string): void {
    this.pageSize = Number(value);
    this.currentPage = 1;
  }

  trackByObjectId(_: number, row: ManagerObjectRow): number {
    return row.id;
  }

  getStatusBadgeClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'approved':
      case 'published':
        return 'badge-approved';
      case 'pending':
        return 'badge-pending';
      case 'cancelled':
      case 'rejected':
        return 'badge-cancelled';
      case 'draft':
        return 'badge-draft';
      default:
        return 'badge-draft';
    }
  }
}
