import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../../environment/environment';
import { ManagerReportsService } from '../../../services/manager-reports.service';
import {
  buildReviewReportReason,
  isConcerningCreatorReply,
} from '../shared/concerning-reply.util';
import {
  ManagerReportModalComponent,
  ReportableCreatorOption,
} from '../shared/manager-report-modal.component';
import {
  Subject,
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  takeUntil,
  throwError,
  timer,
  timeout,
  Observable,
} from 'rxjs';
import { DestinationService } from '../../../services/destination.service';
import { ManagerDashboardService } from '../../../services/manager-dashboard.service';
import { ObjectDto, ObjectService } from '../../../services/object';
import { ReviewDto, ReviewService } from '../../../services/review';

export interface ManagerReviewThread {
  id: number;
  touristName: string;
  touristInitials: string;
  objectId: number;
  objectName: string;
  localityName: string;
  destinationName: string;
  creatorId: number;
  creatorName: string;
  rating: number;
  touristReview: string;
  createdAt: string;
  creatorResponse?: string | null;
  creatorResponseAt?: string | null;
}

interface ObjectReviewContext {
  creatorId: number;
  localityName: string;
  destinationName: string;
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
  selector: 'app-manager-creator-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ManagerReportModalComponent],
  templateUrl: './manager-creator-reviews.component.html',
  styleUrls: [
    './manager-creator-reviews.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/manager-list-page-header.css',
    '../shared/manager-list-page-responsive.css',
    '../shared/manager-page-stats-scroll.css'
  ],
})
export class ManagerCreatorReviewsComponent implements OnInit, OnDestroy {
  private readonly reviewService = inject(ReviewService);
  private readonly objectService = inject(ObjectService);
  private readonly destinationService = inject(DestinationService);
  private readonly http = inject(HttpClient);
  private readonly managerReportsService = inject(ManagerReportsService);
  private readonly dashboardService = inject(ManagerDashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private readonly creatorNameById = new Map<number, string>();
  private readonly pendingReportCreatorIds = new Set<number>();
  private readonly creatorObjectCounts = new Map<number, number>();

  allThreads: ManagerReviewThread[] = [];
  managedDestination = 'your destinations';

  searchTerm = '';
  responseFilter: 'all' | 'responded' | 'pending' | 'concerning' = 'all';
  creatorFilter: 'all' | number = 'all';
  selectedRatings: number[] = [];

  selectedThread: ManagerReviewThread | null = null;

  isLoading = true;
  errorMessage = '';
  successMessage = '';

  reportModalOpen = false;
  reportModalCreatorId: number | null = null;
  reportModalCategory = 'unprofessional_conduct';
  reportModalReason = '';

  ngOnInit(): void {
    const creatorIdParam = this.route.snapshot.queryParamMap.get('creatorId');
    const parsedCreatorId = Number(creatorIdParam);
    if (Number.isFinite(parsedCreatorId) && parsedCreatorId > 0) {
      this.creatorFilter = parsedCreatorId;
    }

    this.loadManagedDestinationLabel();

    this.loadReviews();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.creatorNameById.clear();
    this.pendingReportCreatorIds.clear();
    this.creatorObjectCounts.clear();
    this.successMessage = '';

    this.fetchManagerReviewThreads()
      .pipe(
        timeout(15000),
        catchError((firstError) =>
          timer(300).pipe(
            switchMap(() => this.fetchManagerReviewThreads()),
            timeout(15000),
            catchError(() => throwError(() => firstError)),
          ),
        ),
        finalize(() => {
          this.isLoading = false;
          this.triggerViewUpdate();
        }),
      )
      .subscribe({
        next: (threads) => {
          const previousId = this.selectedThread?.id ?? null;
          this.allThreads = threads;
          this.resolveMissingCreatorNames([
            ...new Set(threads.map((thread) => thread.creatorId).filter((id) => id > 0)),
          ]);
          this.applySelectionAfterLoad(previousId);
        },
        error: (error: { error?: { message?: string } }) => {
          this.allThreads = [];
          this.selectedThread = null;
          this.errorMessage = error?.error?.message ?? 'Failed to load reviews.';
          this.triggerViewUpdate();
        },
      });
  }

  get creatorOptions(): { id: number; name: string }[] {
    const map = new Map<number, string>();
    for (const thread of this.allThreads) {
      map.set(thread.creatorId, thread.creatorName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get filteredThreads(): ManagerReviewThread[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.allThreads.filter((thread) => {
      if (this.creatorFilter !== 'all' && thread.creatorId !== this.creatorFilter) {
        return false;
      }
      if (this.selectedRatings.length && !this.selectedRatings.includes(thread.rating)) {
        return false;
      }
      if (this.responseFilter === 'responded' && !thread.creatorResponse?.trim()) {
        return false;
      }
      if (this.responseFilter === 'pending' && thread.creatorResponse?.trim()) {
        return false;
      }
      if (this.responseFilter === 'concerning' && !this.isConcerning(thread)) {
        return false;
      }
      if (
        q &&
        !thread.touristName.toLowerCase().includes(q) &&
        !thread.objectName.toLowerCase().includes(q) &&
        !thread.creatorName.toLowerCase().includes(q) &&
        !thread.touristReview.toLowerCase().includes(q) &&
        !(thread.creatorResponse?.toLowerCase().includes(q) ?? false)
      ) {
        return false;
      }
      return true;
    });
  }

  get stats() {
    const concerning = this.allThreads.filter((t) => this.isConcerning(t)).length;
    const noResponse = this.allThreads.filter((t) => !t.creatorResponse?.trim()).length;
    const withReply = this.allThreads.filter((t) => this.hasCreatorReply(t)).length;
    return { concerning, noResponse, withReply, total: this.allThreads.length };
  }

  isConcerning(thread: ManagerReviewThread): boolean {
    return isConcerningCreatorReply({
      creatorResponse: thread.creatorResponse,
      touristRating: thread.rating,
    });
  }

  hasCreatorReply(thread: ManagerReviewThread): boolean {
    return !!thread.creatorResponse?.trim();
  }

  get reportableCreators(): ReportableCreatorOption[] {
    const map = new Map<number, ReportableCreatorOption>();
    for (const thread of this.allThreads) {
      if (!thread.creatorId) {
        continue;
      }
      const existing = map.get(thread.creatorId);
      const objectCount = this.creatorObjectCounts.get(thread.creatorId) ?? 0;
      const summary =
        objectCount > 0
          ? `${objectCount} object${objectCount === 1 ? '' : 's'} in your destinations`
          : 'Content in your destinations';
      map.set(thread.creatorId, {
        id: thread.creatorId,
        name: thread.creatorName,
        contentSummary: existing?.contentSummary ?? summary,
        hasPendingReport: this.pendingReportCreatorIds.has(thread.creatorId),
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  openReportModal(thread?: ManagerReviewThread | null): void {
    const target = thread ?? this.selectedThread;
    if (!target?.creatorId) {
      return;
    }

    const concerning = this.isConcerning(target);
    this.reportModalCreatorId = target.creatorId;
    this.reportModalCategory = concerning ? 'unprofessional_conduct' : 'other';
    this.reportModalReason = target.creatorResponse?.trim()
      ? buildReviewReportReason({
          reviewId: target.id,
          objectName: target.objectName,
          touristName: target.touristName,
          touristRating: target.rating,
          creatorName: target.creatorName,
          creatorResponse: target.creatorResponse!,
          category: this.reportModalCategory,
          autoDetected: concerning,
        })
      : '';
    this.reportModalOpen = true;
  }

  closeReportModal(): void {
    this.reportModalOpen = false;
  }

  onReportSubmitted(): void {
    if (this.reportModalCreatorId) {
      this.pendingReportCreatorIds.add(this.reportModalCreatorId);
    }
    this.successMessage = 'Creator report submitted successfully.';
    this.reportModalOpen = false;
    this.triggerViewUpdate();
  }

  hasPendingReportForCreator(creatorId: number): boolean {
    return this.pendingReportCreatorIds.has(creatorId);
  }

  isRatingSelected(rating: number): boolean {
    return this.selectedRatings.includes(rating);
  }

  toggleRating(rating: number): void {
    if (this.isRatingSelected(rating)) {
      this.selectedRatings = this.selectedRatings.filter((r) => r !== rating);
    } else {
      this.selectedRatings = [...this.selectedRatings, rating];
    }
  }

  selectAllRatings(): void {
    this.selectedRatings = [];
  }

  get isAllRatingsSelected(): boolean {
    return this.selectedRatings.length === 0;
  }

  onFilterChange(): void {
    if (
      this.selectedThread &&
      !this.filteredThreads.some((t) => t.id === this.selectedThread!.id)
    ) {
      this.selectedThread = this.filteredThreads[0] ?? null;
    }
    this.triggerViewUpdate();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.onFilterChange();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.responseFilter = 'all';
    this.creatorFilter = 'all';
    this.selectedRatings = [];
    this.onFilterChange();
  }

  selectThread(thread: ManagerReviewThread): void {
    this.selectedThread = thread;
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  ratingStars(rating: number): string {
    const clamped = Math.max(0, Math.min(5, rating));
    return '\u2605'.repeat(clamped) + '\u2606'.repeat(5 - clamped);
  }

  trackByThreadId(_: number, thread: ManagerReviewThread): number {
    return thread.id;
  }

  creatorInitials(fullName: string): string {
    return this.initials(fullName);
  }

  creatorScopeSummary(creatorId: number): string {
    const objectCount = this.creatorObjectCounts.get(creatorId) ?? 0;
    if (objectCount > 0) {
      return `${objectCount} object${objectCount === 1 ? '' : 's'} in your destinations`;
    }

    return 'Active in your destinations';
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
          this.triggerViewUpdate();
        },
        error: () => {
          this.managedDestination = 'your destinations';
        },
      });
  }

  private fetchManagerReviewThreads(): Observable<ManagerReviewThread[]> {
    const pageSize = 100;

    return this.loadCreatorNameHints().pipe(
      switchMap(() =>
        forkJoin({
          objects: this.getAllPagedItems((page) =>
            this.objectService.getForManager({
              page,
              pageSize,
              sortBy: 'name',
              sortOrder: 'asc',
            }),
          ),
          reviews: this.getAllPagedItems((page) =>
            this.reviewService.getAll({
              page,
              pageSize,
              sortBy: 'createdAt',
              sortOrder: 'desc',
            }),
          ),
          myReports: this.getAllPagedItems((page) =>
            this.managerReportsService.getMyReports({
              page,
              pageSize,
              sortBy: 'createdAt',
              sortOrder: 'desc',
            }),
          ),
        }),
      ),
      map(({ objects, reviews, myReports }) => {
        this.pendingReportCreatorIds.clear();
        for (const report of myReports) {
          if (report.status?.toLowerCase() === 'pending') {
            this.pendingReportCreatorIds.add(report.reportedUserId);
          }
        }

        this.creatorObjectCounts.clear();
        const objectContext = new Map<number, ObjectReviewContext>();
        for (const object of objects) {
          if (!object.createdByUserId) {
            continue;
          }
          // Pre-populate creator name from object data to avoid separate user API calls
          const knownName = object.createdByFullName?.trim();
          if (knownName && !this.creatorNameById.has(object.createdByUserId)) {
            this.creatorNameById.set(object.createdByUserId, knownName);
          }
          this.creatorObjectCounts.set(
            object.createdByUserId,
            (this.creatorObjectCounts.get(object.createdByUserId) ?? 0) + 1,
          );
          objectContext.set(object.id, {
            creatorId: object.createdByUserId,
            localityName: object.localityName?.trim() ?? '',
            destinationName: object.destinationName?.trim() ?? '',
          });
        }

        const managedObjectIds = new Set(objectContext.keys());
        const scopedReviews = reviews.filter((review) => managedObjectIds.has(review.objectId));

        return this.mapReviewsToThreads(scopedReviews, objectContext);
      }),
    );
  }

  private loadCreatorNameHints(): Observable<void> {
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
      dashboard: this.dashboardService.getOverview('1y').pipe(
        catchError(() => of(null)),
      ),
    }).pipe(
      map(({ deletionRequests, managerReports, dashboard }) => {
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

        if (dashboard) {
          for (const creator of dashboard.topCreators ?? []) {
            const name = creator.creatorName?.trim();
            if (name && creator.creatorId > 0) {
              this.creatorNameById.set(creator.creatorId, name);
            }
          }
          for (const item of dashboard.topContent ?? []) {
            const name = item.creatorName?.trim();
            if (name && item.creatorId > 0) {
              this.creatorNameById.set(item.creatorId, name);
            }
          }
        }
      }),
    );
  }

  private mapReviewsToThreads(
    reviews: ReviewDto[],
    objectContext: Map<number, ObjectReviewContext>,
  ): ManagerReviewThread[] {
    const threads = reviews.map((review) => {
      const context = objectContext.get(review.objectId);
      const creatorId = context?.creatorId ?? 0;
      const creatorName = this.creatorDisplayName(creatorId);

      return {
        id: review.id,
        touristName: review.userFullName?.trim() || 'Tourist',
        touristInitials: this.initials(review.userFullName),
        objectId: review.objectId,
        objectName: review.objectName?.trim() || `Object #${review.objectId}`,
        localityName:
          review.localityName?.trim() ||
          context?.localityName ||
          review.destinationName?.trim() ||
          context?.destinationName ||
          '—',
        destinationName:
          review.destinationName?.trim() || context?.destinationName || '—',
        creatorId,
        creatorName,
        rating: review.rating,
        touristReview: review.text?.trim() || '—',
        createdAt: review.createdAt,
        creatorResponse: review.creatorResponse,
        creatorResponseAt: review.creatorResponseAt,
      } satisfies ManagerReviewThread;
    });

    return threads.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
  }

  private creatorDisplayName(creatorId: number): string {
    if (!creatorId) {
      return 'Content creator';
    }

    const known = this.creatorNameById.get(creatorId)?.trim();
    if (known) {
      return known;
    }

    return 'Content creator';
  }

  private resolveMissingCreatorNames(creatorIds: number[]): void {
    const pending = creatorIds.filter((id) => !this.hasResolvedCreatorName(id));
    if (!pending.length) {
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
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe((results) => {
        let changed = false;

        for (const result of results) {
          if (!result.fullName) {
            continue;
          }

          this.creatorNameById.set(result.creatorId, result.fullName);
          changed = true;
        }

        if (!changed) {
          return;
        }

        this.applyCreatorNamesToThreads();
        this.triggerViewUpdate();
      });
  }

  private hasResolvedCreatorName(creatorId: number): boolean {
    const name = this.creatorNameById.get(creatorId)?.trim();
    if (!name) {
      return false;
    }

    return !/^content creator$/i.test(name) && name.trim().length > 0;
  }

  private applyCreatorNamesToThreads(): void {
    this.allThreads = this.allThreads.map((thread) => ({
      ...thread,
      creatorName: this.creatorDisplayName(thread.creatorId),
    }));

    if (this.selectedThread) {
      const updated = this.allThreads.find((thread) => thread.id === this.selectedThread!.id);
      this.selectedThread = updated ?? null;
    }
  }

  private initials(fullName?: string | null): string {
    const parts = (fullName ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
    }

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return '?';
  }

  private applySelectionAfterLoad(previousId: number | null): void {
    const match =
      previousId != null
        ? (this.filteredThreads.find((thread) => thread.id === previousId) ?? null)
        : null;

    this.selectedThread = match ?? this.filteredThreads[0] ?? null;
    this.triggerViewUpdate();
  }

  private getAllPagedItems<T>(
    fetchPage: (page: number) => Observable<{ items?: T[]; totalPages?: number }>,
  ): Observable<T[]> {
    return fetchPage(1).pipe(
      switchMap((firstPage) => {
        const firstItems = firstPage.items ?? [];
        const totalPages = Math.max(1, firstPage.totalPages ?? 1);

        if (totalPages === 1) {
          return of(firstItems);
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, index) =>
          fetchPage(index + 2),
        );

        return forkJoin(requests).pipe(
          map((pages) => [...firstItems, ...pages.flatMap((page) => page.items ?? [])]),
        );
      }),
    );
  }

  private triggerViewUpdate(): void {
    queueMicrotask(() => this.cdr.detectChanges());
  }
}
