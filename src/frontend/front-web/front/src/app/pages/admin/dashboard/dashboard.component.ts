import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserDto } from '../../../models/user.model';

export type DashboardPeriod = '7d' | '30d' | '3m' | '6m' | '1y' | '5y';

interface PeriodOption {
  key: DashboardPeriod;
  label: string;
}

interface UserGrowthSeries {
  key: string;
  label: string;
  color: string;
  linePath: string;
  values: number[];
}

interface RoleDonutSlice {
  role: string;
  label: string;
  count: number;
  color: string;
  percent: number;
  path: string;
}

interface RegionRow {
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

interface ReportSlice {
  label: string;
  count: number;
  color: string;
  percent: number;
}

interface AdminActivityItem {
  initials: string;
  avatarTone: 'indigo' | 'teal' | 'violet' | 'amber' | 'blue' | 'slate';
  actorName: string;
  actionText: string;
  targetLabel: string;
  timeLabel: string;
  roleBadge: string;
  roleIcon: string;
  routerLink: string | (string | number)[];
}

const ACTIVITY_PAGE_SIZE = 5;

/** UI mock — mirrors AdminDashboardOverviewDto until overview API is wired. */
interface DashboardMockOverview {
  summary: {
    totalTourists: number;
    newTouristsInPeriod: number;
    activeDestinations: number;
    newDestinationsInPeriod: number;
    pendingCreatorRequests: number;
    openReports: number;
  };
  userGrowth: { label: string; tourists: number; creators: number; managers: number; admins: number }[];
  granularityLabel: string;
  roleDistribution: { role: string; label: string; count: number; color: string }[];
  destinationsByRegion: RegionRow[];
  creatorRequests: {
    pending: number;
    approved: number;
    rejected: number;
    none: number;
    totalSubmitted: number;
  };
  reports: { pending: number; approved: number; rejected: number; total: number };
  accountHealth: {
    verified: number;
    unverified: number;
    active: number;
    inactive: number;
    temporarilyBanned: number;
    permanentlyBanned: number;
    totalBanned: number;
  };
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '3m', label: '3m' },
  { key: '6m', label: '6m' },
  { key: '1y', label: '1y' },
  { key: '5y', label: '5y' }
];

const ROLE_COLORS: Record<string, string> = {
  Tourist: '#0d9488',
  ContentCreator: '#6366f1',
  Manager: '#d97706',
  Admin: '#dc2626'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly periodOptions = PERIOD_OPTIONS;
  selectedPeriod: DashboardPeriod = '30d';

  user: UserDto | null = null;

  isLoading = true;
  loadError = '';

  overview!: DashboardMockOverview;

  userGrowthSeries: UserGrowthSeries[] = [];
  userGrowthMaxY = 1;
  userGrowthYTop = '0';
  userGrowthYMid = '0';
  userGrowthXLabels: { label: string }[] = [];
  userGrowthIsEmpty = false;
  roleDonutSlices: RoleDonutSlice[] = [];
  roleDonutTotal = 0;
  regionRows: RegionRow[] = [];
  healthGroups: HealthGroup[] = [];
  creatorSlices: CreatorRequestSlice[] = [];
  reportSlices: ReportSlice[] = [];

  activityItems: AdminActivityItem[] = [];
  activityVisibleCount = ACTIVITY_PAGE_SIZE;

  get visibleActivityItems(): AdminActivityItem[] {
    return this.activityItems.slice(0, this.activityVisibleCount);
  }

  get canLoadMoreActivity(): boolean {
    return this.activityVisibleCount < this.activityItems.length;
  }

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.applyMockOverview();
  }

  selectPeriod(period: DashboardPeriod): void {
    if (this.selectedPeriod === period) return;
    this.selectedPeriod = period;
    this.applyMockOverview();
    this.cdr.markForCheck();
  }

  loadMoreActivity(): void {
    this.activityVisibleCount = Math.min(
      this.activityVisibleCount + ACTIVITY_PAGE_SIZE,
      this.activityItems.length
    );
    this.cdr.markForCheck();
  }

  reload(): void {
    this.applyMockOverview();
  }

  granularityHint(): string {
    const p = this.selectedPeriod;
    if (p === '7d' || p === '30d') return 'Grouped by day';
    if (p === '3m' || p === '6m') return 'Grouped by week';
    return 'Grouped by month';
  }

  private applyMockOverview(): void {
    this.overview = this.buildMockOverview(this.selectedPeriod);
    this.bindCharts(this.overview);
    this.activityItems = this.buildMockActivity(this.selectedPeriod);
    this.activityVisibleCount = ACTIVITY_PAGE_SIZE;
    this.isLoading = false;
    this.loadError = '';
    this.cdr.markForCheck();
  }

  private buildMockActivity(period: DashboardPeriod): AdminActivityItem[] {
    const times: Record<DashboardPeriod, string[]> = {
      '7d': ['2 hours ago', '5 hours ago', 'Yesterday at 14:20', '2 days ago', '3 days ago', '4 days ago', '6 days ago'],
      '30d': ['2 hours ago', 'Yesterday at 14:20', '3 days ago', '1 week ago', '2 weeks ago', '3 weeks ago', '4 weeks ago'],
      '3m': ['Yesterday', '1 week ago', '2 weeks ago', '1 month ago', '6 weeks ago', '2 months ago', '10 weeks ago'],
      '6m': ['3 days ago', '2 weeks ago', '1 month ago', '2 months ago', '3 months ago', '4 months ago', '5 months ago'],
      '1y': ['1 week ago', '1 month ago', '3 months ago', '5 months ago', '7 months ago', '9 months ago', '11 months ago'],
      '5y': ['2 months ago', '6 months ago', '1 year ago', '2 years ago', '3 years ago', '4 years ago', '5 years ago']
    };
    const t = times[period];

    return [
      {
        initials: 'MJ',
        avatarTone: 'indigo',
        actorName: 'Marko J.',
        actionText: 'updated settings for',
        targetLabel: 'Spire Mountain Resort',
        timeLabel: t[0],
        roleBadge: 'ADMIN',
        roleIcon: 'admin_panel_settings',
        routerLink: ['/admin/destinations']
      },
      {
        initials: 'EP',
        avatarTone: 'teal',
        actorName: 'Elena P.',
        actionText: 'published a new guide for',
        targetLabel: 'Bay of Kotor',
        timeLabel: t[1],
        roleBadge: 'CONTENT CREATOR',
        roleIcon: 'edit_note',
        routerLink: ['/admin/destinations']
      },
      {
        initials: 'NK',
        avatarTone: 'amber',
        actorName: 'Nikola K.',
        actionText: 'assigned manager to',
        targetLabel: 'Lake Skadar Reserve',
        timeLabel: t[2],
        roleBadge: 'MANAGER',
        roleIcon: 'supervisor_account',
        routerLink: ['/admin/users']
      },
      {
        initials: 'AS',
        avatarTone: 'violet',
        actorName: 'Ana S.',
        actionText: 'approved creator request for',
        targetLabel: 'Coastal Trail Network',
        timeLabel: t[3],
        roleBadge: 'ADMIN',
        roleIcon: 'verified',
        routerLink: ['/admin/users']
      },
      {
        initials: 'DM',
        avatarTone: 'blue',
        actorName: 'Davor M.',
        actionText: 'resolved report on',
        targetLabel: 'Old Town Heritage Walk',
        timeLabel: t[4],
        roleBadge: 'MANAGER',
        roleIcon: 'flag',
        routerLink: ['/admin/users']
      },
      {
        initials: 'IL',
        avatarTone: 'slate',
        actorName: 'Ivana L.',
        actionText: 'created destination',
        targetLabel: 'Prokletije Peaks',
        timeLabel: t[5],
        roleBadge: 'ADMIN',
        roleIcon: 'add_location_alt',
        routerLink: ['/admin/destinations']
      },
      {
        initials: 'TG',
        avatarTone: 'teal',
        actorName: 'Tea G.',
        actionText: 'updated media for',
        targetLabel: 'Biogradska Gora',
        timeLabel: t[6],
        roleBadge: 'CONTENT CREATOR',
        roleIcon: 'photo_library',
        routerLink: ['/admin/destinations']
      }
    ];
  }

  private buildMockOverview(period: DashboardPeriod): DashboardMockOverview {
    const scale = this.periodScale(period);
    const points = this.periodPointCount(period);

    const userGrowth = Array.from({ length: points }, (_, i) => {
      const wave = Math.sin((i / points) * Math.PI * 2) * 0.35 + 0.65;
      const bump = 1 + (i / points) * 0.2;
      return {
        label: this.bucketLabel(period, i, points),
        tourists: Math.round((12 + i * 1.8) * wave * bump * scale),
        creators: Math.round((2 + i * 0.4) * wave * scale),
        managers: Math.round((0.5 + i * 0.15) * wave * scale),
        admins: Math.max(0, Math.round((0.2 + i * 0.05) * wave * scale))
      };
    });

    const roles = [
      { role: 'Tourist', label: 'Tourists', count: Math.round(2840 * scale), color: ROLE_COLORS['Tourist'] },
      { role: 'ContentCreator', label: 'Creators', count: Math.round(186 * scale), color: ROLE_COLORS['ContentCreator'] },
      { role: 'Manager', label: 'Managers', count: Math.round(42 * scale), color: ROLE_COLORS['Manager'] },
      { role: 'Admin', label: 'Admins', count: Math.round(8 * scale), color: ROLE_COLORS['Admin'] }
    ];

    const regions: RegionRow[] = [
      { name: 'Coastal Montenegro', code: 'ME-CO', total: 48, active: 41, geocoded: 38 },
      { name: 'Central Region', code: 'ME-CE', total: 32, active: 28, geocoded: 24 },
      { name: 'Northern Highlands', code: 'ME-NH', total: 21, active: 17, geocoded: 12 },
      { name: 'Lake District', code: 'ME-LD', total: 15, active: 14, geocoded: 11 },
      { name: 'Bay of Kotor', code: 'ME-BK', total: 12, active: 11, geocoded: 10 }
    ].map((r) => ({
      ...r,
      total: Math.round(r.total * (0.85 + scale * 0.15)),
      active: Math.round(r.active * (0.85 + scale * 0.15)),
      geocoded: Math.round(r.geocoded * (0.85 + scale * 0.15)),
      barPercent: 0
    }));
    const maxRegion = Math.max(...regions.map((r) => r.total), 1);
    regions.forEach((r) => (r.barPercent = Math.round((r.total / maxRegion) * 1000) / 10));

    const pendingCc = Math.max(3, Math.round(7 * (period === '7d' ? 1.2 : 0.9)));
    const approvedCc = Math.round(34 * scale);
    const rejectedCc = Math.round(11 * scale);

    return {
      summary: {
        totalTourists: Math.round(2840 * scale),
        newTouristsInPeriod: userGrowth.reduce((s, p) => s + p.tourists, 0),
        activeDestinations: Math.round(98 * (0.9 + scale * 0.1)),
        newDestinationsInPeriod: Math.round(4 + scale * 3),
        pendingCreatorRequests: pendingCc,
        openReports: Math.round(5 + scale * 2)
      },
      userGrowth,
      granularityLabel: this.granularityHint(),
      roleDistribution: roles,
      destinationsByRegion: regions,
      creatorRequests: {
        pending: pendingCc,
        approved: approvedCc,
        rejected: rejectedCc,
        none: Math.round(120 * scale),
        totalSubmitted: pendingCc + approvedCc + rejectedCc
      },
      reports: {
        pending: Math.round(5 + scale * 2),
        approved: Math.round(28 * scale),
        rejected: Math.round(9 * scale),
        total: 0
      },
      accountHealth: {
        verified: Math.round(2100 * scale),
        unverified: Math.round(740 * scale),
        active: Math.round(2650 * scale),
        inactive: Math.round(190 * scale),
        temporarilyBanned: Math.round(12 * scale),
        permanentlyBanned: Math.round(4 * scale),
        totalBanned: 0
      }
    };
  }

  private bindCharts(data: DashboardMockOverview): void {
    data.reports.total = data.reports.pending + data.reports.approved + data.reports.rejected;
    data.accountHealth.totalBanned =
      data.accountHealth.temporarilyBanned + data.accountHealth.permanentlyBanned;

    const seriesDefs = [
      { key: 'tourists', label: 'Tourists', color: ROLE_COLORS['Tourist'], pick: (p: (typeof data.userGrowth)[0]) => p.tourists },
      { key: 'creators', label: 'Creators', color: ROLE_COLORS['ContentCreator'], pick: (p: (typeof data.userGrowth)[0]) => p.creators },
      { key: 'managers', label: 'Managers', color: ROLE_COLORS['Manager'], pick: (p: (typeof data.userGrowth)[0]) => p.managers },
      { key: 'admins', label: 'Admins', color: ROLE_COLORS['Admin'], pick: (p: (typeof data.userGrowth)[0]) => p.admins }
    ];

    const allValues = data.userGrowth.flatMap((p) => [p.tourists, p.creators, p.managers, p.admins]);
    const maxVal = Math.max(...allValues, 0);
    this.userGrowthMaxY = Math.max(maxVal, 1);
    this.userGrowthYTop = String(maxVal);
    this.userGrowthYMid = maxVal === 0 ? '0' : String(Math.round(maxVal / 2));
    this.userGrowthIsEmpty = maxVal === 0;

    this.userGrowthSeries = seriesDefs.map((def) => {
      const values = data.userGrowth.map(def.pick);
      return {
        key: def.key,
        label: def.label,
        color: def.color,
        values,
        linePath: this.buildLinePath(values, this.userGrowthMaxY)
      };
    });

    const labelCount = Math.min(5, data.userGrowth.length);
    const step = Math.max(1, Math.floor((data.userGrowth.length - 1) / (labelCount - 1)));
    this.userGrowthXLabels = [];
    for (let i = 0; i < data.userGrowth.length; i += step) {
      this.userGrowthXLabels.push({ label: data.userGrowth[i].label });
    }
    const last = data.userGrowth[data.userGrowth.length - 1];
    if (this.userGrowthXLabels[this.userGrowthXLabels.length - 1]?.label !== last.label) {
      this.userGrowthXLabels.push({ label: last.label });
    }

    this.roleDonutTotal = data.roleDistribution.reduce((s, r) => s + r.count, 0);
    this.roleDonutSlices = this.buildDonutSlices(data.roleDistribution);
    this.regionRows = data.destinationsByRegion;

    const h = data.accountHealth;
    this.healthGroups = [
      {
        label: 'Verification',
        segments: [
          { label: 'Verified', value: h.verified, color: '#059669', percent: 0 },
          { label: 'Unverified', value: h.unverified, color: '#94a3b8', percent: 0 }
        ]
      },
      {
        label: 'Activity',
        segments: [
          { label: 'Active', value: h.active, color: '#1976d2', percent: 0 },
          { label: 'Inactive', value: h.inactive, color: '#cbd5e1', percent: 0 }
        ]
      },
      {
        label: 'Bans',
        segments: [
          { label: 'Temporary', value: h.temporarilyBanned, color: '#d97706', percent: 0 },
          { label: 'Permanent', value: h.permanentlyBanned, color: '#dc2626', percent: 0 }
        ]
      }
    ];
    for (const group of this.healthGroups) {
      const total = group.segments.reduce((s, seg) => s + seg.value, 0);
      group.segments.forEach((seg) => {
        seg.percent = total > 0 ? Math.round((seg.value / total) * 1000) / 10 : 0;
      });
    }

    const cr = data.creatorRequests;
    const crTotal = Math.max(cr.pending + cr.approved + cr.rejected, 1);
    this.creatorSlices = [
      { label: 'Pending', count: cr.pending, color: '#d97706', percent: (cr.pending / crTotal) * 100 },
      { label: 'Approved', count: cr.approved, color: '#059669', percent: (cr.approved / crTotal) * 100 },
      { label: 'Rejected', count: cr.rejected, color: '#dc2626', percent: (cr.rejected / crTotal) * 100 }
    ];

    const rep = data.reports;
    const repTotal = Math.max(rep.total, 1);
    this.reportSlices = [
      { label: 'Pending', count: rep.pending, color: '#d97706', percent: (rep.pending / repTotal) * 100 },
      { label: 'Approved', count: rep.approved, color: '#059669', percent: (rep.approved / repTotal) * 100 },
      { label: 'Rejected', count: rep.rejected, color: '#dc2626', percent: (rep.rejected / repTotal) * 100 }
    ];
  }

  private buildDonutSlices(
    roles: { role: string; label: string; count: number; color: string }[]
  ): RoleDonutSlice[] {
    const total = roles.reduce((s, r) => s + r.count, 0);
    if (total <= 0) return [];

    const cx = 50;
    const cy = 50;
    const outerR = 38;
    const innerR = 24;
    let angle = -Math.PI / 2;

    return roles
      .filter((r) => r.count > 0)
      .map((r) => {
        const slice = (r.count / total) * Math.PI * 2;
        const start = angle;
        const end = angle + slice;
        angle = end;
        const percent = Math.round((r.count / total) * 1000) / 10;
        return {
          role: r.role,
          label: r.label,
          count: r.count,
          color: r.color,
          percent,
          path: this.arcDonutPath(cx, cy, outerR, innerR, start, end)
        };
      });
  }

  private arcDonutPath(
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    start: number,
    end: number
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
      'Z'
    ].join(' ');
  }

  private buildLinePath(values: number[], maxY: number): string {
    if (!values.length || maxY <= 0) return '';
    const w = 100;
    const h = 100;
    return values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * w;
        const y = h - (v / maxY) * h;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private periodScale(period: DashboardPeriod): number {
    const map: Record<DashboardPeriod, number> = {
      '7d': 0.35,
      '30d': 1,
      '3m': 2.4,
      '6m': 3.8,
      '1y': 6.2,
      '5y': 14
    };
    return map[period];
  }

  private periodPointCount(period: DashboardPeriod): number {
    if (period === '7d') return 7;
    if (period === '30d') return 14;
    if (period === '3m') return 12;
    if (period === '6m') return 16;
    if (period === '1y') return 12;
    return 10;
  }

  private bucketLabel(period: DashboardPeriod, index: number, total: number): string {
    if (period === '7d' || period === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - (total - 1 - index));
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);
    }
    if (period === '3m' || period === '6m') {
      return `W${index + 1}`;
    }
    const d = new Date();
    d.setMonth(d.getMonth() - (total - 1 - index));
    return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(d);
  }
}
