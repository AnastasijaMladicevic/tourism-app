import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { UserDto } from '../../../models/user.model';
import { AuthService } from '../../../services/auth.service';
import {
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

interface HealthGroup {
  label: string;
  segments: { label: string; value: number; color: string; percent: number }[];
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
  ContentCreator: '#6366f1',
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

  roleDonutSlices: RoleDonutSlice[] = [];
  roleDonutTotal = 0;

  regionRows: RegionCoverageRow[] = [];
  healthGroups: HealthGroup[] = [];
  creatorSlices: CreatorRequestSlice[] = [];

  topDestinationRows: TopDestinationRow[] = [];
  regionVisitRows: RegionVisitRow[] = [];
  mapDestinations: DestinationDto[] = [];

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
          this.overview = overview;
          this.bindOverview(overview);
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

  private bindOverview(overview: AdminDashboardOverviewDto): void {
    this.bindUserGrowth(overview);
    this.bindRoleDistribution(overview.roleDistribution);
    this.bindDestinationsByRegion(overview);
    this.bindAccountHealth(overview);
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
    this.roleDonutSlices = [];
    this.roleDonutTotal = 0;
    this.regionRows = [];
    this.healthGroups = [];
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

    this.userGrowthMaxY = Math.max(maxVal, 1);
    this.userGrowthYTop = String(maxVal);
    this.userGrowthYMid = maxVal === 0 ? '0' : String(Math.round(maxVal / 2));
    this.userGrowthIsEmpty = maxVal === 0;

    this.userGrowthSeries = seriesDefs.map((def) => ({
      key: def.key,
      label: def.label,
      color: def.color,
      linePath: this.buildLinePath(points.map(def.pick), this.userGrowthMaxY),
    }));

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

  private bindAccountHealth(overview: AdminDashboardOverviewDto): void {
    const health = overview.accountHealth;
    this.healthGroups = [
      {
        label: 'Verification',
        segments: [
          { label: 'Verified', value: health.verified, color: '#059669', percent: 0 },
          { label: 'Unverified', value: health.unverified, color: '#94a3b8', percent: 0 },
        ],
      },
      {
        label: 'Activity',
        segments: [
          { label: 'Active', value: health.active, color: '#1976d2', percent: 0 },
          { label: 'Inactive', value: health.inactive, color: '#cbd5e1', percent: 0 },
        ],
      },
      {
        label: 'Bans',
        segments: [
          { label: 'Temporary', value: health.temporarilyBanned, color: '#d97706', percent: 0 },
          { label: 'Permanent', value: health.permanentlyBanned, color: '#dc2626', percent: 0 },
        ],
      },
    ];

    for (const group of this.healthGroups) {
      const total = group.segments.reduce((sum, segment) => sum + segment.value, 0);
      group.segments.forEach((segment) => {
        segment.percent = total > 0 ? Math.round((segment.value / total) * 1000) / 10 : 0;
      });
    }
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

  private buildLinePath(values: number[], maxY: number): string {
    if (!values.length || maxY <= 0) {
      return '';
    }

    const width = 100;
    const height = 100;

    return values
      .map((value, index) => {
        const x = (index / Math.max(values.length - 1, 1)) * width;
        const y = height - (value / maxY) * height;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
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
