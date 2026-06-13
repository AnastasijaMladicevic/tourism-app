import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subject, catchError, finalize, forkJoin, map, of, switchMap, type Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DestinationService } from '../../../services/destination.service';
import { ObjectDto, ObjectService } from '../../../services/object';
import { ReviewService } from '../../../services/review';
import { AuthService } from '../../../services/auth.service';
import {
  ManagerReportDto,
  ManagerReportsService,
} from '../../../services/manager-reports.service';
import { environment } from '../../../../environment/environment';
import { HttpClient } from '@angular/common/http';
import { buildReviewReportReason } from '../shared/concerning-reply.util';
import {
  ManagerReportModalComponent,
  ReportableCreatorOption,
} from '../shared/manager-report-modal.component';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../services/translation.service';

export type ReportStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ManagerReportRow {
  id: number;
  reportedUserName: string;
  reason: string;
  status: ReportStatus;
  destinationName: string;
  createdAt: string;
  resolvedAt?: string;
  rejectionReason?: string;
  reportedUserId: number;
  reportedUserType: 'creator' | 'tourist';
}

interface DeletionRequestNameHint {
  requestedByUserId: number;
  requestedByName?: string;
}

interface ManagerReportNameHint {
  reportedUserId: number;
  reportedUserName?: string;
}

@Component({
  selector: 'app-manager-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ManagerReportModalComponent, TranslatePipe],
  templateUrl: './manager-reports.component.html',
  styleUrls: [
    './manager-reports.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/manager-list-page-header.css',
    '../shared/manager-list-page-responsive.css',
    '../shared/manager-cc-page-parity.css',
  ],
})
export class ManagerReportsComponent implements OnInit, OnDestroy {
  private readonly managerReportsService = inject(ManagerReportsService);
  private readonly objectService = inject(ObjectService);
  private readonly reviewService = inject(ReviewService);
  private readonly authService = inject(AuthService);
  private readonly destinationService = inject(DestinationService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly translationService = inject(TranslationService);

  private readonly creatorNameById = new Map<number, string>();
  private readonly destroy$ = new Subject<void>();

  managedDestination = '';
  allReports: ManagerReportRow[] = [];
  reportableCreators: ReportableCreatorOption[] = [];
  reportableTourists: ReportableCreatorOption[] = [];

  isLoading = true;
  errorMessage = '';
  successMessage = '';

  draftSearchQuery = '';
  searchQuery = '';
  statusFilter: 'all' | ReportStatus = 'all';

  reportModalOpen = false;
  reportModalCreatorId: number | null = null;
  reportModalCategory = 'unprofessional_conduct';
  reportModalReason = '';

  selectedReport: ManagerReportRow | null = null;

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit(): void {
    this.loadManagedDestinationLabel();
    this.loadPageData();

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const creatorId = Number(params.get('creatorId'));
      const openReport = params.get('openReport') === '1' || params.get('openReport') === 'true';
      const reason = params.get('reason')?.trim() ?? '';
      const category = params.get('category')?.trim() ?? 'unprofessional_conduct';

      if (openReport && Number.isFinite(creatorId) && creatorId > 0) {
        this.reportModalCreatorId = creatorId;
        this.reportModalCategory = category || 'unprofessional_conduct';
        this.reportModalReason = reason;
        this.reportModalOpen = true;
        this.cdr.detectChanges();
      }
    });
  }

  get pendingCount(): number {
    return this.allReports.filter((report) => report.status === 'Pending').length;
  }

  get filteredReports(): ManagerReportRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.allReports.filter((report) => {
      if (this.statusFilter !== 'all' && report.status !== this.statusFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        report.reportedUserName.toLowerCase().includes(q) ||
        report.reason.toLowerCase().includes(q) ||
        String(report.id).includes(q)
      );
    });
  }

  get availableCreators(): ReportableCreatorOption[] {
    return this.reportableCreators.filter((creator) => !creator.hasPendingReport);
  }

  loadPageData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.loadCreatorNameHints()
      .pipe(
        switchMap(() =>
          forkJoin({
            reports: this.getAllPagedReports(),
            objects: this.getAllPagedObjects(),
          }),
        ),
        switchMap(({ reports, objects }) => {
          const pendingIds = new Set(
            reports
              .filter((report) => report.status?.toLowerCase() === 'pending')
              .map((report) => report.reportedUserId),
          );
          const objectIds = objects.map((object) => object.id);

          return this.fetchReportableTourists(objectIds, pendingIds).pipe(
            map((tourists) => ({ reports, objects, pendingIds, tourists })),
          );
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: ({ reports, objects, pendingIds, tourists }) => {
          for (const report of reports) {
            const name = report.reportedUserName?.trim();
            if (name && report.reportedUserId > 0) {
              this.creatorNameById.set(report.reportedUserId, name);
            }
          }

          const creatorOwnerIds = new Set(
            objects
              .map((object) => object.createdByUserId)
              .filter((id): id is number => !!id),
          );

          this.allReports = reports.map((report) => this.mapReportRow(report, creatorOwnerIds));
          this.reportableCreators = this.buildReportableCreators(objects, pendingIds);
          this.reportableTourists = tourists;

          const creatorIds = [
            ...new Set([
              ...this.reportableCreators.map((creator) => creator.id),
              ...this.allReports.map((report) => report.reportedUserId),
            ]),
          ];
          this.resolveCreatorNames(creatorIds);

          if (!this.selectedReport || !this.allReports.some((r) => r.id === this.selectedReport!.id)) {
            this.selectedReport = this.filteredReports[0] ?? null;
          }
        },
        error: (error: { error?: { message?: string } }) => {
          this.allReports = [];
          this.reportableCreators = [];
          this.reportableTourists = [];
          this.selectedReport = null;
          this.errorMessage =
            error?.error?.message ?? this.translationService.translate('manager.reports.error.load');
        },
      });
  }

  onSearchChange(value: string): void {
    this.draftSearchQuery = value;
    this.searchQuery = value.trim();
    this.syncSelectedReport();
  }

  setStatusFilter(filter: 'all' | ReportStatus): void {
    this.statusFilter = filter;
    this.syncSelectedReport();
  }

  onResetFilters(): void {
    this.statusFilter = 'all';
    this.draftSearchQuery = '';
    this.searchQuery = '';
    this.syncSelectedReport();
  }

  private syncSelectedReport(): void {
    if (this.selectedReport && !this.filteredReports.some((r) => r.id === this.selectedReport!.id)) {
      this.selectedReport = this.filteredReports[0] ?? null;
    }
  }

  selectReport(report: ManagerReportRow): void {
    this.selectedReport = report;
  }

  openReportModal(creator?: ReportableCreatorOption): void {
    this.reportModalCreatorId = creator?.id ?? null;
    this.reportModalCategory = 'unprofessional_conduct';
    this.reportModalReason = '';
    this.reportModalOpen = true;
  }

  closeReportModal(): void {
    this.reportModalOpen = false;
  }

  onReportSubmitted(): void {
    this.successMessage = this.translationService.translate('manager.reportModal.successSubmitted');
    this.reportModalOpen = false;
    this.loadPageData();
  }

  withdrawReport(report: ManagerReportRow, event: Event): void {
    event.stopPropagation();
    if (report.status !== 'Pending') {
      return;
    }

    this.managerReportsService.withdrawReport(report.id).subscribe({
      next: () => {
        this.successMessage = this.translationService.translate('manager.reports.success.withdrawn');
        this.loadPageData();
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage =
          error?.error?.message ?? this.translationService.translate('manager.reports.error.withdraw');
        this.cdr.detectChanges();
      },
    });
  }

  getUserTypeLabel(type: 'creator' | 'tourist'): string {
    return this.translationService.translate(`manager.reports.userType.${type}`);
  }

  formatStatus(status: ReportStatus): string {
    return this.translationService.translate(`manager.reports.status.${status.toLowerCase()}`);
  }

  getStatusClass(status: ReportStatus): string {
    if (status === 'Approved') return 'published';
    if (status === 'Rejected') return 'rejected';
    return 'draft';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(this.translationService.currentLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  trackByReportId(_: number, report: ManagerReportRow): number {
    return report.id;
  }

  /** Build report reason from query params when redirected from reviews page. */
  static buildReasonFromReviewQuery(params: {
    reviewId?: string;
    objectName?: string;
    touristName?: string;
    rating?: string;
    creatorName?: string;
    reply?: string;
    category?: string;
    autoDetected?: string;
  }): string {
    const reviewId = Number(params.reviewId);
    if (!Number.isFinite(reviewId) || !params.reply?.trim()) {
      return params.reply?.trim() ?? '';
    }

    return buildReviewReportReason({
      reviewId,
      objectName: params.objectName ?? 'Object',
      touristName: params.touristName ?? 'Tourist',
      touristRating: Number(params.rating) || 0,
      creatorName: params.creatorName ?? 'Content creator',
      creatorResponse: params.reply,
      category: params.category ?? 'unprofessional_conduct',
      autoDetected: params.autoDetected === '1' || params.autoDetected === 'true',
    }, {
      categoryPrefix: 'Category',
      autoDetected: 'Flagged automatically as a concerning reply (language / conduct rules).',
      managerModeration: 'Reported from manager review moderation.',
      reviewLabel: 'Review',
      touristLabel: 'Tourist',
      creatorLabel: 'Content creator',
      replyLabel: 'Reply',
    });
  }

  private mapReportRow(report: ManagerReportDto, creatorOwnerIds: Set<number>): ManagerReportRow {
    const status = this.normalizeStatus(report.status);
    return {
      id: report.id,
      reportedUserId: report.reportedUserId,
      reportedUserName:
        report.reportedUserName?.trim() ||
        this.translationService.translate('manager.reports.fallback.notAvailable'),
      reason: report.reason,
      status,
      destinationName:
        report.destinationName?.trim() ||
        this.translationService.translate('manager.reports.fallback.notAvailable'),
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt ?? undefined,
      rejectionReason: report.rejectionReason ?? undefined,
      reportedUserType: creatorOwnerIds.has(report.reportedUserId) ? 'creator' : 'tourist',
    };
  }

  private normalizeStatus(status: string): ReportStatus {
    const value = status?.trim();
    if (value === 'Approved' || value === 'Rejected' || value === 'Pending') {
      return value;
    }
    return 'Pending';
  }

  /** Builds the list of tourists who reviewed the manager's objects, available to report. */
  private fetchReportableTourists(
    objectIds: number[],
    pendingIds: Set<number>,
  ): Observable<ReportableCreatorOption[]> {
    if (!objectIds.length) {
      return of([]);
    }

    return this.reviewService.getForManagerObjects(objectIds).pipe(
      catchError(() => of([])),
      map((reviews) => {
        const tourists = new Map<number, ReportableCreatorOption>();

        for (const review of reviews) {
          if (!review.userId || tourists.has(review.userId)) {
            continue;
          }
          tourists.set(review.userId, {
            id: review.userId,
            name:
              review.userFullName?.trim() ||
              this.translationService.translate('manager.reports.fallback.tourist'),
            contentSummary: '',
            hasPendingReport: pendingIds.has(review.userId),
          });
        }

        return Array.from(tourists.values()).sort((a, b) => a.name.localeCompare(b.name));
      }),
    );
  }

  private buildReportableCreators(
    objects: ObjectDto[],
    pendingIds: Set<number>,
  ): ReportableCreatorOption[] {
    const counts = new Map<number, number>();
    for (const object of objects) {
      if (!object.createdByUserId) {
        continue;
      }
      counts.set(object.createdByUserId, (counts.get(object.createdByUserId) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .map(([id, count]) => ({
        id,
        name:
          this.creatorNameById.get(id) ??
          this.translationService.translate('manager.reports.fallback.contentCreator'),
        contentSummary: this.translationService.translate('manager.reports.creatorSummary', {
          count,
        }),
        hasPendingReport: pendingIds.has(id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  private getAllPagedReports() {
    return this.getAllPagedItems((page) =>
      this.managerReportsService.getMyReports({
        page,
        pageSize: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    );
  }

  private getAllPagedObjects() {
    return this.getAllPagedItems((page) =>
      this.objectService.getForManager({
        page,
        pageSize: 100,
        sortBy: 'name',
        sortOrder: 'asc',
      }),
    );
  }

  private getAllPagedItems<T>(
    fetchPage: (page: number) => import('rxjs').Observable<{ items?: T[]; totalPages?: number }>,
  ) {
    return fetchPage(1).pipe(
      switchMap((firstPage) => {
        const firstItems = firstPage.items ?? [];
        const totalPages = Math.max(1, firstPage.totalPages ?? 1);
        if (totalPages === 1) {
          return of(firstItems);
        }
        const requests = Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2));
        return forkJoin(requests).pipe(
          map((pages) => [...firstItems, ...pages.flatMap((page) => page.items ?? [])]),
        );
      }),
    );
  }

  private loadManagedDestinationLabel(): void {
    this.destinationService
      .getAll({ page: 1, pageSize: 100, sortBy: 'name', sortOrder: 'asc' }, { bypassRegion: true })
      .subscribe({
        next: (response: unknown) => {
          const list = Array.isArray(response)
            ? response
            : ((response as { items?: unknown[] })?.items ?? []);
          const destinations = list as Array<{ name?: string }>;
          const cityNames = [
            ...new Set(
              destinations
                .map((d) => d.name?.trim())
                .filter((n): n is string => !!n),
            ),
          ].sort((a, b) => a.localeCompare(b));
          this.managedDestination = cityNames.length
            ? cityNames.join(', ')
            : this.translationService.translate('manager.reports.managedDestinationFallback');
          this.cdr.detectChanges();
        },
        error: () => {
          this.managedDestination = this.translationService.translate(
            'manager.reports.managedDestinationFallback',
          );
        },
      });
  }

  private loadCreatorNameHints() {
    const pageSize = 100;
    const deletionUrl = `${environment.apiUrl}/deletion-requests`;
    const reportsUrl = `${environment.apiUrl}/manager-reports/my`;

    return forkJoin({
      deletionRequests: this.getAllPagedItems<DeletionRequestNameHint>((page) =>
        this.http.get<{ items?: DeletionRequestNameHint[]; totalPages?: number }>(deletionUrl, {
          params: { page, pageSize },
        }),
      ).pipe(catchError(() => of([] as DeletionRequestNameHint[]))),
      managerReports: this.getAllPagedItems<ManagerReportNameHint>((page) =>
        this.http.get<{ items?: ManagerReportNameHint[]; totalPages?: number }>(reportsUrl, {
          params: { page, pageSize },
        }),
      ).pipe(catchError(() => of([] as ManagerReportNameHint[]))),
    }).pipe(
      map(({ deletionRequests, managerReports }) => {
        for (const request of deletionRequests) {
          const name = request.requestedByName?.trim();
          if (name && request.requestedByUserId > 0) {
            this.creatorNameById.set(request.requestedByUserId, name);
          }
        }

        for (const report of managerReports) {
          const name = report.reportedUserName?.trim();
          if (name && report.reportedUserId > 0) {
            this.creatorNameById.set(report.reportedUserId, name);
          }
        }
      }),
    );
  }

  private resolveCreatorNames(creatorIds: number[]): void {
    const pending = creatorIds.filter((id) => id > 0 && !this.hasResolvedCreatorName(id));
    if (!pending.length) {
      this.applyCreatorNamesToLists();
      return;
    }

    this.authService
      .getDisplayNames(pending)
      .pipe(
        map((users) =>
          users.map((user) => {
            const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
            return {
              creatorId: user.id,
              fullName: fullName || user.email?.trim() || '',
            };
          }),
        ),
        catchError(() => of([] as { creatorId: number; fullName: string }[])),
      )
      .subscribe((results) => {
      let changed = false;
      for (const result of results) {
        if (!result.fullName) {
          continue;
        }
        this.creatorNameById.set(result.creatorId, result.fullName);
        changed = true;
      }
      if (changed || pending.length) {
        this.applyCreatorNamesToLists();
      }
    });
  }

  private hasResolvedCreatorName(creatorId: number): boolean {
    const name = this.creatorNameById.get(creatorId)?.trim();
    if (!name) {
      return false;
    }
    const fallback = this.translationService.translate('manager.reports.fallback.contentCreator');
    return !new RegExp(`^${fallback}$`, 'i').test(name) && name.trim().length > 0;
  }

  private applyCreatorNamesToLists(): void {
    this.reportableCreators = this.reportableCreators.map((creator) => ({
      ...creator,
      name: this.creatorNameById.get(creator.id) ?? creator.name,
    }));
    this.allReports = this.allReports.map((report) => ({
      ...report,
      reportedUserName:
        this.creatorNameById.get(report.reportedUserId) ?? report.reportedUserName,
    }));
    if (this.selectedReport) {
      const updated = this.allReports.find((report) => report.id === this.selectedReport!.id);
      this.selectedReport = updated ?? null;
    }
    this.cdr.detectChanges();
  }
}
