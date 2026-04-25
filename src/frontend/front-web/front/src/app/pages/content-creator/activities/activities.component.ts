import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivitiesService, ActivityDto } from '../../../services/activities';

@Component({
  selector: 'app-content-creator-activities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activities.component.html',
  styleUrls: ['./activities.component.css']
})
export class ContentCreatorActivitiesComponent implements OnInit {
  private readonly activitiesService = inject(ActivitiesService);

  activities: ActivityDto[] = [];
  isLoading = true;
  errorMessage = '';

  currentPage = 1;
  pageSize = 5;
  totalCount = 0;
  totalPages = 1;
  readonly pageSizeOptions = [5, 10, 20, 50];

  ngOnInit(): void {
    this.loadActivities();
  }

  loadActivities(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.activitiesService.getMyActivities({
      page: this.currentPage,
      pageSize: this.pageSize,
      sortBy: 'name',
      sortOrder: 'asc'
    }).subscribe({
      next: (response) => {
        this.activities = response.items ?? [];
        this.totalCount = response.totalCount ?? 0;
        this.currentPage = response.page ?? this.currentPage;
        this.pageSize = response.pageSize ?? this.pageSize;
        this.totalPages = response.totalPages ?? Math.max(1, Math.ceil(this.totalCount / this.pageSize));
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load activities';
        this.activities = [];
        this.totalCount = 0;
        this.totalPages = 1;
        this.isLoading = false;
      }
    });
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

  get pageStart(): number {
    if (!this.totalCount || this.activities.length === 0) {
      return 0;
    }

    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get pageEnd(): number {
    return this.pageStart + this.activities.length - 1;
  }
}