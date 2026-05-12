import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, TimeoutError, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap, timeout } from 'rxjs/operators';
import { AdminUserListItemDto, AdminUsersService } from '../../../services/admin-users.service';
import { ReviewDto, ReviewService } from '../../../services/review';

const CHART_DAYS = 14;

/** Distinct fills for the Top Origins pie (cycles if there are more slices). */
const ORIGIN_PIE_COLORS = [
  '#2563eb',
  '#7c3aed',
  '#059669',
  '#d97706',
  '#db2777',
  '#0d9488',
  '#4f46e5',
  '#ca8a04',
  '#dc2626',
  '#0891b2',
  '#65a30d',
  '#9333ea'
];

interface OriginsPieSlice {
  name: string;
  users: number;
  path: string;
  color: string;
  shareLabel: string;
}

const MAX_USER_LIST_PAGES = 40;
const MAX_REVIEW_LIST_PAGES = 25;
const USERS_LOAD_TIMEOUT_MS = 90_000;
const REVIEWS_LOAD_TIMEOUT_MS = 45_000;

type UsersPageViewTab = 'internal' | 'tourists';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly reviewService = inject(ReviewService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  isLoading = true;
  loadError = '';

  totalRegistered = 0;
  activeThisPeriod = 0;
  newCountries = 0;
  activePercentDelta = 0;
  countryPercentDelta = 0;

  readonly chartDays = CHART_DAYS;

  chartLineSignups = '';
  chartLineReviews = '';
  chartAreaSignups = '';
  chartMaxY = 1;
  chartYTopLabel = '1';
  chartYMidLabel = '0';
  chartIsEmpty = false;
  chartSubtitle = '';
  chartXLabels: { label: string }[] = [];
  readonly gridLineYs = [0, 25, 50, 75, 100];

  /** Tourist tab: geography-focused chart (signups vs distinct origin countries per day). */
  touristChartLineSignups = '';
  touristChartLineDistinctOrigins = '';
  touristChartAreaSignups = '';
  touristChartMaxY = 1;
  touristChartYTopLabel = '1';
  touristChartYMidLabel = '0';
  touristChartIsEmpty = false;
  touristChartSubtitle = '';
  touristChartXLabels: { label: string }[] = [];

  /** KPIs when Tourists tab is selected. */
  touristKpiTotal = 0;
  touristKpiSignupDeltaPercent = 0;
  touristKpiUniqueReviewers = 0;
  touristKpiReviewersSharePercent = 0;
  touristKpiActiveTourists = 0;
  touristKpiActiveSharePercent = 0;

  totalAdmins = 0;
  totalManagers = 0;
  totalContentCreators = 0;

  /** Tourist counts by country from loaded users; `barPercent` is share of all tourists (0–100). */
  topOrigins: { name: string; users: number; barPercent: number }[] = [];

  /** When true, Top Origins shows a pie chart instead of the bar list. */
  originsDemographicsChart = false;
  adminMembers: {
    id: number;
    initials: string;
    name: string;
    email: string;
    role: string;
    lastLogin: string;
    status: 'Active' | 'Inactive';
  }[] = [];
  tourists: {
    id: number;
    name: string;
    email: string;
    origin: string;
    status: 'active' | 'inactive';
    joinedDate: string;
  }[] = [];

  adminDirectorySearch = '';
  touristSearch = '';

  /** Internal Team vs Tourist accounts. */
  usersViewTab: UsersPageViewTab = 'internal';

  adminCurrentPage = 1;
  adminPageSize = 5;
  touristCurrentPage = 1;
  touristPageSize = 5;
  readonly pageSizeOptions = [5, 10, 20, 50];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  selectUsersViewTab(tab: UsersPageViewTab): void {
    this.usersViewTab = tab;
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.loadError = '';

    // Load user lists first so the UI can render even if reviews are slow; avoids stuck loading state.
    forkJoin({
      allUsers: this.fetchAllUsers(),
      tourists: this.fetchAllUsers('Tourist')
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout(USERS_LOAD_TIMEOUT_MS),
        tap(({ allUsers, tourists }) => {
          this.bindUsersData(allUsers, tourists, []);
          this.isLoading = false;
          this.cdr.markForCheck();
        }),
        switchMap(({ allUsers, tourists }) =>
          this.fetchAllReviews().pipe(
            timeout(REVIEWS_LOAD_TIMEOUT_MS),
            map((reviews) => ({ allUsers, tourists, reviews })),
            catchError(() => of({ allUsers, tourists, reviews: [] as ReviewDto[] }))
          )
        ),
        tap(({ allUsers, tourists, reviews }) => {
          this.bindUsersData(allUsers, tourists, reviews);
          this.cdr.markForCheck();
        }),
        catchError((err: unknown) => {
          if (err instanceof TimeoutError) {
            this.loadError =
              'Loading took too long. Check that the API is running and reachable, then try again.';
          } else {
            this.loadError = 'Could not load users data. Check API and try again.';
          }
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  private fetchAllUsers(role?: string): Observable<AdminUserListItemDto[]> {
    return this.adminUsersService.getUsers({ page: 1, pageSize: 100, role }).pipe(
      switchMap((firstPage) => {
        const cappedTotal = this.capTotalPages(firstPage.totalPages, MAX_USER_LIST_PAGES);
        if (cappedTotal <= 1) {
          return of(firstPage.items ?? []);
        }

        const requests = Array.from({ length: cappedTotal - 1 }, (_, i) =>
          this.adminUsersService.getUsers({ page: i + 2, pageSize: 100, role })
        );

        return forkJoin(requests).pipe(
          map((restPages) => [
            ...(firstPage.items ?? []),
            ...restPages.flatMap((p) => p.items ?? [])
          ])
        );
      }),
      map((value) => (Array.isArray(value) ? value : [])),
      catchError(() => of([]))
    );
  }

  private fetchAllReviews(): Observable<ReviewDto[]> {
    return this.reviewService
      .getAll({ page: 1, pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' }, { bypassRegion: true })
      .pipe(
        switchMap((firstPage) => {
          const cappedTotal = this.capTotalPages(firstPage.totalPages, MAX_REVIEW_LIST_PAGES);
          if (cappedTotal <= 1) {
            return of(firstPage.items ?? []);
          }

          const requests = Array.from({ length: cappedTotal - 1 }, (_, i) =>
            this.reviewService.getAll(
              { page: i + 2, pageSize: 100, sortBy: 'createdAt', sortOrder: 'desc' },
              { bypassRegion: true }
            )
          );

          return forkJoin(requests).pipe(
            map((restPages) => [
              ...(firstPage.items ?? []),
              ...restPages.flatMap((p) => p.items ?? [])
            ])
          );
        }),
        map((value) => (Array.isArray(value) ? value : [])),
        catchError(() => of([]))
      );
  }

  private capTotalPages(totalPages: number | undefined, maxPages: number): number {
    const raw = totalPages ?? 1;
    if (!Number.isFinite(raw) || raw < 1) {
      return 1;
    }
    return Math.min(Math.floor(raw), maxPages);
  }

  private bindUsersData(
    allUsers: AdminUserListItemDto[],
    touristsOnly: AdminUserListItemDto[],
    reviews: ReviewDto[]
  ): void {
    const now = new Date();
    const startCurrentPeriod = new Date(now);
    startCurrentPeriod.setDate(now.getDate() - 30);
    const startPreviousPeriod = new Date(now);
    startPreviousPeriod.setDate(now.getDate() - 60);

    this.totalRegistered = allUsers.length;
    this.activeThisPeriod = allUsers.filter((u) => this.isInRange(u.createdAt, startCurrentPeriod, now)).length;
    const previousActive = allUsers.filter((u) =>
      this.isInRange(u.createdAt, startPreviousPeriod, startCurrentPeriod)
    ).length;
    this.activePercentDelta = this.computePercentDelta(this.activeThisPeriod, previousActive);

    const currentCountries = new Set(
      allUsers
        .filter((u) => this.isInRange(u.createdAt, startCurrentPeriod, now))
        .map((u) => (u.country ?? '').trim())
        .filter((c) => !!c)
    );
    const previousCountries = new Set(
      allUsers
        .filter((u) => this.isInRange(u.createdAt, startPreviousPeriod, startCurrentPeriod))
        .map((u) => (u.country ?? '').trim())
        .filter((c) => !!c)
    );
    this.newCountries = currentCountries.size;
    this.countryPercentDelta = this.computePercentDelta(currentCountries.size, previousCountries.size);

    const dailyTouristSignups = this.buildDailyBucketsFromUsers(touristsOnly, CHART_DAYS);
    const dailyReviews = this.buildDailyBucketsFromDates(
      reviews.map((r) => r.createdAt),
      CHART_DAYS
    );
    this.bindChartSeries(dailyTouristSignups, dailyReviews);
    this.bindTouristGeographyChart(touristsOnly);

    const touristSignupsCurrent = touristsOnly.filter((u) =>
      this.isInRange(u.createdAt, startCurrentPeriod, now)
    ).length;
    const touristSignupsPrevious = touristsOnly.filter((u) =>
      this.isInRange(u.createdAt, startPreviousPeriod, startCurrentPeriod)
    ).length;
    this.touristKpiTotal = touristsOnly.length;
    this.touristKpiSignupDeltaPercent = this.computePercentDelta(touristSignupsCurrent, touristSignupsPrevious);

    const activeTourists = touristsOnly.filter((u) => u.isActive).length;
    this.touristKpiActiveTourists = activeTourists;
    this.touristKpiActiveSharePercent =
      touristsOnly.length > 0 ? Math.round((activeTourists / touristsOnly.length) * 1000) / 10 : 0;

    const reviewerIds = new Set(reviews.map((r) => r.userId).filter((id) => id != null && Number.isFinite(id)));
    this.touristKpiUniqueReviewers = reviewerIds.size;
    const platformTotal = allUsers.length;
    this.touristKpiReviewersSharePercent =
      platformTotal > 0 ? Math.round((reviewerIds.size / platformTotal) * 1000) / 10 : 0;

    const internalTeam = allUsers.filter((u) => (u.roleName ?? '').toLowerCase() !== 'tourist');
    this.adminMembers = internalTeam.map((u) => ({
      id: u.id,
      initials: this.getInitials(u.firstName, u.lastName),
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      role: u.roleName || 'Unknown',
      lastLogin: this.formatDate(u.createdAt),
      status: u.isActive ? 'Active' : 'Inactive'
    }));

    this.topOrigins = this.buildTopOrigins(touristsOnly);

    this.totalAdmins = internalTeam.filter((u) => (u.roleName ?? '').toLowerCase() === 'admin').length;
    this.totalManagers = internalTeam.filter((u) => (u.roleName ?? '').toLowerCase() === 'manager').length;
    this.totalContentCreators = internalTeam.filter((u) => {
      const role = (u.roleName ?? '').toLowerCase().replace(/\s+/g, '');
      return role === 'contentcreator' || role === 'content-creator';
    }).length;

    this.tourists = touristsOnly.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      origin: (u.country ?? '').trim() || 'Unknown',
      status: u.isActive ? 'active' : 'inactive',
      joinedDate: this.formatDate(u.createdAt)
    }));
  }

  get filteredAdminDirectory(): typeof this.adminMembers {
    return this.filterBySearch(this.adminMembers, this.adminDirectorySearch, (m) => [
      m.name,
      m.email,
      m.role,
      m.lastLogin,
      m.status
    ]);
  }

  get filteredTourists(): typeof this.tourists {
    return this.filterBySearch(this.tourists, this.touristSearch, (t) => [
      t.name,
      t.email,
      t.origin,
      t.status,
      t.joinedDate
    ]);
  }

  get adminTotalCount(): number {
    return this.filteredAdminDirectory.length;
  }

  get adminTotalPages(): number {
    if (!this.adminTotalCount || this.adminPageSize < 1) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.adminTotalCount / this.adminPageSize));
  }

  get visibleAdminDirectory() {
    const page = Math.min(Math.max(1, this.adminCurrentPage), this.adminTotalPages);
    const start = (page - 1) * this.adminPageSize;
    return this.filteredAdminDirectory.slice(start, start + this.adminPageSize);
  }

  get adminPageStart(): number {
    if (!this.adminTotalCount || !this.visibleAdminDirectory.length) {
      return 0;
    }
    const page = Math.min(Math.max(1, this.adminCurrentPage), this.adminTotalPages);
    return (page - 1) * this.adminPageSize + 1;
  }

  get adminPageEnd(): number {
    return this.adminPageStart + this.visibleAdminDirectory.length - 1;
  }

  get touristTotalCount(): number {
    return this.filteredTourists.length;
  }

  get touristTotalPages(): number {
    if (!this.touristTotalCount || this.touristPageSize < 1) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.touristTotalCount / this.touristPageSize));
  }

  get visibleTourists() {
    const page = Math.min(Math.max(1, this.touristCurrentPage), this.touristTotalPages);
    const start = (page - 1) * this.touristPageSize;
    return this.filteredTourists.slice(start, start + this.touristPageSize);
  }

  get touristPageStart(): number {
    if (!this.touristTotalCount || !this.visibleTourists.length) {
      return 0;
    }
    const page = Math.min(Math.max(1, this.touristCurrentPage), this.touristTotalPages);
    return (page - 1) * this.touristPageSize + 1;
  }

  get touristPageEnd(): number {
    return this.touristPageStart + this.visibleTourists.length - 1;
  }

  onAdminSearchInput(event: Event): void {
    this.adminDirectorySearch = (event.target as HTMLInputElement).value;
    this.adminCurrentPage = 1;
  }

  onTouristSearchInput(event: Event): void {
    this.touristSearch = (event.target as HTMLInputElement).value;
    this.touristCurrentPage = 1;
  }

  onAdminPageSizeChange(value: number | string): void {
    this.adminPageSize = Number(value);
    this.adminCurrentPage = 1;
  }

  onTouristPageSizeChange(value: number | string): void {
    this.touristPageSize = Number(value);
    this.touristCurrentPage = 1;
  }

  onAdminPreviousPage(): void {
    if (this.adminCurrentPage > 1) {
      this.adminCurrentPage--;
    }
  }

  onAdminNextPage(): void {
    if (this.adminCurrentPage < this.adminTotalPages) {
      this.adminCurrentPage++;
    }
  }

  onTouristPreviousPage(): void {
    if (this.touristCurrentPage > 1) {
      this.touristCurrentPage--;
    }
  }

  onTouristNextPage(): void {
    if (this.touristCurrentPage < this.touristTotalPages) {
      this.touristCurrentPage++;
    }
  }

  private filterBySearch<T>(rows: T[], query: string, fieldFns: (row: T) => string[]): T[] {
    const q = query.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter((row) =>
      fieldFns(row).some((text) => text.toLowerCase().includes(q))
    );
  }

  clearAdminSearch(): void {
    this.adminDirectorySearch = '';
    this.adminCurrentPage = 1;
  }

  clearTouristSearch(): void {
    this.touristSearch = '';
    this.touristCurrentPage = 1;
  }

  toggleOriginsDemographics(): void {
    this.originsDemographicsChart = !this.originsDemographicsChart;
  }

  /** Pie slices: each angle is proportional to `users` within the displayed origins total. */
  get originsPieSlices(): OriginsPieSlice[] {
    const rows = this.topOrigins;
    if (!rows.length) {
      return [];
    }
    const totalUsers = rows.reduce((sum, r) => sum + r.users, 0);
    if (totalUsers <= 0) {
      return [];
    }

    const cx = 50;
    const cy = 50;
    const R = 38;
    let angle = -Math.PI / 2;
    const colors = ORIGIN_PIE_COLORS;

    return rows.map((r, i) => {
      const sliceAngle = (r.users / totalUsers) * 2 * Math.PI;
      const sharePct = Math.round((r.users / totalUsers) * 1000) / 10;
      const shareLabel = `${sharePct}%`;

      let path: string;
      if (sliceAngle >= 2 * Math.PI - 1e-4) {
        path = `M ${cx} ${cy} L ${cx} ${cy - R} A ${R} ${R} 0 0 1 ${cx} ${cy + R} A ${R} ${R} 0 0 1 ${cx} ${cy - R} Z`;
      } else {
        const x0 = cx + R * Math.cos(angle);
        const y0 = cy + R * Math.sin(angle);
        const x1 = cx + R * Math.cos(angle + sliceAngle);
        const y1 = cy + R * Math.sin(angle + sliceAngle);
        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        path = `M ${cx} ${cy} L ${x0.toFixed(3)} ${y0.toFixed(3)} A ${R} ${R} 0 ${largeArc} 1 ${x1.toFixed(3)} ${y1.toFixed(3)} Z`;
      }

      angle += sliceAngle;

      return {
        name: r.name,
        users: r.users,
        path,
        color: colors[i % colors.length],
        shareLabel
      };
    });
  }

  private buildTopOrigins(users: AdminUserListItemDto[]): { name: string; users: number; barPercent: number }[] {
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

  private bindTouristGeographyChart(tourists: AdminUserListItemDto[]): void {
    const dailySignups = this.buildDailyBucketsFromUsers(tourists, CHART_DAYS);
    const dailyDistinctOrigins = this.buildDailyDistinctOriginCountries(tourists, CHART_DAYS);
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const signupTotal = sum(dailySignups);
    const maxDistinct = dailyDistinctOrigins.length ? Math.max(...dailyDistinctOrigins) : 0;
    const maxVal = Math.max(...dailySignups, ...dailyDistinctOrigins, 0);
    this.touristChartMaxY = Math.max(maxVal, 1);
    this.touristChartYTopLabel = maxVal === 0 ? '0' : String(maxVal);
    this.touristChartYMidLabel = maxVal === 0 ? '0' : String(Math.round(maxVal / 2));
    this.touristChartIsEmpty = maxVal === 0;
    this.touristChartSubtitle = this.touristChartIsEmpty
      ? `Last ${CHART_DAYS} days — no tourist registrations with origin data in this window.`
      : `Last ${CHART_DAYS} days — ${signupTotal} new tourists; up to ${maxDistinct} different origin countries on a single day.`;
    this.touristChartLineSignups = this.buildLinePath(dailySignups, this.touristChartMaxY);
    this.touristChartLineDistinctOrigins = this.buildLinePath(dailyDistinctOrigins, this.touristChartMaxY);
    this.touristChartAreaSignups = this.buildAreaPath(dailySignups, this.touristChartMaxY);
    this.touristChartXLabels = this.buildChartXLabels(CHART_DAYS);
  }

  /** Per day, count distinct non-empty origin countries among tourists who registered that day. */
  private buildDailyDistinctOriginCountries(users: AdminUserListItemDto[], days: number): number[] {
    const daySets: Set<string>[] = Array.from({ length: days }, () => new Set());
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - (days - 1));

    for (const user of users) {
      const raw = user.createdAt;
      if (!raw) {
        continue;
      }
      const created = new Date(raw);
      if (Number.isNaN(created.getTime()) || created < start || created > now) {
        continue;
      }
      const dayIndex = Math.floor((created.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex < 0 || dayIndex >= days) {
        continue;
      }
      const c = (user.country ?? '').trim();
      if (c) {
        daySets[dayIndex].add(c);
      }
    }
    return daySets.map((s) => s.size);
  }

  private bindChartSeries(dailyTouristSignups: number[], dailyReviews: number[]): void {
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const touristTotal = sum(dailyTouristSignups);
    const reviewTotal = sum(dailyReviews);
    const maxVal = Math.max(...dailyTouristSignups, ...dailyReviews, 0);
    this.chartMaxY = Math.max(maxVal, 1);
    this.chartYTopLabel = maxVal === 0 ? '0' : String(maxVal);
    this.chartYMidLabel = maxVal === 0 ? '0' : String(Math.round(maxVal / 2));
    this.chartIsEmpty = maxVal === 0;
    this.chartSubtitle = this.chartIsEmpty
      ? `Last ${CHART_DAYS} days — no tourist registrations or reviews in this window.`
      : `Last ${CHART_DAYS} days — ${touristTotal} new tourists, ${reviewTotal} reviews.`;

    this.chartLineSignups = this.buildLinePath(dailyTouristSignups, this.chartMaxY);
    this.chartLineReviews = this.buildLinePath(dailyReviews, this.chartMaxY);
    this.chartAreaSignups = this.buildAreaPath(dailyTouristSignups, this.chartMaxY);
    this.chartXLabels = this.buildChartXLabels(CHART_DAYS);
  }

  private buildDailyBucketsFromUsers(users: AdminUserListItemDto[], days: number): number[] {
    return this.buildDailyBucketsFromDates(
      users.map((u) => u.createdAt),
      days
    );
  }

  private buildDailyBucketsFromDates(isoDates: (string | undefined)[], days: number): number[] {
    const buckets: number[] = Array.from({ length: days }, () => 0);
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - (days - 1));

    for (const raw of isoDates) {
      if (!raw) {
        continue;
      }
      const created = new Date(raw);
      if (Number.isNaN(created.getTime()) || created < start || created > now) {
        continue;
      }
      const dayIndex = Math.floor((created.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < days) {
        buckets[dayIndex] += 1;
      }
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
    const unique = [...new Set(indices)].filter((i) => i >= 0 && i < days).sort((a, b) => a - b);
    return unique.map((i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { label: fmt.format(d) };
    });
  }

  private buildLinePath(values: number[], maxY: number): string {
    if (!values.length || maxY <= 0) {
      return '';
    }
    const width = 100;
    const height = 100;
    return values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * width;
        const y = height - (v / maxY) * height;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private buildAreaPath(values: number[], maxY: number): string {
    const line = this.buildLinePath(values, maxY);
    if (!line || !values.length) {
      return '';
    }
    const width = 100;
    const n = values.length;
    const lastX = ((n - 1) / Math.max(n - 1, 1)) * width;
    return `${line} L ${lastX.toFixed(2)} 100 L 0 100 Z`;
  }

  private isInRange(value: string | undefined, from: Date, to: Date): boolean {
    if (!value) {
      return false;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    return date >= from && date < to;
  }

  private computePercentDelta(current: number, previous: number): number {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private getInitials(firstName: string, lastName: string): string {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || 'U';
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}