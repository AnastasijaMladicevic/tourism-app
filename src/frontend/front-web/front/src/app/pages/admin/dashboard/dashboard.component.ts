import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UserDto } from '../../../models/user.model';
import { AuthService } from '../../../services/auth.service';
import {
  AdminDashboardBannedUsersByRegionDto,
  AdminDashboardOverviewDto,
  AdminDashboardRoleDistributionItemDto,
  AdminDashboardService,
  AdminDashboardTopEngagedDestinationDto,
  AdminDashboardRegionEngagementDto,
  DashboardPeriod,
} from '../../../services/admin-dashboard.service';
import { DestinationDto } from '../../../services/destination.service';
import { AdminPlatformMapComponent } from '../../../shared/components/admin-platform-map/admin-platform-map.component';

interface PeriodOption {
  key: DashboardPeriod;
  label: string;
}

interface UserGrowthSeries {
  key: string;
  label: string;
  color: string;
  linePath: string;
}

interface UserGrowthHoverZone {
  x: number;
  width: number;
  title: string;
}

interface UserGrowthRenderPoint {
  x: number;
  y: number;
}

interface RoleDonutSlice {
  role: string;
  label: string;
  count: number;
  color: string;
  percent: number;
  path: string;
}

interface RegionCoverageRow {
  name: string;
  code: string;
  total: number;
  active: number;
  geocoded: number;
  barPercent: number;
}

interface BanRegionRow extends AdminDashboardBannedUsersByRegionDto {
  barPercent: number;
}

interface CreatorRequestSlice {
  label: string;
  count: number;
  color: string;
  percent: number;
}

interface TopDestinationRow extends AdminDashboardTopEngagedDestinationDto {
  barPercent: number;
}

interface RegionVisitRow extends AdminDashboardRegionEngagementDto {
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

const ROLE_COLORS: Record<string, string> = {
  Tourist: '#0d9488',
  ContentCreator: '#8b5cf6',
  Manager: '#d97706',
  Admin: '#dc2626',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, AdminPlatformMapComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css', '../shared/admin-page-stats-scroll.css'],
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminDashboardService = inject(AdminDashboardService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly periodOptions = PERIOD_OPTIONS;

  selectedPeriod: DashboardPeriod = '30d';
  user: UserDto | null = null;
  overview: AdminDashboardOverviewDto | null = null;

  isLoading = true;
  loadError = '';

  userGrowthSeries: UserGrowthSeries[] = [];
  userGrowthMaxY = 1;
  userGrowthYTop = '0';
  userGrowthYMid = '0';
  userGrowthXLabels: { label: string }[] = [];
  userGrowthIsEmpty = false;
  userGrowthHoverZones: UserGrowthHoverZone[] = [];

  roleDonutSlices: RoleDonutSlice[] = [];
  roleDonutTotal = 0;

  regionRows: RegionCoverageRow[] = [];
  banRegionRows: BanRegionRow[] = [];
  creatorSlices: CreatorRequestSlice[] = [];

  topDestinationRows: TopDestinationRow[] = [];
  regionVisitRows: RegionVisitRow[] = [];
  mapDestinations: DestinationDto[] = [];
  mapComponentId = 'admin-dashboard-map-0';
  private mapRenderVersion = 0;

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadOverview();
  }

  selectPeriod(period: DashboardPeriod): void {
    if (this.selectedPeriod === period || this.isLoading) {
      return;
    }

    this.selectedPeriod = period;
    this.cdr.detectChanges();
    this.loadOverview();
  }

  get granularityHint(): string {
    switch (this.overview?.userGrowthGranularity) {
      case 'week':
        return 'Grouped by week';
      case 'month':
        return 'Grouped by month';
      default:
        return 'Grouped by day';
    }
  }

  get hasVisitData(): boolean {
    return (
      (this.overview?.destinationEngagement.totalFavoriteAdds ?? 0) > 0 ||
      (this.overview?.destinationEngagement.totalPlannerAdds ?? 0) > 0 ||
      (this.overview?.destinationEngagement.ratedDestinations ?? 0) > 0
    );
  }

  private loadOverview(): void {
    this.isLoading = true;
    this.loadError = '';
    this.cdr.detectChanges();

    this.adminDashboardService
      .getOverview(this.selectedPeriod)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: (overview) => {
          const normalized = this.normalizeOverview(overview);
          this.overview = normalized;
          this.bindOverview(normalized);
          this.cdr.detectChanges();
        },
        error: () => {
          this.overview = null;
          this.resetDerivedState();
          this.loadError = 'Dashboard data could not be loaded right now.';
          this.cdr.detectChanges();
        },
      });
  }

  private normalizeOverview(overview: AdminDashboardOverviewDto): AdminDashboardOverviewDto {
    return {
      ...overview,
      destinationsByRegion: overview.destinationsByRegion ?? [],
      creatorRequests: {
        pending: overview.creatorRequests?.pending ?? overview.summary?.pendingCreatorRequests ?? 0,
        approved: overview.creatorRequests?.approved ?? 0,
        rejected: overview.creatorRequests?.rejected ?? 0,
        none: overview.creatorRequests?.none ?? 0,
        totalSubmitted: overview.creatorRequests?.totalSubmitted ?? 0,
      },
      reports: {
        pending: overview.reports?.pending ?? 0,
        approved: overview.reports?.approved ?? 0,
        rejected: overview.reports?.rejected ?? 0,
        total: overview.reports?.total ?? 0,
      },
      banOverview: {
        temporarilyBanned: overview.banOverview?.temporarilyBanned ?? 0,
        permanentlyBanned: overview.banOverview?.permanentlyBanned ?? 0,
        totalBanned: overview.banOverview?.totalBanned ?? 0,
        regions: overview.banOverview?.regions ?? [],
      },
      destinationEngagement: {
        totalFavoriteAdds: overview.destinationEngagement?.totalFavoriteAdds ?? 0,
        totalPlannerAdds: overview.destinationEngagement?.totalPlannerAdds ?? 0,
        ratedDestinations: overview.destinationEngagement?.ratedDestinations ?? 0,
        topDestinations: overview.destinationEngagement?.topDestinations ?? [],
        regionEngagement: overview.destinationEngagement?.regionEngagement ?? [],
      },
      geospatialOverview: {
        totalActiveDestinationsWithCoordinates: overview.geospatialOverview?.totalActiveDestinationsWithCoordinates ?? 0,
        regionsRepresented: overview.geospatialOverview?.regionsRepresented ?? 0,
        displayedPoints: overview.geospatialOverview?.displayedPoints ?? 0,
        points: overview.geospatialOverview?.points ?? [],
      },
    };
  }

  private bindOverview(overview: AdminDashboardOverviewDto): void {
    this.bindUserGrowth(overview);
    this.bindRoleDistribution(overview.roleDistribution);
    this.bindDestinationsByRegion(overview);
    this.bindBanOverview(overview);
    this.bindCreatorRequests(overview);
    this.bindDestinationEngagement(overview);
    this.bindMapPoints(overview);
  }

  private resetDerivedState(): void {
    this.userGrowthSeries = [];
    this.userGrowthMaxY = 1;
    this.userGrowthYTop = '0';
    this.userGrowthYMid = '0';
    this.userGrowthXLabels = [];
    this.userGrowthIsEmpty = false;
    this.userGrowthHoverZones = [];
    this.roleDonutSlices = [];
    this.roleDonutTotal = 0;
    this.regionRows = [];
    this.banRegionRows = [];
    this.creatorSlices = [];
    this.topDestinationRows = [];
    this.regionVisitRows = [];
    this.mapDestinations = [];
  }

  private bindUserGrowth(overview: AdminDashboardOverviewDto): void {
    const points = overview.userGrowth;
    const seriesDefs = [
      { key: 'tourists', label: 'Tourists', color: ROLE_COLORS['Tourist'], pick: (p: typeof points[number]) => p.tourists },
      { key: 'creators', label: 'Creators', color: ROLE_COLORS['ContentCreator'], pick: (p: typeof points[number]) => p.contentCreators },
      { key: 'managers', label: 'Managers', color: ROLE_COLORS['Manager'], pick: (p: typeof points[number]) => p.managers },
      { key: 'admins', label: 'Admins', color: ROLE_COLORS['Admin'], pick: (p: typeof points[number]) => p.admins },
    ];

    const allValues = points.flatMap((p) => [p.tourists, p.contentCreators, p.managers, p.admins]);
    const maxVal = Math.max(...allValues, 0);
    const seriesValueSets = seriesDefs.map((def) => ({
      key: def.key,
      label: def.label,
      values: points.map(def.pick),
    }));

    this.userGrowthMaxY = Math.max(maxVal, 1);
    this.userGrowthYTop = String(maxVal);
    this.userGrowthYMid = maxVal === 0 ? '0' : String(Math.round(maxVal / 2));
    this.userGrowthIsEmpty = maxVal === 0;

    const renderPointsBySeries = this.buildUserGrowthRenderPoints(seriesValueSets, this.userGrowthMaxY);

    this.userGrowthSeries = seriesDefs.map((def) => ({
      key: def.key,
      label: def.label,
      color: def.color,
      linePath: this.buildLinePath(renderPointsBySeries[def.key] ?? []),
    }));

    this.userGrowthHoverZones = this.buildUserGrowthHoverZones(
      points.map((point) => ({
        label: this.formatBucketLabel(point.date, overview.userGrowthGranularity),
        tourists: point.tourists,
        creators: point.contentCreators,
        managers: point.managers,
        admins: point.admins,
      })),
    );

    const labelCount = Math.min(6, points.length);
    const step = labelCount <= 1 ? 1 : Math.max(1, Math.floor((points.length - 1) / (labelCount - 1)));
    this.userGrowthXLabels = [];

    for (let i = 0; i < points.length; i += step) {
      this.userGrowthXLabels.push({
        label: this.formatBucketLabel(points[i].date, overview.userGrowthGranularity),
      });
    }

    const lastPoint = points[points.length - 1];
    if (
      lastPoint &&
      this.userGrowthXLabels[this.userGrowthXLabels.length - 1]?.label !==
        this.formatBucketLabel(lastPoint.date, overview.userGrowthGranularity)
    ) {
      this.userGrowthXLabels.push({
        label: this.formatBucketLabel(lastPoint.date, overview.userGrowthGranularity),
      });
    }
  }

  private bindRoleDistribution(roleDistribution: AdminDashboardRoleDistributionItemDto[]): void {
    this.roleDonutTotal = roleDistribution.reduce((sum, role) => sum + role.count, 0);
    this.roleDonutSlices = this.buildDonutSlices(
      roleDistribution.map((role) => ({
        role: role.role,
        label: this.humanizeRole(role.role),
        count: role.count,
        color: ROLE_COLORS[role.role] ?? '#64748b',
      })),
    );
  }

  private bindDestinationsByRegion(overview: AdminDashboardOverviewDto): void {
    const rows = overview.destinationsByRegion.map((row) => ({
      name: row.regionName,
      code: row.regionCode,
      total: row.totalDestinations,
      active: row.activeDestinations,
      geocoded: row.geocodedDestinations,
      barPercent: 0,
    }));

    const maxRegion = Math.max(...rows.map((row) => row.total), 1);
    rows.forEach((row) => {
      row.barPercent = Math.round((row.total / maxRegion) * 1000) / 10;
    });

    this.regionRows = rows;
  }

  private bindBanOverview(overview: AdminDashboardOverviewDto): void {
    const maxBanned = Math.max(...overview.banOverview.regions.map((row) => row.totalBanned), 1);
    this.banRegionRows = overview.banOverview.regions.map((row) => ({
      ...row,
      barPercent: Math.round((row.totalBanned / maxBanned) * 1000) / 10,
    }));
  }

  private bindCreatorRequests(overview: AdminDashboardOverviewDto): void {
    const creatorRequests = overview.creatorRequests;
    const total = Math.max(creatorRequests.pending + creatorRequests.approved + creatorRequests.rejected, 1);

    this.creatorSlices = [
      { label: 'Pending', count: creatorRequests.pending, color: '#d97706', percent: (creatorRequests.pending / total) * 100 },
      { label: 'Approved', count: creatorRequests.approved, color: '#059669', percent: (creatorRequests.approved / total) * 100 },
      { label: 'Rejected', count: creatorRequests.rejected, color: '#dc2626', percent: (creatorRequests.rejected / total) * 100 },
    ];
  }

  private bindDestinationEngagement(overview: AdminDashboardOverviewDto): void {
    const engagement = overview.destinationEngagement;
    const maxDestinationScore = Math.max(...engagement.topDestinations.map((row) => row.engagementScore), 1);
    const maxRegionScore = Math.max(...engagement.regionEngagement.map((row) => row.engagementScore), 1);

    this.topDestinationRows = engagement.topDestinations.map((row) => ({
      ...row,
      barPercent: Math.round((row.engagementScore / maxDestinationScore) * 1000) / 10,
    }));

    this.regionVisitRows = engagement.regionEngagement.map((row) => ({
      ...row,
      barPercent: Math.round((row.engagementScore / maxRegionScore) * 1000) / 10,
    }));
  }

  private bindMapPoints(overview: AdminDashboardOverviewDto): void {
    this.mapDestinations = overview.geospatialOverview.points.map((point) => ({
      id: point.destinationId,
      name: point.destinationName,
      latitude: point.latitude,
      longitude: point.longitude,
      isActive: true,
      destinationTypeId: 0,
      destinationTypeName: 'Destination',
      regionId: point.regionId,
      regionName: point.regionName,
    }));
    this.mapRenderVersion += 1;
    this.mapComponentId = `admin-dashboard-map-${this.mapRenderVersion}`;
  }

  private humanizeRole(role: string): string {
    switch (role) {
      case 'ContentCreator':
        return 'Creators';
      case 'Manager':
        return 'Managers';
      case 'Admin':
        return 'Admins';
      default:
        return 'Tourists';
    }
  }

  private buildDonutSlices(
    roles: { role: string; label: string; count: number; color: string }[],
  ): RoleDonutSlice[] {
    const total = roles.reduce((sum, role) => sum + role.count, 0);
    if (total <= 0) {
      return [];
    }

    const cx = 50;
    const cy = 50;
    const outerR = 38;
    const innerR = 24;
    let angle = -Math.PI / 2;

    return roles
      .filter((role) => role.count > 0)
      .map((role) => {
        const slice = (role.count / total) * Math.PI * 2;
        const start = angle;
        const end = angle + slice;
        angle = end;

        return {
          role: role.role,
          label: role.label,
          count: role.count,
          color: role.color,
          percent: Math.round((role.count / total) * 1000) / 10,
          path: this.arcDonutPath(cx, cy, outerR, innerR, start, end),
        };
      });
  }

  private arcDonutPath(
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    start: number,
    end: number,
  ): string {
    const x1 = cx + outerR * Math.cos(start);
    const y1 = cy + outerR * Math.sin(start);
    const x2 = cx + outerR * Math.cos(end);
    const y2 = cy + outerR * Math.sin(end);
    const x3 = cx + innerR * Math.cos(end);
    const y3 = cy + innerR * Math.sin(end);
    const x4 = cx + innerR * Math.cos(start);
    const y4 = cy + innerR * Math.sin(start);
    const large = end - start > Math.PI ? 1 : 0;

    return [
      `M ${x1} ${y1}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');
  }

  private buildLinePath(points: UserGrowthRenderPoint[]): string {
    if (!points.length) {
      return '';
    }

    return points
      .map((point, index) => {
        return `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
      })
      .join(' ');
  }

  private buildUserGrowthRenderPoints(
    seriesSets: { key: string; values: number[] }[],
    maxY: number,
  ): Record<string, UserGrowthRenderPoint[]> {
    const result: Record<string, UserGrowthRenderPoint[]> = Object.fromEntries(
      seriesSets.map((series) => [series.key, [] as UserGrowthRenderPoint[]]),
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

  private buildUserGrowthHoverZones(
    buckets: { label: string; tourists: number; creators: number; managers: number; admins: number }[],
  ): UserGrowthHoverZone[] {
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
          `Tourists: ${bucket.tourists}`,
          `Creators: ${bucket.creators}`,
          `Managers: ${bucket.managers}`,
          `Admins: ${bucket.admins}`,
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
}
