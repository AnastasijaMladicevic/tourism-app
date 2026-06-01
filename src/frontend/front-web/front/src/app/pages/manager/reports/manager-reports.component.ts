import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { DestinationService } from '../../../services/destination.service';
import { ObjectDto, ObjectService } from '../../../services/object';
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
  imports: [CommonModule, FormsModule, RouterLink, ManagerReportModalComponent],
  templateUrl: './manager-reports.component.html',
  styleUrls: [
    './manager-reports.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/manager-list-page-header.css',
    '../shared/manager-list-page-responsive.css',
    '../shared/manager-page-stats-scroll.css',
    '../shared/manager-stat-cards.css'
  ],
})
export class ManagerReportsComponent implements OnInit {
  private readonly managerReportsService = inject(ManagerReportsService);
  private readonly objectService = inject(ObjectService);
  private readonly destinationService = inject(DestinationService);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);

  private readonly creatorNameById = new Map<number, string>();

  managedDestination = 'your destinations';
  allReports: ManagerReportRow[] = [];
  reportableCreators: ReportableCreatorOption[] = [];

  isLoading = true;
  errorMessage = '';
  successMessage = '';

  draftSearchQuery = '';
  searchQuery = '';
  statusFilter: 'all' | ReportStatus = 'all';
  filterPanelOpen = true;

  reportModalOpen = false;
  reportModalCreatorId: number | null = null;
  reportModalCategory = 'unprofessional_conduct';
  reportModalReason = '';

  selectedReport: ManagerReportRow | null = null;

  ngOnInit(): void {
    this.loadManagedDestinationLabel();
    this.loadPageData();

    this.route.queryParamMap.subscribe((params) => {
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
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        }),
      )
      .subscribe({
        next: ({ reports, objects }) => {
          const pendingIds = new Set(
            reports
              .filter((report) => report.status?.toLowerCase() === 'pending')
              .map((report) => report.reportedUserId),
          );

          for (const report of reports) {
            const name = report.reportedUserName?.trim();
            if (name && report.reportedUserId > 0) {
              this.creatorNameById.set(report.reportedUserId, name);
            }
          }

          this.allReports = reports.map((report) => this.mapReportRow(report));
          this.reportableCreators = this.buildReportableCreators(objects, pendingIds);

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
          this.selectedReport = null;
          this.errorMessage = error?.error?.message ?? 'Failed to load reports.';
        },
      });
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.searchQuery = this.draftSearchQuery.trim();
    if (this.selectedReport && !this.filteredReports.some((r) => r.id === this.selectedReport!.id)) {
      this.selectedReport = this.filteredReports[0] ?? null;
    }
  }

  onApplyFilters(): void {
    this.filterPanelOpen = false;
    if (this.selectedReport && !this.filteredReports.some((r) => r.id === this.selectedReport!.id)) {
      this.selectedReport = this.filteredReports[0] ?? null;
    }
  }

  onResetFilters(): void {
    this.statusFilter = 'all';
    this.draftSearchQuery = '';
    this.searchQuery = '';
    this.filterPanelOpen = false;
  }

  toggleFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
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
    this.successMessage = 'Creator report submitted successfully.';
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
        this.successMessage = 'Report withdrawn.';
        this.loadPageData();
      },
      error: (error: { error?: { message?: string } }) => {
        this.errorMessage = error?.error?.message ?? 'Failed to withdraw report.';
        this.cdr.detectChanges();
      },
    });
  }

  formatStatus(status: ReportStatus): string {
    return status;
  }

  getStatusClass(status: ReportStatus): string {
    if (status === 'Approved') return 'published';
    if (status === 'Rejected') return 'rejected';
    return 'draft';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
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
    });
  }

  private mapReportRow(report: ManagerReportDto): ManagerReportRow {
    const status = this.normalizeStatus(report.status);
    return {
      id: report.id,
      reportedUserId: report.reportedUserId,
      reportedUserName: report.reportedUserName?.trim() || '—',
      reason: report.reason,
      status,
      destinationName: report.destinationName?.trim() || '—',
      createdAt: report.createdAt,
      resolvedAt: report.resolvedAt ?? undefined,
      rejectionReason: report.rejectionReason ?? undefined,
    };
  }

  private normalizeStatus(status: string): ReportStatus {
    const value = status?.trim();
    if (value === 'Approved' || value === 'Rejected' || value === 'Pending') {
      return value;
    }
    return 'Pending';
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
        name: this.creatorNameById.get(id) ?? 'Content creator',
        contentSummary: `${count} object${count === 1 ? '' : 's'} in your destinations`,
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
          this.managedDestination = cityNames.length ? cityNames.join(', ') : 'your destinations';
          this.cdr.detectChanges();
        },
        error: () => {
          this.managedDestination = 'your destinations';
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

    forkJoin(
      pending.map((creatorId) =>
        this.http
          .get<{ firstName?: string; lastName?: string; email?: string }>(
            `${environment.apiUrl}/users/${creatorId}`,
          )
          .pipe(
            map((user) => {
              const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
              return {
                creatorId,
                fullName: fullName || user.email?.trim() || '',
              };
            }),
            catchError(() => of({ creatorId, fullName: '' })),
          ),
      ),
    ).subscribe((results) => {
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
    return !/^content creator$/i.test(name) && name.trim().length > 0;
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
