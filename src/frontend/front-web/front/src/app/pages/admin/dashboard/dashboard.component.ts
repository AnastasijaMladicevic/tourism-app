import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import {
  AdminUserListItemDto,
  AdminUsersService,
  CreatorRoleRequestDto
} from '../../../services/admin-users.service';
import {
  ManagerReportDto,
  ManagerReportsService
} from '../../../services/manager-reports.service';
import { DestinationDto, DestinationService } from '../../../services/destination.service';
import { MapService } from '../../../services/map.service';
import { AuthService } from '../../../services/auth.service';
import { UserDto } from '../../../models/user.model';

const CHART_DAYS = 14;
const MAX_USER_PAGES = 25;
const MAX_REPORT_PAGES = 10;

interface TopOriginRow {
  name: string;
  users: number;
  barPercent: number;
}

interface PlatformActivityItem {
  initials: string;
  avatarTone: 'indigo' | 'teal' | 'violet' | 'amber' | 'slate';
  title: string;
  detail: string;
  timeLabel: string;
  roleBadge: string;
  sortAt: number;
  routerLink: string | (string | number)[];
  queryParams?: Record<string, string>;
}

interface ReportStatusSlice {
  label: string;
  count: number;
  color: string;
  percent: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly adminUsers = inject(AdminUsersService);
  private readonly managerReports = inject(ManagerReportsService);
  private readonly destinationService = inject(DestinationService);
  private readonly mapService = inject(MapService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  user: UserDto | null = null;

  private mapViewReady = false;
  private mapDestinations: DestinationDto[] = [];

  isLoading = true;
  loadError = '';

  totalTourists = 0;
  newTourists7d = 0;
  touristSignupDeltaPercent = 0;
  pendingCreatorRequests = 0;
  pendingManagerReports = 0;
  bannedUsers = 0;
  bannedTourists = 0;
  teamTotal = 0;
  teamAdmins = 0;
  teamManagers = 0;
  teamCreators = 0;
  destinationCount = 0;
  mapMarkerCount = 0;
  activeTourists = 0;
  inactiveTourists = 0;

  pendingCreatorQueue: CreatorRoleRequestDto[] = [];
  pendingReportQueue: ManagerReportDto[] = [];

  topOrigins: TopOriginRow[] = [];
  reportStatusSlices: ReportStatusSlice[] = [];
  activityFeed: PlatformActivityItem[] = [];

  touristChartLineSignups = '';
  touristChartAreaSignups = '';
  touristChartMaxY = 1;
  touristChartYTopLabel = '0';
  touristChartYMidLabel = '0';
  touristChartIsEmpty = true;
  touristChartSubtitle = '';
  touristChartXLabels: { label: string }[] = [];
  readonly gridLineYs = [0, 25, 50, 75, 100];
  readonly chartDays = CHART_DAYS;

  ngOnInit(): void {
    this.user = this.authService.getUser();
    this.loadDashboard();
  }

  ngAfterViewInit(): void {
    this.mapViewReady = true;
    this.scheduleMapRender();
  }

  ngOnDestroy(): void {
    this.mapService.destroyMap();
  }

  reload(): void {
    this.mapService.destroyMap();
    this.loadDashboard();
  }

  private loadDashboard(): void {
    this.isLoading = true;
    this.loadError = '';
    this.mapService.destroyMap();

    forkJoin({
      touristTotal: this.fetchRoleTotal('Tourist'),
      adminTotal: this.fetchRoleTotal('Admin'),
      managerTotal: this.fetchRoleTotal('Manager'),
      creatorTotal: this.fetchRoleTotal('ContentCreator'),
      tourists: this.fetchAllUsers('Tourist'),
      contentCreators: this.fetchAllUsers('ContentCreator'),
      creatorRequestsPage: this.adminUsers
        .getCreatorRequests({ page: 1, pageSize: 5, sortBy: 'createdAt', sortOrder: 'desc' })
        .pipe(catchError(() => of({ items: [], totalCount: 0, page: 1, pageSize: 5, totalPages: 0 }))),
      pendingReportsPage: this.managerReports
        .getAllReports({ page: 1, pageSize: 5, status: 'Pending', sortBy: 'createdAt', sortOrder: 'desc' })
        .pipe(catchError(() => of({ items: [], totalCount: 0, page: 1, pageSize: 5, totalPages: 0 }))),
      pendingReportsCount: this.managerReports
        .getAllReports({ page: 1, pageSize: 1, status: 'Pending' })
        .pipe(
          map((p) => p.totalCount ?? 0),
          catchError(() => of(0))
        ),
      reportStatusCounts: this.fetchReportStatusCounts(),
      destinationTotal: this.fetchDestinationTotal(),
      mapDestinations: this.fetchAllDestinations(),
      recentReports: this.fetchRecentReports()
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
          this.scheduleMapRender();
        })
      )
      .subscribe({
        next: (data) => {
          const tourists = data.tourists.items;
          const creators = data.contentCreators.items;
          const moderationUsers = [...tourists, ...creators];

          this.totalTourists = data.touristTotal > 0 ? data.touristTotal : tourists.length;
          this.teamAdmins = data.adminTotal;
          this.teamManagers = data.managerTotal;
          this.teamCreators = data.creatorTotal;
          this.teamTotal = this.teamAdmins + this.teamManagers + this.teamCreators;
          this.mapDestinations = data.mapDestinations;
          this.destinationCount =
            data.destinationTotal > 0 ? data.destinationTotal : data.mapDestinations.length;
          this.pendingCreatorRequests = data.creatorRequestsPage.totalCount ?? data.creatorRequestsPage.items.length;
          this.pendingManagerReports = data.pendingReportsCount;
          this.pendingCreatorQueue = data.creatorRequestsPage.items ?? [];
          this.pendingReportQueue = data.pendingReportsPage.items ?? [];

          this.bannedUsers = moderationUsers.filter((u) => u.isBanned).length;
          this.bannedTourists = tourists.filter((u) => u.isBanned).length;
          this.activeTourists = tourists.filter((u) => u.isActive && !u.isBanned).length;
          this.inactiveTourists = tourists.filter((u) => !u.isActive && !u.isBanned).length;

          const now = new Date();
          const start7 = new Date(now);
          start7.setDate(now.getDate() - 7);
          const start14 = new Date(now);
          start14.setDate(now.getDate() - 14);
          this.newTourists7d = tourists.filter((u) => this.isOnOrAfter(u.createdAt, start7)).length;
          const prev7 = tourists.filter((u) =>
            this.isInRange(u.createdAt, start14, start7)
          ).length;
          this.touristSignupDeltaPercent = this.computePercentDelta(this.newTourists7d, prev7);

          this.topOrigins = this.buildTopOrigins(tourists).slice(0, 5);
          this.bindTouristChart(tourists);
          this.reportStatusSlices = this.buildReportStatusSlices(data.reportStatusCounts);
          this.activityFeed = this.buildActivityFeed(
            tourists,
            creators,
            data.creatorRequestsPage.items ?? [],
            data.recentReports
          );

          this.cdr.markForCheck();
        },
        error: () => {
          this.loadError = 'Could not load dashboard data. Check that the API is running and try again.';
        }
      });
  }

  private scheduleMapRender(): void {
    if (!this.mapViewReady || this.isLoading) {
      return;
    }
    setTimeout(() => this.renderDashboardMap(), 80);
  }

  private renderDashboardMap(): void {
    const container = document.getElementById('dashboard-map');
    if (!container) {
      return;
    }

    this.mapService.destroyMap();
    this.mapService.initMap('dashboard-map', 42.35, 18.75, 8);

    const withCoords = this.mapDestinations.filter(
      (d) => d.latitude != null && d.longitude != null && Number.isFinite(d.latitude) && Number.isFinite(d.longitude)
    );

    withCoords.forEach((d) => {
      this.mapService.addMainMapMarker(d.latitude!, d.longitude!, d.name);
    });

    this.mapMarkerCount = withCoords.length;
    this.cdr.markForCheck();
  }

  private fetchAllDestinations() {
    const pageSize = 100;
    return this.destinationService.getAll({ page: 1, pageSize, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true }).pipe(
      switchMap((response) => {
        const first = this.toDestinationPage(response);
        if (first.totalPages <= 1) {
          return of(first.items);
        }
        const rest = Array.from({ length: Math.min(first.totalPages - 1, 20) }, (_, i) =>
          this.destinationService
            .getAll({ page: i + 2, pageSize, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })
            .pipe(map((res) => this.toDestinationPage(res).items))
        );
        return forkJoin([of(first.items), ...rest]).pipe(map((pages) => pages.flat()));
      }),
      catchError(() => of([] as DestinationDto[]))
    );
  }

  private toDestinationPage(response: unknown): {
    items: DestinationDto[];
    totalCount: number;
    totalPages: number;
  } {
    if (Array.isArray(response)) {
      return { items: response, totalCount: response.length, totalPages: 1 };
    }
    const paged = response as {
      items?: DestinationDto[];
      totalCount?: number;
      totalPages?: number;
    };
    const items = paged.items ?? [];
    return {
      items,
      totalCount: paged.totalCount ?? items.length,
      totalPages: paged.totalPages ?? 1
    };
  }

  private fetchDestinationTotal() {
    return this.destinationService
      .getAll({ page: 1, pageSize: 1, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })
      .pipe(
        map((res) => this.toDestinationPage(res).totalCount),
        catchError(() => of(0))
      );
  }

  private fetchRoleTotal(role: string) {
    return this.adminUsers.getUsers({ page: 1, pageSize: 1, role }).pipe(
      map((p) => (Number.isFinite(p.totalCount) ? p.totalCount : 0)),
      catchError(() => of(0))
    );
  }

  private fetchAllUsers(role: string) {
    return this.adminUsers.getUsers({ page: 1, pageSize: 100, role, sortBy: 'createdAt', sortOrder: 'desc' }).pipe(
      switchMap((first) => {
        const itemsFirst = first.items ?? [];
        const totalCount = Number.isFinite(first.totalCount) ? first.totalCount : itemsFirst.length;
        const totalPages = Math.min(this.capPages(first.totalPages), MAX_USER_PAGES);
        if (totalPages <= 1) {
          return of({ items: itemsFirst, totalCount });
        }
        const rest = Array.from({ length: totalPages - 1 }, (_, i) =>
          this.adminUsers.getUsers({ page: i + 2, pageSize: 100, role, sortBy: 'createdAt', sortOrder: 'desc' })
        );
        return forkJoin(rest).pipe(
          map((pages) => ({
            items: [...itemsFirst, ...pages.flatMap((p) => p.items ?? [])],
            totalCount
          }))
        );
      }),
      catchError(() => of({ items: [] as AdminUserListItemDto[], totalCount: 0 }))
    );
  }

  private fetchReportStatusCounts() {
    const statuses = ['Pending', 'Approved', 'Rejected'] as const;
    return forkJoin(
      statuses.map((status) =>
        this.managerReports.getAllReports({ page: 1, pageSize: 1, status }).pipe(
          map((p) => ({ status, count: p.totalCount ?? 0 })),
          catchError(() => of({ status, count: 0 }))
        )
      )
    );
  }

  private fetchRecentReports() {
    return this.managerReports
      .getAllReports({ page: 1, pageSize: 8, sortBy: 'createdAt', sortOrder: 'desc' })
      .pipe(
        switchMap((first) => {
          const items = first.items ?? [];
          const pages = Math.min(this.capPages(first.totalPages), MAX_REPORT_PAGES);
          if (pages <= 1) {
            return of(items);
          }
          const rest = Array.from({ length: pages - 1 }, (_, i) =>
            this.managerReports.getAllReports({
              page: i + 2,
              pageSize: 8,
              sortBy: 'createdAt',
              sortOrder: 'desc'
            })
          );
          return forkJoin(rest).pipe(map((more) => [...items, ...more.flatMap((p) => p.items ?? [])]));
        }),
        catchError(() => of([] as ManagerReportDto[]))
      );
  }

  private buildReportStatusSlices(
    rows: { status: string; count: number }[]
  ): ReportStatusSlice[] {
    const colors: Record<string, string> = {
      Pending: '#d97706',
      Approved: '#059669',
      Rejected: '#dc2626'
    };
    const total = rows.reduce((s, r) => s + r.count, 0);
    return rows.map((r) => ({
      label: r.status,
      count: r.count,
      color: colors[r.status] ?? '#64748b',
      percent: total > 0 ? Math.round((r.count / total) * 1000) / 10 : 0
    }));
  }

  private buildActivityFeed(
    tourists: AdminUserListItemDto[],
    creators: AdminUserListItemDto[],
    creatorRequests: CreatorRoleRequestDto[],
    reports: ManagerReportDto[]
  ): PlatformActivityItem[] {
    const items: PlatformActivityItem[] = [];

    for (const u of [...tourists].sort((a, b) => this.toTime(b.createdAt) - this.toTime(a.createdAt)).slice(0, 6)) {
      items.push({
        initials: this.initials(u.firstName, u.lastName),
        avatarTone: 'teal',
        title: `${u.firstName} ${u.lastName}`.trim() || u.email,
        detail: 'Registered as tourist',
        timeLabel: this.formatRelative(u.createdAt),
        roleBadge: 'TOURIST',
        sortAt: this.toTime(u.createdAt),
        routerLink: ['/admin/users'],
        queryParams: { tab: 'tourists' }
      });
    }

    for (const r of creatorRequests.slice(0, 4)) {
      items.push({
        initials: this.initials(r.firstName, r.lastName),
        avatarTone: 'indigo',
        title: `${r.firstName} ${r.lastName}`.trim() || r.email,
        detail: 'Requested Content Creator access',
        timeLabel: this.formatRelative(r.createdAt),
        roleBadge: 'MODERATION',
        sortAt: this.toTime(r.createdAt),
        routerLink: ['/admin/users'],
        queryParams: { tab: 'tourists' }
      });
    }

    for (const report of reports.slice(0, 6)) {
      const isResolved = report.status?.toLowerCase() !== 'pending';
      items.push({
        initials: this.initialsFromName(report.managerName),
        avatarTone: 'amber',
        title: report.managerName || 'Manager',
        detail: isResolved
          ? `${report.status} report on ${report.reportedUserName}`
          : `Escalated ${report.reportedUserName} — ${this.truncate(report.reason, 72)}`,
        timeLabel: this.formatRelative(isResolved ? report.resolvedAt : report.createdAt),
        roleBadge: 'REPORT',
        sortAt: this.toTime(isResolved ? report.resolvedAt : report.createdAt),
        routerLink: ['/admin/users'],
        queryParams: { tab: 'tourists' }
      });
    }

    for (const u of [...tourists, ...creators].filter((x) => x.isBanned && x.bannedAtUtc)) {
      items.push({
        initials: this.initials(u.firstName, u.lastName),
        avatarTone: 'slate',
        title: `${u.firstName} ${u.lastName}`.trim() || u.email,
        detail: u.banReason?.trim() ? `Banned: ${this.truncate(u.banReason, 80)}` : 'Account banned',
        timeLabel: this.formatRelative(u.bannedAtUtc),
        roleBadge: 'BAN',
        sortAt: this.toTime(u.bannedAtUtc),
        routerLink: ['/admin/users', 'edit', u.id]
      });
    }

    return items.sort((a, b) => b.sortAt - a.sortAt).slice(0, 12);
  }

  private bindTouristChart(tourists: AdminUserListItemDto[]): void {
    const daily = this.buildDailyBuckets(tourists.map((t) => t.createdAt), CHART_DAYS);
    const total = daily.reduce((a, b) => a + b, 0);
    const maxVal = Math.max(...daily, 0);
    this.touristChartMaxY = Math.max(maxVal, 1);
    this.touristChartYTopLabel = maxVal === 0 ? '0' : String(maxVal);
    this.touristChartYMidLabel = maxVal === 0 ? '0' : String(Math.round(maxVal / 2));
    this.touristChartIsEmpty = maxVal === 0;
    this.touristChartSubtitle = this.touristChartIsEmpty
      ? `No tourist registrations in the last ${CHART_DAYS} days.`
      : `${total} new tourists in the last ${CHART_DAYS} days (from loaded accounts).`;
    this.touristChartLineSignups = this.buildLinePath(daily, this.touristChartMaxY);
    this.touristChartAreaSignups = this.buildAreaPath(daily, this.touristChartMaxY);

    const labels = this.buildChartXLabels(CHART_DAYS);
    this.touristChartXLabels.length = 0;
    this.touristChartXLabels.push(...labels);
  }

  private buildTopOrigins(users: AdminUserListItemDto[]): TopOriginRow[] {
    const counts = new Map<string, number>();
    for (const user of users) {
      const country = (user.country ?? '').trim() || 'Unknown';
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
    const rows = [...counts.entries()]
      .map(([name, usersCount]) => ({ name, users: usersCount }))
      .sort((a, b) => b.users - a.users);
    const total = users.length;
    return rows.map((r) => ({
      ...r,
      barPercent: total > 0 ? Math.round((r.users / total) * 1000) / 10 : 0
    }));
  }

  private buildDailyBuckets(isoDates: (string | undefined)[], days: number): number[] {
    const buckets = Array.from({ length: days }, () => 0);
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - (days - 1));
    for (const raw of isoDates) {
      if (!raw) continue;
      const created = new Date(raw);
      if (Number.isNaN(created.getTime()) || created < start || created > now) continue;
      const dayIndex = Math.floor((created.getTime() - start.getTime()) / 86400000);
      if (dayIndex >= 0 && dayIndex < days) buckets[dayIndex] += 1;
    }
    return buckets;
  }

  private buildChartXLabels(days: number): { label: string }[] {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - (days - 1));
    const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
    const indices = [0, Math.floor(days / 4), Math.floor(days / 2), Math.floor((3 * days) / 4), days - 1];
    return [...new Set(indices)]
      .filter((i) => i >= 0 && i < days)
      .sort((a, b) => a - b)
      .map((i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return { label: fmt.format(d) };
      });
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

  private buildAreaPath(values: number[], maxY: number): string {
    const line = this.buildLinePath(values, maxY);
    if (!line || !values.length) return '';
    const lastX = ((values.length - 1) / Math.max(values.length - 1, 1)) * 100;
    return `${line} L ${lastX.toFixed(2)} 100 L 0 100 Z`;
  }

  private capPages(totalPages?: number): number {
    const raw = totalPages ?? 1;
    return !Number.isFinite(raw) || raw < 1 ? 1 : Math.floor(raw);
  }

  private isOnOrAfter(value: string | undefined, from: Date): boolean {
    if (!value) return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime()) && d >= from;
  }

  private isInRange(value: string | undefined, from: Date, to: Date): boolean {
    if (!value) return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime()) && d >= from && d < to;
  }

  private computePercentDelta(current: number, previous: number): number {
    if (previous <= 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private toTime(value?: string | null): number {
    if (!value) return 0;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }

  private initials(first: string, last: string): string {
    return `${(first || '').charAt(0)}${(last || '').charAt(0)}`.toUpperCase() || 'U';
  }

  private initialsFromName(full: string): string {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'M';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }

  private truncate(text: string, max: number): string {
    const t = text.trim();
    return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
  }

  formatRelative(value?: string | null): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const diffMs = Date.now() - date.getTime();
    const mins = Math.max(0, Math.round(diffMs / 60000));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }

  reportStatusTotal(): number {
    return this.reportStatusSlices.reduce((s, r) => s + r.count, 0);
  }

  touristStatusTotal(): number {
    return this.activeTourists + this.inactiveTourists + this.bannedTourists;
  }
}
