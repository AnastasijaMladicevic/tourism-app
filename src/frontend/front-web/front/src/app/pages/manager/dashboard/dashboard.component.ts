import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UserDto } from '../../../models/user.model';
import { AuthService } from '../../../services/auth.service';
import {
  ManagerDashboardLocalityPerformanceItemDto,
  ManagerDashboardOverviewDto,
  ManagerDashboardPeriod,
  ManagerDashboardService,
  ManagerDashboardStatusBucketDto,
  ManagerDashboardTopContentItemDto,
  ManagerDashboardTopCreatorItemDto,
  ManagerDashboardUpcomingEventItemDto,
} from '../../../services/manager-dashboard.service';

interface PeriodOption {
  key: ManagerDashboardPeriod;
  label: string;
}

interface EngagementSeries {
  key: string;
  label: string;
  color: string;
  linePath: string;
}

interface EngagementHoverZone {
  x: number;
  width: number;
  title: string;
}

interface RenderPoint {
  x: number;
  y: number;
}

interface ModerationSlice {
  label: string;
  count: number;
  color: string;
  percent: number;
}

interface ContentStatusRow {
  key: string;
  label: string;
  total: number;
  published: number;
  pending: number;
  rejected: number;
  totalPercent: number;
  publishedPercent: number;
  pendingPercent: number;
  rejectedPercent: number;
}

interface RankedContentRow extends ManagerDashboardTopContentItemDto {
  barPercent: number;
}

interface RankedCreatorRow extends ManagerDashboardTopCreatorItemDto {
  barPercent: number;
}

interface RankedLocalityRow extends ManagerDashboardLocalityPerformanceItemDto {
  barPercent: number;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '3m', label: '3m' },
  { key: '6m', label: '6m' },
  { key: '1y', label: '1y' },
  { key: '5y', label: '5y' },
];

const MANAGER_DASHBOARD_PERIOD_STORAGE_KEY = 'manager-dashboard-selected-period';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css', '../shared/manager-list-page-header.css', '../shared/manager-list-page-responsive.css'],
})
export class ManagerDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly managerDashboardService = inject(ManagerDashboardService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly periodOptions = PERIOD_OPTIONS;

  selectedPeriod: ManagerDashboardPeriod = '30d';
  user: UserDto | null = null;
  overview: ManagerDashboardOverviewDto | null = null;

  isLoading = true;
  loadError = '';

  engagementSeries: EngagementSeries[] = [];
  engagementMaxY = 1;
  engagementYTop = '0';
  engagementYMid = '0';
  engagementXLabels: { label: string }[] = [];
  engagementIsEmpty = false;
  engagementHoverZones: EngagementHoverZone[] = [];

  moderationSlices: ModerationSlice[] = [];
  contentStatusRows: ContentStatusRow[] = [];
  topContentRows: RankedContentRow[] = [];
  topCreatorRows: RankedCreatorRow[] = [];
  localityRows: RankedLocalityRow[] = [];
  upcomingEventRows: ManagerDashboardUpcomingEventItemDto[] = [];

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.selectedPeriod = this.readSavedPeriod();
    this.loadOverview();
  }

  selectPeriod(period: ManagerDashboardPeriod): void {
    if (this.selectedPeriod === period || this.isLoading) {
      return;
    }

    this.selectedPeriod = period;
    this.saveSelectedPeriod(period);
    this.cdr.detectChanges();
    this.loadOverview();
  }

  get granularityHint(): string {
    switch (this.overview?.engagementTrendGranularity) {
      case 'week':
        return 'Grouped by week';
      case 'month':
        return 'Grouped by month';
      default:
        return 'Grouped by day';
    }
  }

  get managedDestinationTitle(): string {
    return this.overview?.destination?.destinationName?.trim()
      || 'No managed destination';
  }

  get managedDestinationDisplayTitle(): string {
    const displayTitle = this.overview?.destination?.displayTitle?.trim();
    const destinationName = this.overview?.destination?.destinationName?.trim();

    if (!displayTitle || displayTitle === destinationName) {
      return '';
    }

    return displayTitle;
  }

  get hasManagedDestination(): boolean {
    return !!this.overview?.hasManagedDestination;
  }

  get managedDestinationSubtitle(): string {
    const regionName = this.overview?.destination?.regionName?.trim();
    const localityCount = this.overview?.destination?.localityCount ?? 0;

    if (!regionName && localityCount <= 0) {
      return '';
    }

    if (!regionName) {
      return `${localityCount} localities`;
    }

    if (localityCount <= 0) {
      return regionName;
    }

    return `${regionName} • ${localityCount} localities`;
  }

  get moderationTotalPendingDecisions(): number {
    return (this.overview?.moderationQueue.totalPending ?? 0) + (this.overview?.reports.currentPending ?? 0);
  }

  private loadOverview(): void {
    this.isLoading = true;
    this.loadError = '';
    this.cdr.detectChanges();

    this.managerDashboardService
      .getOverview(this.selectedPeriod)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (overview) => {
          this.overview = overview;
          this.bindOverview(overview);
          this.cdr.detectChanges();
        },
        error: () => {
          this.overview = null;
          this.resetDerivedState();
          this.loadError = 'Manager dashboard data could not be loaded right now.';
          this.cdr.detectChanges();
        },
      });
  }

  private bindOverview(overview: ManagerDashboardOverviewDto): void {
    this.bindEngagementTrend(overview);
    this.bindModerationQueue(overview);
    this.bindContentStatus(overview);
    this.bindTopContent(overview.topContent);
    this.bindTopCreators(overview.topCreators);
    this.bindLocalities(overview.localityPerformance);
    this.upcomingEventRows = overview.upcomingEvents.items.slice(0, 6);
  }

  private resetDerivedState(): void {
    this.engagementSeries = [];
    this.engagementMaxY = 1;
    this.engagementYTop = '0';
    this.engagementYMid = '0';
    this.engagementXLabels = [];
    this.engagementIsEmpty = false;
    this.engagementHoverZones = [];
    this.moderationSlices = [];
    this.contentStatusRows = [];
    this.topContentRows = [];
    this.topCreatorRows = [];
    this.localityRows = [];
    this.upcomingEventRows = [];
  }

  private bindEngagementTrend(overview: ManagerDashboardOverviewDto): void {
    const points = overview.engagementTrend ?? [];
    const seriesDefs = [
      { key: 'favorites', label: 'Favorites', color: '#0d9488', pick: (point: typeof points[number]) => point.favorites },
      { key: 'planner', label: 'Planner adds', color: '#2563eb', pick: (point: typeof points[number]) => point.plannerAdds },
      { key: 'reviews', label: 'Reviews', color: '#d97706', pick: (point: typeof points[number]) => point.reviews },
    ];

    const allValues = points.flatMap((point) => [point.favorites, point.plannerAdds, point.reviews]);
    const maxVal = Math.max(...allValues, 0);
    const seriesValueSets = seriesDefs.map((def) => ({
      key: def.key,
      label: def.label,
      values: points.map(def.pick),
    }));

    this.engagementMaxY = Math.max(maxVal, 1);
    this.engagementYTop = String(maxVal);
    this.engagementYMid = maxVal === 0 ? '0' : String(Math.round(maxVal / 2));
    this.engagementIsEmpty = maxVal === 0;

    const renderPointsBySeries = this.buildRenderPoints(seriesValueSets, this.engagementMaxY);

    this.engagementSeries = seriesDefs.map((def) => ({
      key: def.key,
      label: def.label,
      color: def.color,
      linePath: this.buildLinePath(renderPointsBySeries[def.key] ?? []),
    }));

    this.engagementHoverZones = this.buildHoverZones(
      points.map((point) => ({
        label: this.formatBucketLabel(point.date, overview.engagementTrendGranularity),
        favorites: point.favorites,
        plannerAdds: point.plannerAdds,
        reviews: point.reviews,
      })),
    );

    const labelCount = Math.min(6, points.length);
    const step = labelCount <= 1 ? 1 : Math.max(1, Math.floor((points.length - 1) / (labelCount - 1)));
    this.engagementXLabels = [];

    for (let i = 0; i < points.length; i += step) {
      this.engagementXLabels.push({
        label: this.formatBucketLabel(points[i].date, overview.engagementTrendGranularity),
      });
    }

    const lastPoint = points[points.length - 1];
    if (
      lastPoint &&
      this.engagementXLabels[this.engagementXLabels.length - 1]?.label !==
        this.formatBucketLabel(lastPoint.date, overview.engagementTrendGranularity)
    ) {
      this.engagementXLabels.push({
        label: this.formatBucketLabel(lastPoint.date, overview.engagementTrendGranularity),
      });
    }
  }

  private bindModerationQueue(overview: ManagerDashboardOverviewDto): void {
    const queue = overview.moderationQueue;
    const total = Math.max(queue.totalPending + overview.reports.currentPending, 1);

    this.moderationSlices = [
      { label: 'Objects', count: queue.pendingObjects, color: '#2563eb', percent: (queue.pendingObjects / total) * 100 },
      { label: 'Events', count: queue.pendingEvents, color: '#0d9488', percent: (queue.pendingEvents / total) * 100 },
      { label: 'Activities', count: queue.pendingActivities, color: '#8b5cf6', percent: (queue.pendingActivities / total) * 100 },
      { label: 'Reports', count: overview.reports.currentPending, color: '#d97706', percent: (overview.reports.currentPending / total) * 100 },
      { label: 'Deletion requests', count: queue.pendingDeletionRequests, color: '#dc2626', percent: (queue.pendingDeletionRequests / total) * 100 },
    ];
  }

  private bindContentStatus(overview: ManagerDashboardOverviewDto): void {
    const rows = [
      { key: 'overall', label: 'Overall', bucket: overview.contentStatus.overall },
      { key: 'objects', label: 'Objects', bucket: overview.contentStatus.objects },
      { key: 'events', label: 'Events', bucket: overview.contentStatus.events },
      { key: 'activities', label: 'Activities', bucket: overview.contentStatus.activities },
    ];

    const maxTotal = Math.max(...rows.map((row) => row.bucket.total), 1);
    this.contentStatusRows = rows.map(({ key, label, bucket }) => this.toContentStatusRow(key, label, bucket, maxTotal));
  }

  private bindTopContent(rows: ManagerDashboardTopContentItemDto[]): void {
    const maxScore = Math.max(...rows.map((row) => row.engagementScore), 1);
    this.topContentRows = rows.slice(0, 6).map((row) => ({
      ...row,
      barPercent: Math.round((row.engagementScore / maxScore) * 1000) / 10,
    }));
  }

  private bindTopCreators(rows: ManagerDashboardTopCreatorItemDto[]): void {
    const maxScore = Math.max(...rows.map((row) => row.engagementScore), 1);
    this.topCreatorRows = rows.slice(0, 5).map((row) => ({
      ...row,
      barPercent: Math.round((row.engagementScore / maxScore) * 1000) / 10,
    }));
  }

  private bindLocalities(rows: ManagerDashboardLocalityPerformanceItemDto[]): void {
    const maxScore = Math.max(...rows.map((row) => row.engagementScore), 1);
    this.localityRows = rows.slice(0, 6).map((row) => ({
      ...row,
      barPercent: Math.round((row.engagementScore / maxScore) * 1000) / 10,
    }));
  }

  private toContentStatusRow(
    key: string,
    label: string,
    bucket: ManagerDashboardStatusBucketDto,
    maxTotal: number,
  ): ContentStatusRow {
    const total = Math.max(bucket.total, 1);

    return {
      key,
      label,
      total: bucket.total,
      published: bucket.published,
      pending: bucket.pending,
      rejected: bucket.rejected,
      totalPercent: bucket.total <= 0 ? 0 : Math.max((bucket.total / Math.max(maxTotal, 1)) * 100, 4),
      publishedPercent: (bucket.published / total) * 100,
      pendingPercent: (bucket.pending / total) * 100,
      rejectedPercent: (bucket.rejected / total) * 100,
    };
  }

  humanizeContentType(contentType: string): string {
    switch (contentType?.toLowerCase()) {
      case 'touristobject':
      case 'object':
        return 'Object';
      case 'event':
        return 'Event';
      case 'activity':
        return 'Activity';
      default:
        return contentType || 'Content';
    }
  }

  humanizeStatus(status: string | null | undefined): string {
    switch (status?.trim().toLowerCase()) {
      case 'approved':
      case 'published':
        return 'Published';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return status || 'Unknown';
    }
  }

  statusClass(status: string | null | undefined): string {
    switch (status?.trim().toLowerCase()) {
      case 'approved':
      case 'published':
        return 'status-pill status-pill--published';
      case 'pending':
        return 'status-pill status-pill--pending';
      case 'rejected':
        return 'status-pill status-pill--rejected';
      default:
        return 'status-pill';
    }
  }

  formatShortDate(value: string | null | undefined): string {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(value));
  }

  private buildRenderPoints(
    seriesSets: { key: string; values: number[] }[],
    maxY: number,
  ): Record<string, RenderPoint[]> {
    const result: Record<string, RenderPoint[]> = Object.fromEntries(
      seriesSets.map((series) => [series.key, [] as RenderPoint[]]),
    );

    if (!seriesSets.length || maxY <= 0) {
      return result;
    }

    const width = 100;
    const height = 100;
    const count = seriesSets[0]?.values.length ?? 0;

    for (let index = 0; index < count; index++) {
      const x = (index / Math.max(count - 1, 1)) * width;
      const groupedByValue = new Map<number, { key: string; value: number }[]>();

      for (const series of seriesSets) {
        const value = series.values[index] ?? 0;
        const bucket = groupedByValue.get(value) ?? [];
        bucket.push({ key: series.key, value });
        groupedByValue.set(value, bucket);
      }

      for (const [value, bucket] of groupedByValue.entries()) {
        const baseY = height - (value / maxY) * height;
        const offsets = this.buildDuplicatePointOffsets(bucket.length);

        bucket.forEach((series, bucketIndex) => {
          const adjustedY = Math.min(99, Math.max(1, baseY + offsets[bucketIndex]));
          result[series.key].push({ x, y: adjustedY });
        });
      }
    }

    return result;
  }

  private buildDuplicatePointOffsets(count: number): number[] {
    if (count <= 1) {
      return [0];
    }

    const spacing = 1.4;
    const start = -((count - 1) * spacing) / 2;
    return Array.from({ length: count }, (_, index) => start + index * spacing);
  }

  private buildLinePath(points: RenderPoint[]): string {
    if (!points.length) {
      return '';
    }

    return points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(' ');
  }

  private buildHoverZones(
    buckets: { label: string; favorites: number; plannerAdds: number; reviews: number }[],
  ): EngagementHoverZone[] {
    if (!buckets.length) {
      return [];
    }

    const width = 100;
    const step = buckets.length > 1 ? width / (buckets.length - 1) : width;

    return buckets.map((bucket, index) => {
      const center = buckets.length > 1 ? index * step : width / 2;
      const previousCenter = index === 0 ? 0 : (index - 1) * step;
      const nextCenter = index === buckets.length - 1 ? width : (index + 1) * step;
      const start = index === 0 ? 0 : (previousCenter + center) / 2;
      const end = index === buckets.length - 1 ? width : (center + nextCenter) / 2;

      return {
        x: start,
        width: Math.max(2, end - start),
        title: [
          bucket.label,
          `Favorites: ${bucket.favorites}`,
          `Planner adds: ${bucket.plannerAdds}`,
          `Reviews: ${bucket.reviews}`,
        ].join(' | '),
      };
    });
  }

  private formatBucketLabel(dateIso: string, granularity: string): string {
    const date = new Date(dateIso);

    if (granularity === 'month') {
      return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    }

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  }

  private readSavedPeriod(): ManagerDashboardPeriod {
    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem(MANAGER_DASHBOARD_PERIOD_STORAGE_KEY)
      : null;

    return this.isValidPeriod(saved) ? saved : '30d';
  }

  private saveSelectedPeriod(period: ManagerDashboardPeriod): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(MANAGER_DASHBOARD_PERIOD_STORAGE_KEY, period);
  }

  private isValidPeriod(value: string | null): value is ManagerDashboardPeriod {
    return PERIOD_OPTIONS.some((option) => option.key === value);
  }
}
