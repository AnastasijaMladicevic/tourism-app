import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EMPTY, Observable, TimeoutError, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap, tap, timeout } from 'rxjs/operators';
import {
  AdminUserListItemDto,
  AdminUsersService,
  BanUserDto,
  CreatorRoleRequestDto
} from '../../../services/admin-users.service';
import { ReviewDto, ReviewService } from '../../../services/review';
import {
  ManagerReportDto,
  ManagerReportsService
} from '../../../services/manager-reports.service';

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

/** While the Tourists tab is open, refetch creator-role requests so new submissions appear without manual refresh. */
const TOURISTS_TAB_CREATOR_REQUESTS_POLL_MS = 500;
const MAX_MANAGER_REPORT_PAGES = 20;

type UsersPageViewTab = 'internal' | 'tourists';

type BanDurationOption = '30-days' | 'permanent' | 'custom';

interface BannedUserRow {
  id: number;
  initials: string;
  name: string;
  email: string;
  role: string;
  banReason: string;
  bannedAtLabel: string;
  banExpiresLabel: string;
  bannedAtSort: number;
}

interface BanUserModalTarget {
  id: number;
  name: string;
  email: string;
  role: string;
}

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
  private readonly managerReportsService = inject(ManagerReportsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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

  /** Internal Team tab: new accounts per day by role (from loaded team members). */
  internalChartLineAdmins = '';
  internalChartLineManagers = '';
  internalChartLineCreators = '';
  internalChartMaxY = 1;
  internalChartYTopLabel = '1';
  internalChartYMidLabel = '0';
  internalChartIsEmpty = false;
  internalChartSubtitle = '';
  internalChartXLabels: { label: string }[] = [];
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

  /** Tourist counts by country (Tourists tab sidebar). */
  topOrigins: { name: string; users: number; barPercent: number }[] = [];
  /** Internal team (admin, manager, content creator) counts by country (Internal Team tab sidebar). */
  topTeamOrigins: { name: string; users: number; barPercent: number }[] = [];

  /** When true, Top Origins shows a pie chart instead of the bar list. */
  originsDemographicsChart = false;
  adminMembers: {
    id: number;
    initials: string;
    name: string;
    email: string;
    role: string;
    lastLogin: string;
    status: 'Active' | 'Inactive' | 'Banned';
  }[] = [];
  tourists: {
    id: number;
    name: string;
    email: string;
    origin: string;
    status: 'active' | 'inactive' | 'banned';
    joinedDate: string;
    profileImageUrl: string | null;
    initials: string;
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

  /** Pending Content Creator role requests (Tourists tab). */
  creatorRequests: CreatorRoleRequestDto[] = [];
  creatorRequestsLoading = false;
  creatorRequestsError = '';
  creatorRequestsApproveError = '';
  creatorRequestSearch = '';
  creatorRequestsPage = 1;
  creatorRequestsPageSize = 5;
  creatorRequestsTotalCount = 0;
  creatorRequestsTotalPages = 1;
  approvingCreatorUserId: number | null = null;
  rejectingCreatorUserId: number | null = null;
  /** Row pending confirmation in the approve dialog. */
  approveConfirmRow: CreatorRoleRequestDto | null = null;
  creatorRequestsApproveSuccess = '';

  /** Pending manager reports keyed by reported content creator user id. */
  pendingReportByUserId = new Map<number, ManagerReportDto>();
  managerReportsLoadError = '';
  activeManagerReport: ManagerReportDto | null = null;
  highlightedReportUserId: number | null = null;
  reportReviewSubmitting = false;
  reportReviewError = '';
  reportRejectReason = '';
  reportReviewSuccess = '';
  banDuration: BanDurationOption = 'permanent';
  banCustomEndDate = '';
  banModalTarget: BanUserModalTarget | null = null;
  banModalReason = '';
  banModalError = '';
  banModalSubmitting = false;

  bannedUsers: BannedUserRow[] = [];
  bannedUsersSearch = '';
  bannedCurrentPage = 1;
  bannedPageSize = 5;
  unbanConfirmRow: BannedUserRow | null = null;
  unbanSubmitting = false;
  unbanError = '';
  unbanSuccess = '';

  private creatorRequestSearchDebounce?: ReturnType<typeof setTimeout>;
  private pendingReportQuery: { reportId?: number; reportedUserId?: number } | null = null;
  private creatorRequestsSilentInFlight = false;
  private touristsTabPollTimer?: ReturnType<typeof setInterval>;
  private approveSuccessDismissTimer?: ReturnType<typeof setTimeout>;

  private readonly onTouristsTabDocumentVisibility = (): void => {
    if (document.visibilityState !== 'visible' || this.usersViewTab !== 'tourists') {
      return;
    }
    if (this.creatorRequestsLoading || this.approvingCreatorUserId !== null) {
      return;
    }
    this.loadCreatorRequests({ silent: true });
  };

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      if (this.creatorRequestSearchDebounce) {
        clearTimeout(this.creatorRequestSearchDebounce);
      }
      if (this.approveSuccessDismissTimer) {
        clearTimeout(this.approveSuccessDismissTimer);
      }
      this.stopTouristsTabLiveRefresh();
    });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        this.applyTabFromQuery(params.get('tab'));
        const reportId = this.parsePositiveIntParam(params.get('reportId'));
        const reportedUserId = this.parsePositiveIntParam(params.get('reportedUserId'));
        if (reportId || reportedUserId) {
          this.pendingReportQuery = { reportId, reportedUserId };
          if (this.usersViewTab !== 'internal') {
            this.selectUsersViewTab('internal');
          }
          this.tryOpenPendingReportFromQuery();
        }
      });

    this.loadDashboardData();
  }

  private parsePositiveIntParam(raw: string | null): number | undefined {
    if (!raw) {
      return undefined;
    }
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : undefined;
  }

  private applyTabFromQuery(tab: string | null): void {
    const normalized = tab?.trim().toLowerCase();
    if (normalized === 'tourists' || normalized === 'tourist') {
      if (this.usersViewTab !== 'tourists') {
        this.selectUsersViewTab('tourists');
      }
      return;
    }

    if (normalized === 'internal') {
      if (this.usersViewTab !== 'internal') {
        this.selectUsersViewTab('internal');
      }
    }
  }

  selectUsersViewTab(tab: UsersPageViewTab): void {
    this.usersViewTab = tab;
    this.originsDemographicsChart = false;
    if (tab !== 'tourists') {
      this.approveConfirmRow = null;
      this.dismissCreatorApproveSuccess();
    }
    if (tab === 'tourists') {
      this.loadCreatorRequests();
      this.startTouristsTabLiveRefresh();
    } else {
      this.stopTouristsTabLiveRefresh();
    }
  }

  private startTouristsTabLiveRefresh(): void {
    this.stopTouristsTabLiveRefresh();
    if (typeof window === 'undefined') {
      return;
    }
    document.addEventListener('visibilitychange', this.onTouristsTabDocumentVisibility);
    this.touristsTabPollTimer = window.setInterval(() => {
      if (this.usersViewTab !== 'tourists') {
        return;
      }
      if (this.creatorRequestsLoading || this.approvingCreatorUserId !== null || this.approveConfirmRow !== null) {
        return;
      }
      this.loadCreatorRequests({ silent: true });
    }, TOURISTS_TAB_CREATOR_REQUESTS_POLL_MS);
  }

  private stopTouristsTabLiveRefresh(): void {
    if (this.touristsTabPollTimer !== undefined) {
      clearInterval(this.touristsTabPollTimer);
      this.touristsTabPollTimer = undefined;
    }
    document.removeEventListener('visibilitychange', this.onTouristsTabDocumentVisibility);
  }

  private loadDashboardData(options?: { silent?: boolean }): void {
    const silent = options?.silent === true;

    if (!silent) {
      this.isLoading = true;
      this.loadError = '';
    }

    // Load user lists first so the UI can render even if reviews are slow; avoids stuck loading state.
    forkJoin({
      allUsersResult: this.fetchAllUsers(),
      touristsResult: this.fetchAllUsers('Tourist'),
      totalAdminsApi: this.fetchRoleTotalCount('Admin'),
      totalManagersApi: this.fetchRoleTotalCount('Manager'),
      totalCreatorsApi: this.fetchRoleTotalCount('ContentCreator'),
      pendingManagerReports: this.fetchAllPendingManagerReports()
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        timeout(USERS_LOAD_TIMEOUT_MS),
        tap(
          ({
            allUsersResult,
            touristsResult,
            totalAdminsApi,
            totalManagersApi,
            totalCreatorsApi,
            pendingManagerReports
          }) => {
            const roleTotals = {
              admins: totalAdminsApi,
              managers: totalManagersApi,
              contentCreators: totalCreatorsApi
            };
            this.bindPendingManagerReports(pendingManagerReports);
            this.bindUsersData(
              allUsersResult.items,
              allUsersResult.totalCount,
              touristsResult.items,
              touristsResult.totalCount,
              [],
              roleTotals
            );
            this.tryOpenPendingReportFromQuery();
            if (!silent) {
              this.isLoading = false;
            }
            this.cdr.markForCheck();
          }
        ),
        switchMap(
          ({
            allUsersResult,
            touristsResult,
            totalAdminsApi,
            totalManagersApi,
            totalCreatorsApi,
            pendingManagerReports
          }) =>
            this.fetchAllReviews().pipe(
              timeout(REVIEWS_LOAD_TIMEOUT_MS),
              map((reviews) => ({
                allUsersResult,
                touristsResult,
                totalAdminsApi,
                totalManagersApi,
                totalCreatorsApi,
                pendingManagerReports,
                reviews
              })),
              catchError(() =>
                of({
                  allUsersResult,
                  touristsResult,
                  totalAdminsApi,
                  totalManagersApi,
                  totalCreatorsApi,
                  pendingManagerReports,
                  reviews: [] as ReviewDto[]
                })
              )
            )
        ),
        tap(
          ({
            allUsersResult,
            touristsResult,
            totalAdminsApi,
            totalManagersApi,
            totalCreatorsApi,
            pendingManagerReports,
            reviews
          }) => {
          const roleTotals = {
            admins: totalAdminsApi,
            managers: totalManagersApi,
            contentCreators: totalCreatorsApi
          };
          this.bindPendingManagerReports(pendingManagerReports);
          this.bindUsersData(
            allUsersResult.items,
            allUsersResult.totalCount,
            touristsResult.items,
            touristsResult.totalCount,
            reviews,
            roleTotals
          );
          this.tryOpenPendingReportFromQuery();
          this.cdr.markForCheck();
        }
        ),
        catchError((err: unknown) => {
          if (silent) {
            return of(null);
          }

          if (err instanceof TimeoutError) {
            this.loadError =
              'Loading took too long. Check that the API is running and reachable, then try again.';
          } else {
            this.loadError = 'Could not load users data. Check API and try again.';
          }
          return of(null);
        }),
        finalize(() => {
          if (!silent) {
            this.isLoading = false;
          }
          this.cdr.markForCheck();
        })
      )
      .subscribe();
  }

  private fetchRoleTotalCount(role: string): Observable<number> {
    return this.adminUsersService.getUsers({ page: 1, pageSize: 1, role }).pipe(
      map((p) =>
        typeof p.totalCount === 'number' && Number.isFinite(p.totalCount) && p.totalCount >= 0
          ? p.totalCount
          : 0
      ),
      catchError(() => of(0))
    );
  }

  private fetchAllUsers(role?: string): Observable<{ items: AdminUserListItemDto[]; totalCount: number }> {
    return this.adminUsersService.getUsers({ page: 1, pageSize: 100, role }).pipe(
      switchMap((firstPage) => {
        const itemsFirst = firstPage.items ?? [];
        const totalCount =
          typeof firstPage.totalCount === 'number' && Number.isFinite(firstPage.totalCount) && firstPage.totalCount >= 0
            ? firstPage.totalCount
            : itemsFirst.length;
        const cappedTotal = this.capTotalPages(firstPage.totalPages, MAX_USER_LIST_PAGES);
        if (cappedTotal <= 1) {
          return of({ items: itemsFirst, totalCount });
        }

        const requests = Array.from({ length: cappedTotal - 1 }, (_, i) =>
          this.adminUsersService.getUsers({ page: i + 2, pageSize: 100, role })
        );

        return forkJoin(requests).pipe(
          map((restPages) => ({
            items: [...itemsFirst, ...restPages.flatMap((p) => p.items ?? [])],
            totalCount
          }))
        );
      }),
      catchError(() => of({ items: [] as AdminUserListItemDto[], totalCount: 0 }))
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
    allUsersTotalCount: number,
    touristsOnly: AdminUserListItemDto[],
    touristsTotalCount: number,
    reviews: ReviewDto[],
    roleTotals: { admins: number; managers: number; contentCreators: number }
  ): void {
    const now = new Date();
    const startCurrentPeriod = new Date(now);
    startCurrentPeriod.setDate(now.getDate() - 30);
    const startPreviousPeriod = new Date(now);
    startPreviousPeriod.setDate(now.getDate() - 60);

    this.totalRegistered =
      allUsersTotalCount > 0 ? allUsersTotalCount : allUsers.length;
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

    this.bindTouristGeographyChart(touristsOnly);

    const touristSignupsCurrent = touristsOnly.filter((u) =>
      this.isInRange(u.createdAt, startCurrentPeriod, now)
    ).length;
    const touristSignupsPrevious = touristsOnly.filter((u) =>
      this.isInRange(u.createdAt, startPreviousPeriod, startCurrentPeriod)
    ).length;
    this.touristKpiTotal = touristsTotalCount > 0 ? touristsTotalCount : touristsOnly.length;
    this.touristKpiSignupDeltaPercent = this.computePercentDelta(touristSignupsCurrent, touristSignupsPrevious);

    const activeTourists = touristsOnly.filter((u) => u.isActive).length;
    this.touristKpiActiveTourists = activeTourists;
    const touristDenomForActivePct =
      touristsOnly.length > 0 ? touristsOnly.length : Math.max(touristsTotalCount, 1);
    this.touristKpiActiveSharePercent =
      touristDenomForActivePct > 0
        ? Math.round((activeTourists / touristDenomForActivePct) * 1000) / 10
        : 0;

    const reviewerIds = new Set(reviews.map((r) => r.userId).filter((id) => id != null && Number.isFinite(id)));
    this.touristKpiUniqueReviewers = reviewerIds.size;
    const platformTotal =
      allUsersTotalCount > 0 ? allUsersTotalCount : Math.max(allUsers.length, 1);
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
      status: u.isBanned ? 'Banned' : (u.isActive ? 'Active' : 'Inactive')
    }));

    this.topOrigins = this.buildTopOrigins(touristsOnly);
    this.topTeamOrigins = this.buildTopOrigins(internalTeam);

    this.bindInternalTeamActivityChart(internalTeam);

    this.totalAdmins = roleTotals.admins;
    this.totalManagers = roleTotals.managers;
    this.totalContentCreators = roleTotals.contentCreators;

    this.tourists = touristsOnly.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      origin: (u.country ?? '').trim() || 'Unknown',
      status: u.isBanned ? 'banned' : (u.isActive ? 'active' : 'inactive'),
      joinedDate: this.formatDate(u.createdAt),
      profileImageUrl: (u.profileImageUrl ?? '').trim() || null,
      initials: this.getInitials(u.firstName, u.lastName)
    }));

    this.bannedUsers = allUsers
      .filter((u) => u.isBanned)
      .map((u) => this.mapBannedUserRow(u))
      .sort((a, b) => b.bannedAtSort - a.bannedAtSort);

    if (this.unbanConfirmRow && !this.bannedUsers.some((row) => row.id === this.unbanConfirmRow!.id)) {
      this.unbanConfirmRow = null;
    }
  }

  private mapBannedUserRow(u: AdminUserListItemDto): BannedUserRow {
    const bannedAtRaw = u.bannedAtUtc ?? '';
    const bannedAtDate = bannedAtRaw ? new Date(bannedAtRaw) : null;
    const bannedAtSort =
      bannedAtDate && !Number.isNaN(bannedAtDate.getTime()) ? bannedAtDate.getTime() : 0;

    return {
      id: u.id,
      initials: this.getInitials(u.firstName, u.lastName),
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      role: u.roleName || 'Unknown',
      banReason: (u.banReason ?? '').trim() || '—',
      bannedAtLabel: this.formatDate(u.bannedAtUtc ?? undefined),
      banExpiresLabel: u.banExpiresAtUtc ? this.formatDate(u.banExpiresAtUtc ?? undefined) : 'Permanent',
      bannedAtSort
    };
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
      t.joinedDate,
      t.initials
    ]);
  }

  get filteredBannedUsers(): BannedUserRow[] {
    return this.filterBySearch(this.bannedUsers, this.bannedUsersSearch, (row) => [
      row.name,
      row.email,
      row.role,
      row.banReason,
      row.bannedAtLabel,
      row.banExpiresLabel,
      row.initials
    ]);
  }

  get bannedTotalCount(): number {
    return this.filteredBannedUsers.length;
  }

  get bannedTotalPages(): number {
    if (!this.bannedTotalCount || this.bannedPageSize < 1) {
      return 1;
    }
    return Math.max(1, Math.ceil(this.bannedTotalCount / this.bannedPageSize));
  }

  get visibleBannedUsers(): BannedUserRow[] {
    const page = Math.min(Math.max(1, this.bannedCurrentPage), this.bannedTotalPages);
    const start = (page - 1) * this.bannedPageSize;
    return this.filteredBannedUsers.slice(start, start + this.bannedPageSize);
  }

  get bannedPageStart(): number {
    if (!this.bannedTotalCount || !this.visibleBannedUsers.length) {
      return 0;
    }
    const page = Math.min(Math.max(1, this.bannedCurrentPage), this.bannedTotalPages);
    return (page - 1) * this.bannedPageSize + 1;
  }

  get bannedPageEnd(): number {
    return this.bannedPageStart + this.visibleBannedUsers.length - 1;
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

  onBannedUsersSearchInput(event: Event): void {
    this.bannedUsersSearch = (event.target as HTMLInputElement).value;
    this.bannedCurrentPage = 1;
  }

  onAdminPageSizeChange(value: number | string): void {
    this.adminPageSize = Number(value);
    this.adminCurrentPage = 1;
  }

  onTouristPageSizeChange(value: number | string): void {
    this.touristPageSize = Number(value);
    this.touristCurrentPage = 1;
  }

  onBannedPageSizeChange(value: number | string): void {
    this.bannedPageSize = Number(value);
    this.bannedCurrentPage = 1;
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

  onBannedPreviousPage(): void {
    if (this.bannedCurrentPage > 1) {
      this.bannedCurrentPage--;
    }
  }

  onBannedNextPage(): void {
    if (this.bannedCurrentPage < this.bannedTotalPages) {
      this.bannedCurrentPage++;
    }
  }

  clearBannedUsersSearch(): void {
    this.bannedUsersSearch = '';
    this.bannedCurrentPage = 1;
  }

  openUnbanConfirm(row: BannedUserRow): void {
    if (this.unbanSubmitting) {
      return;
    }
    this.unbanError = '';
    this.unbanSuccess = '';
    this.unbanConfirmRow = row;
    this.cdr.markForCheck();
  }

  cancelUnbanConfirm(): void {
    if (this.unbanSubmitting) {
      return;
    }
    this.unbanConfirmRow = null;
    this.unbanError = '';
    this.cdr.markForCheck();
  }

  confirmUnban(): void {
    const row = this.unbanConfirmRow;
    if (!row || this.unbanSubmitting) {
      return;
    }

    this.unbanSubmitting = true;
    this.unbanError = '';
    this.cdr.markForCheck();

    this.adminUsersService
      .unbanUser(row.id)
      .pipe(
        finalize(() => {
          this.unbanSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.unbanConfirmRow = null;
          this.unbanSuccess = `${row.name} has been unbanned.`;
          this.loadDashboardData({ silent: true });
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.unbanError = this.extractUnbanError(err);
          this.cdr.markForCheck();
        }
      });
  }

  private extractUnbanError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
        return body.message;
      }
    }
    return 'Could not remove the ban. Try again.';
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

  loadCreatorRequests(options?: { silent?: boolean }): void {
    const silent = options?.silent === true;
    if (silent) {
      if (this.creatorRequestsSilentInFlight || this.creatorRequestsLoading) {
        return;
      }
      this.creatorRequestsSilentInFlight = true;
    } else {
      this.creatorRequestsLoading = true;
      this.creatorRequestsError = '';
      this.creatorRequestsApproveError = '';
    }
    this.adminUsersService
      .getCreatorRequests({
        page: this.creatorRequestsPage,
        pageSize: this.creatorRequestsPageSize,
        search: this.creatorRequestSearch.trim() || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          if (!silent) {
            this.creatorRequestsError = 'Could not load content creator requests.';
            return of({
              items: [] as CreatorRoleRequestDto[],
              page: 1,
              pageSize: this.creatorRequestsPageSize,
              totalCount: 0,
              totalPages: 0
            });
          }
          return EMPTY;
        }),
        finalize(() => {
          if (silent) {
            this.creatorRequestsSilentInFlight = false;
          } else {
            this.creatorRequestsLoading = false;
          }
          this.cdr.markForCheck();
        })
      )
      .subscribe((result) => {
        this.creatorRequests = result.items ?? [];
        this.creatorRequestsTotalCount =
          typeof result.totalCount === 'number' && Number.isFinite(result.totalCount) && result.totalCount >= 0
            ? result.totalCount
            : this.creatorRequests.length;
        const pages =
          typeof result.totalPages === 'number' && Number.isFinite(result.totalPages) && result.totalPages >= 0
            ? result.totalPages
            : 0;
        this.creatorRequestsTotalPages =
          this.creatorRequestsTotalCount === 0 ? 1 : Math.max(1, pages || Math.ceil(this.creatorRequestsTotalCount / this.creatorRequestsPageSize));
        this.creatorRequestsPage = Math.min(Math.max(1, result.page || 1), this.creatorRequestsTotalPages);
        this.cdr.markForCheck();
      });
  }

  onCreatorRequestSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.creatorRequestSearch = value;
    if (this.creatorRequestSearchDebounce) {
      clearTimeout(this.creatorRequestSearchDebounce);
    }
    this.creatorRequestSearchDebounce = setTimeout(() => {
      this.creatorRequestSearchDebounce = undefined;
      if (this.usersViewTab !== 'tourists') {
        return;
      }
      this.creatorRequestsPage = 1;
      this.loadCreatorRequests();
    }, 400);
  }

  clearCreatorRequestSearch(): void {
    if (this.creatorRequestSearchDebounce) {
      clearTimeout(this.creatorRequestSearchDebounce);
      this.creatorRequestSearchDebounce = undefined;
    }
    this.creatorRequestSearch = '';
    this.creatorRequestsPage = 1;
    this.loadCreatorRequests();
  }

  onCreatorRequestsPageSizeChange(value: number | string): void {
    this.creatorRequestsPageSize = Number(value);
    this.creatorRequestsPage = 1;
    this.loadCreatorRequests();
  }

  onCreatorRequestsPreviousPage(): void {
    if (this.creatorRequestsPage > 1) {
      this.creatorRequestsPage--;
      this.loadCreatorRequests();
    }
  }

  onCreatorRequestsNextPage(): void {
    if (this.creatorRequestsPage < this.creatorRequestsTotalPages) {
      this.creatorRequestsPage++;
      this.loadCreatorRequests();
    }
  }

  get creatorRequestsPageStart(): number {
    if (!this.creatorRequestsTotalCount || !this.creatorRequests.length) {
      return 0;
    }
    return (this.creatorRequestsPage - 1) * this.creatorRequestsPageSize + 1;
  }

  get creatorRequestsPageEnd(): number {
    return this.creatorRequestsPageStart + this.creatorRequests.length - 1;
  }

  formatCreatorRequestDate(value?: string): string {
    return this.formatDate(value);
  }

  creatorRequestDisplayName(row: CreatorRoleRequestDto): string {
    const name = `${row.firstName} ${row.lastName}`.trim();
    return name || row.email;
  }

  openCreatorApproveConfirm(row: CreatorRoleRequestDto): void {
    if (!row.isActive) {
      return;
    }
    this.dismissCreatorApproveSuccess();
    this.creatorRequestsApproveError = '';
    this.approveConfirmRow = row;
  }

  cancelCreatorApproveConfirm(): void {
    this.approveConfirmRow = null;
  }

  confirmCreatorApprove(): void {
    const row = this.approveConfirmRow;
    if (!row) {
      return;
    }
    const displayName = this.creatorRequestDisplayName(row);
    this.approveConfirmRow = null;
    this.approvingCreatorUserId = row.id;
    this.creatorRequestsApproveError = '';
    this.adminUsersService
      .approveCreatorRole(row.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err: unknown) => {
          let msg = 'Could not approve this request.';
          if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && 'message' in err.error) {
            msg = String((err.error as { message?: string }).message ?? msg);
          }
          this.creatorRequestsApproveError = msg;
          return EMPTY;
        }),
        finalize(() => {
          this.approvingCreatorUserId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe(() => {
        this.creatorRequestsApproveError = '';
        this.creatorRequestsApproveSuccess = `${displayName} has become a Content Creator.`;
        this.scheduleCreatorApproveSuccessDismiss();
        const nextTotal = Math.max(0, this.creatorRequestsTotalCount - 1);
        if (this.creatorRequestsPage > 1 && (this.creatorRequestsPage - 1) * this.creatorRequestsPageSize >= nextTotal) {
          this.creatorRequestsPage--;
        }
        this.loadDashboardData({ silent: true });
        this.loadCreatorRequests();
      });
  }

  denyCreatorRequest(row: CreatorRoleRequestDto): void {
    if (!row.isActive || this.approvingCreatorUserId !== null || this.rejectingCreatorUserId !== null) {
      return;
    }

    const displayName = this.creatorRequestDisplayName(row);
    this.dismissCreatorApproveSuccess();
    this.creatorRequestsApproveError = '';
    this.rejectingCreatorUserId = row.id;

    this.adminUsersService
      .rejectCreatorRole(row.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err: unknown) => {
          let msg = 'Could not reject this request.';
          if (err instanceof HttpErrorResponse && err.error && typeof err.error === 'object' && 'message' in err.error) {
            msg = String((err.error as { message?: string }).message ?? msg);
          }
          this.creatorRequestsApproveError = msg;
          return EMPTY;
        }),
        finalize(() => {
          this.rejectingCreatorUserId = null;
          this.cdr.markForCheck();
        })
      )
      .subscribe(() => {
        this.creatorRequestsApproveError = '';
        this.creatorRequestsApproveSuccess = `${displayName}'s request was denied and they were notified.`;
        this.scheduleCreatorApproveSuccessDismiss();
        const nextTotal = Math.max(0, this.creatorRequestsTotalCount - 1);
        if (this.creatorRequestsPage > 1 && (this.creatorRequestsPage - 1) * this.creatorRequestsPageSize >= nextTotal) {
          this.creatorRequestsPage--;
        }
        this.loadDashboardData({ silent: true });
        this.loadCreatorRequests();
      });
  }

  dismissCreatorApproveSuccess(): void {
    this.creatorRequestsApproveSuccess = '';
    if (this.approveSuccessDismissTimer !== undefined) {
      clearTimeout(this.approveSuccessDismissTimer);
      this.approveSuccessDismissTimer = undefined;
    }
  }

  private scheduleCreatorApproveSuccessDismiss(): void {
    if (this.approveSuccessDismissTimer !== undefined) {
      clearTimeout(this.approveSuccessDismissTimer);
    }
    this.approveSuccessDismissTimer = window.setTimeout(() => {
      this.creatorRequestsApproveSuccess = '';
      this.approveSuccessDismissTimer = undefined;
      this.cdr.markForCheck();
    }, 8000);
  }

  /** Rows for the origins sidebar: internal team vs tourists by active tab. */
  get activeOriginsRows(): { name: string; users: number; barPercent: number }[] {
    return this.usersViewTab === 'internal' ? this.topTeamOrigins : this.topOrigins;
  }

  toggleOriginsDemographics(): void {
    this.originsDemographicsChart = !this.originsDemographicsChart;
  }

  /** Pie slices: each angle is proportional to `users` within the displayed origins total. */
  get originsPieSlices(): OriginsPieSlice[] {
    const rows = this.activeOriginsRows;
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

  /** Country histogram for a user list (tourists or internal team). */
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

  /** New internal-team accounts per day in the window, by normalized role name. */
  private bindInternalTeamActivityChart(internalTeam: AdminUserListItemDto[]): void {
    const norm = (u: AdminUserListItemDto) =>
      (u.roleName ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '');
    const dailyAdmins = this.buildDailyBucketsFromUsers(
      internalTeam.filter((u) => norm(u) === 'admin'),
      CHART_DAYS
    );
    const dailyManagers = this.buildDailyBucketsFromUsers(
      internalTeam.filter((u) => norm(u) === 'manager'),
      CHART_DAYS
    );
    const dailyCreators = this.buildDailyBucketsFromUsers(
      internalTeam.filter((u) => norm(u) === 'contentcreator'),
      CHART_DAYS
    );
    const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
    const maxVal = Math.max(...dailyAdmins, ...dailyManagers, ...dailyCreators, 0);
    this.internalChartMaxY = Math.max(maxVal, 1);
    this.internalChartYTopLabel = maxVal === 0 ? '0' : String(maxVal);
    this.internalChartYMidLabel = maxVal === 0 ? '0' : String(Math.round(maxVal / 2));
    this.internalChartIsEmpty = maxVal === 0;
    const a = sum(dailyAdmins);
    const m = sum(dailyManagers);
    const c = sum(dailyCreators);
    this.internalChartSubtitle = this.internalChartIsEmpty
      ? `Last ${CHART_DAYS} days — no new admin, manager, or content-creator accounts with a join date in this window (from loaded team).`
      : `Last ${CHART_DAYS} days — new accounts: ${a} admin, ${m} manager, ${c} content creator (from loaded team).`;
    this.internalChartLineAdmins = this.buildLinePath(dailyAdmins, this.internalChartMaxY);
    this.internalChartLineManagers = this.buildLinePath(dailyManagers, this.internalChartMaxY);
    this.internalChartLineCreators = this.buildLinePath(dailyCreators, this.internalChartMaxY);
    this.internalChartXLabels = this.buildChartXLabels(CHART_DAYS);
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

  getInitials(firstName: string, lastName: string): string {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || 'U';
  }

  hasPendingManagerReport(userId: number): boolean {
    return this.pendingReportByUserId.has(userId);
  }

  isReportRowHighlighted(userId: number): boolean {
    return this.highlightedReportUserId === userId;
  }

  openManagerReportForUser(userId: number, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    const report = this.pendingReportByUserId.get(userId);
    if (report) {
      this.openManagerReportModal(report);
    }
  }

  closeManagerReportModal(): void {
    this.activeManagerReport = null;
    this.highlightedReportUserId = null;
    this.reportReviewError = '';
    this.reportRejectReason = '';
    this.resetBanDurationForm();
    this.clearReportQueryParams();
    this.cdr.markForCheck();
  }

  selectBanDuration(option: BanDurationOption): void {
    this.banDuration = option;
    if (option !== 'custom') {
      this.banCustomEndDate = '';
    }
    this.reportReviewError = '';
    this.banModalError = '';
    this.cdr.markForCheck();
  }

  get banCustomDateMin(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.toDateInputValue(today);
  }

  get isBanDurationValid(): boolean {
    if (this.banDuration !== 'custom') {
      return true;
    }
    return !!this.resolveBanExpiresAtUtc();
  }

  get canConfirmBanFromReport(): boolean {
    return !!this.activeManagerReport && !this.reportReviewSubmitting && this.isBanDurationValid;
  }

  get canConfirmBanModal(): boolean {
    return (
      !!this.banModalTarget &&
      !this.banModalSubmitting &&
      !!this.banModalReason.trim() &&
      this.isBanDurationValid
    );
  }

  confirmBanFromReport(): void {
    if (!this.activeManagerReport || this.reportReviewSubmitting) {
      return;
    }
    if (!this.isBanDurationValid) {
      this.reportReviewError = 'Choose an end date for a custom ban duration.';
      this.cdr.markForCheck();
      return;
    }
    this.submitManagerReportReview(true);
  }

  confirmRejectReport(): void {
    if (!this.activeManagerReport || this.reportReviewSubmitting) {
      return;
    }
    const reason = this.reportRejectReason.trim();
    if (!reason) {
      this.reportReviewError = 'Enter a reason when rejecting a report.';
      this.cdr.markForCheck();
      return;
    }
    this.submitManagerReportReview(false, reason);
  }

  private submitManagerReportReview(approve: boolean, rejectionReason?: string): void {
    const report = this.activeManagerReport;
    if (!report) {
      return;
    }

    this.reportReviewSubmitting = true;
    this.reportReviewError = '';
    this.reportReviewSuccess = '';
    this.cdr.markForCheck();

    this.managerReportsService
      .reviewReport(report.id, {
        approve,
        rejectionReason: approve ? null : rejectionReason
      })
      .pipe(
        switchMap(() =>
          approve
            ? this.adminUsersService.banUser(
                report.reportedUserId,
                this.buildBanDto(this.buildReportBanReason(report))
              )
            : of(null)
        ),
        finalize(() => {
          this.reportReviewSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.pendingReportByUserId.delete(report.reportedUserId);
          this.reportReviewSuccess = approve
            ? `Report approved. The user has been banned (${this.banDurationSummary()}).`
            : 'Report rejected. The content creator remains on the platform.';
          this.activeManagerReport = null;
          this.highlightedReportUserId = null;
          this.reportRejectReason = '';
          this.resetBanDurationForm();
          this.clearReportQueryParams();
          this.loadDashboardData({ silent: true });
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.reportReviewError = this.extractReportReviewError(err);
          this.cdr.markForCheck();
        }
      });
  }

  canBanAccount(roleName: string, isBanned: boolean): boolean {
    if (isBanned) {
      return false;
    }
    const role = (roleName ?? '').trim().toLowerCase().replace(/[\s-]+/g, '');
    return role === 'tourist' || role === 'contentcreator';
  }

  openBanUserModal(target: BanUserModalTarget): void {
    if (this.banModalSubmitting || this.reportReviewSubmitting) {
      return;
    }
    this.banModalTarget = target;
    this.banModalReason = '';
    this.banModalError = '';
    this.resetBanDurationForm();
    this.cdr.markForCheck();
  }

  closeBanUserModal(): void {
    if (this.banModalSubmitting) {
      return;
    }
    this.banModalTarget = null;
    this.banModalError = '';
    this.cdr.markForCheck();
  }

  confirmBanUserModal(): void {
    const target = this.banModalTarget;
    if (!target || this.banModalSubmitting) {
      return;
    }

    const reason = this.banModalReason.trim();
    if (!reason) {
      this.banModalError = 'Enter a ban reason.';
      this.cdr.markForCheck();
      return;
    }

    if (!this.isBanDurationValid) {
      this.banModalError = 'Choose a valid end date for a custom ban duration.';
      this.cdr.markForCheck();
      return;
    }

    this.banModalSubmitting = true;
    this.banModalError = '';
    this.cdr.markForCheck();

    this.adminUsersService
      .banUser(target.id, this.buildBanDto(reason))
      .pipe(
        finalize(() => {
          this.banModalSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          const summary = this.banDurationSummary();
          this.banModalTarget = null;
          this.banModalReason = '';
          this.resetBanDurationForm();
          this.reportReviewSuccess = `${target.name} has been banned (${summary}).`;
          this.loadDashboardData({ silent: true });
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.banModalError = this.extractReportReviewError(err);
          this.cdr.markForCheck();
        }
      });
  }

  private buildBanDto(reason: string): BanUserDto {
    return {
      reason,
      banExpiresAtUtc: this.resolveBanExpiresAtUtc()
    };
  }

  private buildReportBanReason(report: ManagerReportDto): string {
    const reason = (report.reason ?? '').trim();
    if (!reason) {
      return 'Banned following an upheld manager report.';
    }
    return reason.length > 500 ? reason.slice(0, 500) : reason;
  }

  private extractReportReviewError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error;
      if (body && typeof body === 'object' && 'message' in body && typeof body.message === 'string') {
        return body.message;
      }
    }
    return 'Could not process this report. Try again.';
  }

  private fetchAllPendingManagerReports(): Observable<ManagerReportDto[]> {
    return this.managerReportsService
      .getAllReports({
        page: 1,
        pageSize: 100,
        status: 'Pending',
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      .pipe(
        switchMap((firstPage) => {
          const firstItems = (firstPage.items ?? []).filter(
            (r) => (r.status ?? '').toLowerCase() === 'pending'
          );
          const cappedTotal = this.capTotalPages(firstPage.totalPages, MAX_MANAGER_REPORT_PAGES);
          if (cappedTotal <= 1) {
            return of(firstItems);
          }

          const requests = Array.from({ length: cappedTotal - 1 }, (_, i) =>
            this.managerReportsService.getAllReports({
              page: i + 2,
              pageSize: 100,
              status: 'Pending',
              sortBy: 'createdAt',
              sortOrder: 'desc'
            })
          );

          return forkJoin(requests).pipe(
            map((restPages) => [
              ...firstItems,
              ...restPages
                .flatMap((p) => p.items ?? [])
                .filter((r) => (r.status ?? '').toLowerCase() === 'pending')
            ])
          );
        }),
        catchError(() => {
          this.managerReportsLoadError = 'Could not load pending creator reports.';
          return of([] as ManagerReportDto[]);
        })
      );
  }

  private bindPendingManagerReports(reports: ManagerReportDto[]): void {
    this.pendingReportByUserId.clear();
    for (const report of reports) {
      if ((report.status ?? '').toLowerCase() !== 'pending') {
        continue;
      }
      const existing = this.pendingReportByUserId.get(report.reportedUserId);
      if (!existing || new Date(report.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
        this.pendingReportByUserId.set(report.reportedUserId, report);
      }
    }
    this.managerReportsLoadError = '';
  }

  private tryOpenPendingReportFromQuery(): void {
    if (!this.pendingReportQuery || this.isLoading) {
      return;
    }

    const { reportId, reportedUserId } = this.pendingReportQuery;

    if (reportId) {
      const fromMap = [...this.pendingReportByUserId.values()].find((r) => r.id === reportId);
      if (fromMap) {
        this.pendingReportQuery = null;
        this.openManagerReportModal(fromMap);
        return;
      }

      this.managerReportsService
        .getReportById(reportId)
        .pipe(takeUntilDestroyed(this.destroyRef), catchError(() => of(null)))
        .subscribe((report) => {
          if (!report || (report.status ?? '').toLowerCase() !== 'pending') {
            this.pendingReportQuery = null;
            this.clearReportQueryParams();
            this.cdr.markForCheck();
            return;
          }
          this.pendingReportByUserId.set(report.reportedUserId, report);
          this.pendingReportQuery = null;
          this.openManagerReportModal(report);
        });
      return;
    }

    if (reportedUserId) {
      const report = this.pendingReportByUserId.get(reportedUserId);
      this.pendingReportQuery = null;
      if (report) {
        this.openManagerReportModal(report);
      } else {
        this.clearReportQueryParams();
        this.highlightedReportUserId = reportedUserId;
        this.focusAdminDirectoryPageForUser(reportedUserId);
        this.cdr.markForCheck();
      }
    }
  }

  private openManagerReportModal(report: ManagerReportDto): void {
    this.activeManagerReport = report;
    this.highlightedReportUserId = report.reportedUserId;
    this.reportReviewError = '';
    this.reportReviewSuccess = '';
    this.reportRejectReason = '';
    this.resetBanDurationForm();
    this.focusAdminDirectoryPageForUser(report.reportedUserId);
    this.cdr.markForCheck();
  }

  private resetBanDurationForm(): void {
    this.banDuration = 'permanent';
    this.banCustomEndDate = '';
  }

  banDurationSummary(): string {
    const endsAt = this.resolveBanExpiresAtUtc();
    if (this.banDuration === 'permanent' || !endsAt) {
      return 'permanent';
    }
    return `until ${this.formatDate(endsAt)}`;
  }

  /** ISO UTC expiry for `POST /users/{id}/ban`; `null` = permanent. */
  private resolveBanExpiresAtUtc(): string | null {
    if (this.banDuration === 'permanent') {
      return null;
    }

    if (this.banDuration === '30-days') {
      const end = new Date();
      end.setUTCDate(end.getUTCDate() + 30);
      return end.toISOString();
    }

    const raw = this.banCustomEndDate.trim();
    if (!raw) {
      return null;
    }

    const parts = raw.split('-').map((part) => parseInt(part, 10));
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }

    const end = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) {
      return null;
    }

    return end.toISOString();
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private focusAdminDirectoryPageForUser(userId: number): void {
    const index = this.filteredAdminDirectory.findIndex((m) => m.id === userId);
    if (index < 0) {
      return;
    }
    const page = Math.floor(index / this.adminPageSize) + 1;
    this.adminCurrentPage = Math.min(Math.max(1, page), this.adminTotalPages);
  }

  private clearReportQueryParams(): void {
    const reportId = this.route.snapshot.queryParamMap.get('reportId');
    const reportedUserId = this.route.snapshot.queryParamMap.get('reportedUserId');
    if (!reportId && !reportedUserId) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { reportId: null, reportedUserId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  managerReportSubmittedLabel(report: ManagerReportDto): string {
    return report.managerName?.trim() || `Manager #${report.managerId}`;
  }

  formatDate(value?: string): string {
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
