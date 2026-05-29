import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TimeoutError, timeout } from 'rxjs';
import { UserDto } from '../../../models/user.model';
import { AuthService } from '../../../services/auth.service';
import {
  ContentCreatorDashboardOverviewDto,
  ContentCreatorDashboardPeriod,
  ContentCreatorDashboardService,
  ContentCreatorDashboardStatusBucketDto,
  ContentCreatorDashboardTopContentItemDto,
  ContentCreatorDashboardTopDestinationItemDto,
  ContentCreatorDashboardUpcomingEventItemDto,
} from '../../../services/content-creator-dashboard.service';

interface PeriodOption {
  key: ContentCreatorDashboardPeriod;
  label: string;
}

interface KpiCard {
  label: string;
  value: string;
  meta: string;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal';
  icon: string;
}

interface TrendSeries {
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

interface StatusRow {
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

interface DonutSlice {
  label: string;
  count: number;
  percent: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface RankedContent extends ContentCreatorDashboardTopContentItemDto {
  barPercent: number;
}

interface DestinationPerformance extends ContentCreatorDashboardTopDestinationItemDto {
  barPercent: number;
}

interface RatingRow {
  label: string;
  count: number;
  percent: number;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '3m', label: '3m' },
  { key: '6m', label: '6m' },
  { key: '1y', label: '1y' },
  { key: '5y', label: '5y' },
];

const CONTENT_CREATOR_DASHBOARD_PERIOD_STORAGE_KEY = 'content-creator-dashboard-selected-period';
const DASHBOARD_REQUEST_TIMEOUT_MS = 15000;

@Component({
  selector: 'app-content-creator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css', '../../admin/shared/admin-page-title.css']
})
export class ContentCreatorDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly dashboardService = inject(ContentCreatorDashboardService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  readonly periodOptions = PERIOD_OPTIONS;
  readonly renderVersion = signal(0);

  user: UserDto | null = null;
  selectedPeriod: ContentCreatorDashboardPeriod = '30d';
  overview: ContentCreatorDashboardOverviewDto | null = null;

  isLoading = true;
  loadError = '';

  kpiCards: KpiCard[] = [];
  engagementSeries: TrendSeries[] = [];
  engagementYTop = '0';
  engagementYMid = '0';
  engagementLabels: string[] = [];
  engagementHoverZones: EngagementHoverZone[] = [];
  engagementIsEmpty = false;
  engagementSummary: { label: string; value: string; color: string }[] = [];
  statusRows: StatusRow[] = [];
  contentDonutTotal = 0;
  contentDonutSlices: DonutSlice[] = [];
  topContent: RankedContent[] = [];
  topDestinations: DestinationPerformance[] = [];
  ratingRows: RatingRow[] = [];
  upcomingEvents: ContentCreatorDashboardUpcomingEventItemDto[] = [];

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.selectedPeriod = this.readSavedPeriod();
    this.loadOverview();
  }

  selectPeriod(period: ContentCreatorDashboardPeriod): void {
    if (this.selectedPeriod === period || this.isLoading) {
      return;
    }

    this.selectedPeriod = period;
    this.saveSelectedPeriod(period);
    this.loadOverview();
  }

  retryLoad(): void {
    if (this.isLoading) {
      return;
    }

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
        return status || 'Not available';
    }
  }

  humanizeContentType(contentType: string): string {
    switch (contentType?.trim().toLowerCase()) {
      case 'touristobject':
      case 'object':
        return 'Objects';
      case 'event':
        return 'Events';
      case 'activity':
        return 'Activities';
      default:
        return contentType || 'Total content';
    }
  }

  formatShortDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  }

  getPublishedPercent(row: StatusRow): number {
    return row.publishedPercent;
  }

  getPendingPercent(row: StatusRow): number {
    return row.pendingPercent;
  }

  getRejectedPercent(row: StatusRow): number {
    return row.rejectedPercent;
  }

  getStarTrackWidth(percent: number): string {
    return `${percent}%`;
  }

  private getPercent(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  private loadOverview(): void {
    this.zone.run(() => {
      this.isLoading = true;
      this.loadError = '';
      this.requestRender();
    });

    this.dashboardService
      .getOverview(this.selectedPeriod)
      .pipe(timeout({ first: DASHBOARD_REQUEST_TIMEOUT_MS }))
      .subscribe({
        next: (overview) => {
          this.zone.run(() => {
            this.overview = overview;
            this.bindOverview(overview);
            this.isLoading = false;
            this.requestRender();
          });
        },
        error: (error: unknown) => {
          this.zone.run(() => {
            if (!this.overview) {
              this.resetDerivedState();
            }

            this.loadError = error instanceof TimeoutError
              ? 'Content creator dashboard data is taking too long to load. Check that the backend is running and try again.'
              : 'Content creator dashboard data could not be loaded right now.';
            this.isLoading = false;
            this.requestRender();
          });
        },
      });
  }

  private requestRender(): void {
    this.renderVersion.update((value) => value + 1);
    this.cdr.detectChanges();
  }

  private bindOverview(overview: ContentCreatorDashboardOverviewDto): void {
    this.bindKpiCards(overview);
    this.bindEngagementTrend(overview);
    this.bindContentStatus(overview);
    this.bindTopContent(overview.topContent ?? []);
    this.bindTopDestinations(overview.topDestinations ?? []);
    this.bindRatingDistribution(overview);
    this.upcomingEvents = (overview.upcomingEvents?.items ?? []).slice(0, 6);
  }

  private resetDerivedState(): void {
    this.kpiCards = [];
    this.engagementSeries = [];
    this.engagementYTop = '0';
    this.engagementYMid = '0';
    this.engagementLabels = [];
    this.engagementHoverZones = [];
    this.engagementIsEmpty = false;
    this.engagementSummary = [];
    this.statusRows = [];
    this.contentDonutTotal = 0;
    this.contentDonutSlices = [];
    this.topContent = [];
    this.topDestinations = [];
    this.ratingRows = [];
    this.upcomingEvents = [];
  }

  private bindKpiCards(overview: ContentCreatorDashboardOverviewDto): void {
    const summary = overview.summary;

    this.kpiCards = [
      {
        label: 'Published content',
        value: this.formatNumber(summary.publishedContent),
        meta: `${this.formatNumber(summary.totalContent)} total`,
        tone: 'green',
        icon: 'task_alt',
      },
      {
        label: 'Pending content',
        value: this.formatNumber(summary.pendingContent),
        meta: 'Waiting for moderation',
        tone: 'amber',
        icon: 'hourglass_top',
      },
      {
        label: 'Rejected content',
        value: this.formatNumber(summary.rejectedContent),
        meta: 'Needs edits before resubmission',
        tone: 'red',
        icon: 'cancel',
      },
      {
        label: 'Favorites',
        value: this.formatNumber(summary.favoritesInPeriod),
        meta: `During ${overview.periodKey}`,
        tone: 'purple',
        icon: 'favorite',
      },
      {
        label: 'Planner adds',
        value: this.formatNumber(summary.plannerAddsInPeriod),
        meta: 'Saved into plans',
        tone: 'blue',
        icon: 'event_available',
      },
      {
        label: 'New reviews',
        value: this.formatNumber(summary.unansweredReviews),
        meta: 'Reply soon',
        tone: 'teal',
        icon: 'forum',
      },
    ];
  }

  private bindEngagementTrend(overview: ContentCreatorDashboardOverviewDto): void {
    const points = overview.engagementTrend ?? [];
    const seriesDefs = [
      { key: 'favorites', label: 'Favorites', color: '#7c3aed', pick: (point: typeof points[number]) => point.favorites },
      { key: 'planner', label: 'Planner adds', color: '#2563eb', pick: (point: typeof points[number]) => point.plannerAdds },
      { key: 'reviews', label: 'Reviews', color: '#0d9488', pick: (point: typeof points[number]) => point.reviews },
    ];
    const allValues = points.flatMap((point) => [point.favorites, point.plannerAdds, point.reviews]);
    const maxVal = Math.max(...allValues, 0);
    const maxY = Math.max(maxVal, 1);
    const seriesValueSets = seriesDefs.map((def) => ({
      key: def.key,
      values: points.map(def.pick),
    }));

    this.engagementYTop = this.formatCompact(maxVal);
    this.engagementYMid = maxVal === 0 ? '0' : this.formatCompact(Math.round(maxVal / 2));
    this.engagementIsEmpty = maxVal === 0;

    const renderPointsBySeries = this.buildRenderPoints(seriesValueSets, maxY);
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

    this.engagementLabels = this.buildXAxisLabels(points, overview.engagementTrendGranularity);
    this.engagementSummary = [
      { label: 'Favorites', value: this.formatNumber(overview.summary.favoritesInPeriod), color: '#7c3aed' },
      { label: 'Planner adds', value: this.formatNumber(overview.summary.plannerAddsInPeriod), color: '#2563eb' },
      { label: 'Reviews', value: this.formatNumber(overview.summary.newReviewsInPeriod), color: '#0d9488' },
    ];
  }

  private bindContentStatus(overview: ContentCreatorDashboardOverviewDto): void {
    const rows = [
      { key: 'overall', label: 'Content status split', bucket: overview.contentStatus.overall },
      { key: 'objects', label: 'Objects', bucket: overview.contentStatus.objects },
      { key: 'events', label: 'Events', bucket: overview.contentStatus.events },
      { key: 'activities', label: 'Activities', bucket: overview.contentStatus.activities },
    ];
    const maxTotal = Math.max(...rows.map((row) => row.bucket.total), 1);

    this.statusRows = rows.map(({ key, label, bucket }) => this.toStatusRow(key, label, bucket, maxTotal));
    this.contentDonutTotal = overview.contentStatus.overall.total;
    this.contentDonutSlices = this.buildDonutSlices(overview.contentStatus.overall);
  }

  private bindTopContent(rows: ContentCreatorDashboardTopContentItemDto[]): void {
    const maxScore = Math.max(...rows.map((row) => row.engagementScore), 1);
    this.topContent = rows.slice(0, 6).map((row) => ({
      ...row,
      barPercent: Math.round((row.engagementScore / maxScore) * 1000) / 10,
    }));
  }

  private bindTopDestinations(rows: ContentCreatorDashboardTopDestinationItemDto[]): void {
    const maxScore = Math.max(...rows.map((row) => row.engagementScore), 1);
    this.topDestinations = rows.slice(0, 6).map((row) => ({
      ...row,
      barPercent: Math.round((row.engagementScore / maxScore) * 1000) / 10,
    }));
  }

  private bindRatingDistribution(overview: ContentCreatorDashboardOverviewDto): void {
    const distribution = overview.ratingDistribution;
    const total = Math.max(distribution.totalReviews, 1);

    this.ratingRows = [
      { label: '5 stars', count: distribution.fiveStars, percent: this.getPercent(distribution.fiveStars, total) },
      { label: '4 stars', count: distribution.fourStars, percent: this.getPercent(distribution.fourStars, total) },
      { label: '3 stars', count: distribution.threeStars, percent: this.getPercent(distribution.threeStars, total) },
      { label: '2 stars', count: distribution.twoStars, percent: this.getPercent(distribution.twoStars, total) },
      { label: '1 star', count: distribution.oneStar, percent: this.getPercent(distribution.oneStar, total) },
    ];
  }

  private toStatusRow(
    key: string,
    label: string,
    bucket: ContentCreatorDashboardStatusBucketDto,
    maxTotal: number,
  ): StatusRow {
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

  private buildDonutSlices(bucket: ContentCreatorDashboardStatusBucketDto): DonutSlice[] {
    const total = Math.max(bucket.total, 1);
    const definitions = [
      { label: 'Published', count: bucket.published, color: '#059669' },
      { label: 'Pending', count: bucket.pending, color: '#d97706' },
      { label: 'Rejected', count: bucket.rejected, color: '#dc2626' },
    ];
    let offset = 0;

    return definitions.map((definition) => {
      const percent = bucket.total <= 0 ? 0 : Math.round((definition.count / total) * 100);
      const slice: DonutSlice = {
        ...definition,
        percent,
        dashArray: `${percent} ${100 - percent}`,
        dashOffset: -offset,
      };
      offset += percent;
      return slice;
    });
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

    const count = seriesSets[0]?.values.length ?? 0;
    for (let index = 0; index < count; index++) {
      const x = (index / Math.max(count - 1, 1)) * 100;
      const groupedByValue = new Map<number, { key: string; value: number }[]>();

      for (const series of seriesSets) {
        const value = series.values[index] ?? 0;
        const bucket = groupedByValue.get(value) ?? [];
        bucket.push({ key: series.key, value });
        groupedByValue.set(value, bucket);
      }

      for (const [value, bucket] of groupedByValue.entries()) {
        const baseY = 100 - (value / maxY) * 100;
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

    const step = buckets.length > 1 ? 100 / (buckets.length - 1) : 100;

    return buckets.map((bucket, index) => {
      const center = buckets.length > 1 ? index * step : 50;
      const previousCenter = index === 0 ? 0 : (index - 1) * step;
      const nextCenter = index === buckets.length - 1 ? 100 : (index + 1) * step;
      const start = index === 0 ? 0 : (previousCenter + center) / 2;
      const end = index === buckets.length - 1 ? 100 : (center + nextCenter) / 2;

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

  private buildXAxisLabels(points: { date: string }[], granularity: string): string[] {
    if (!points.length) {
      return [];
    }

    const labelCount = Math.min(6, points.length);
    const step = labelCount <= 1 ? 1 : Math.max(1, Math.floor((points.length - 1) / (labelCount - 1)));
    const labels: string[] = [];

    for (let i = 0; i < points.length; i += step) {
      labels.push(this.formatBucketLabel(points[i].date, granularity));
    }

    const lastPoint = points[points.length - 1];
    const lastLabel = this.formatBucketLabel(lastPoint.date, granularity);
    if (labels[labels.length - 1] !== lastLabel) {
      labels.push(lastLabel);
    }

    return labels;
  }

  private formatBucketLabel(dateIso: string, granularity: string): string {
    const date = new Date(dateIso);

    if (granularity === 'month') {
      return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
    }

    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  }

  private formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value);
  }

  private formatCompact(value: number): string {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  private readSavedPeriod(): ContentCreatorDashboardPeriod {
    const saved = typeof localStorage !== 'undefined'
      ? localStorage.getItem(CONTENT_CREATOR_DASHBOARD_PERIOD_STORAGE_KEY)
      : null;

    return this.isValidPeriod(saved) ? saved : '30d';
  }

  private saveSelectedPeriod(period: ContentCreatorDashboardPeriod): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(CONTENT_CREATOR_DASHBOARD_PERIOD_STORAGE_KEY, period);
  }

  private isValidPeriod(value: string | null): value is ContentCreatorDashboardPeriod {
    return PERIOD_OPTIONS.some((option) => option.key === value);
  }
}