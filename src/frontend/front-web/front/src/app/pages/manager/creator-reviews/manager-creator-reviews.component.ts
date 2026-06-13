import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
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
  detectConcerningReplyKind,
  detectConcerningTextKind,
  getConcerningReportCategory,
  isConcerningCreatorReply,
  isConcerningText,
} from '../shared/concerning-reply.util';
import {
  ManagerReportModalComponent,
  ReportableCreatorOption,
} from '../shared/manager-report-modal.component';
import { PaginatorComponent } from '../../../shared/components/paginator/paginator';
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
import { ObjectService } from '../../../services/object';
import { ReviewDto, ReviewService } from '../../../services/review';
import { AuthService } from '../../../services/auth.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../services/translation.service';

export interface ManagerReviewThread {
  id: number;
  touristId: number;
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
  imports: [CommonModule, FormsModule, RouterLink, ManagerReportModalComponent, PaginatorComponent, TranslatePipe],
  templateUrl: './manager-creator-reviews.component.html',
  styleUrls: [
    './manager-creator-reviews.component.css',
    '../../admin/shared/admin-page-title.css',
    '../shared/manager-list-page-header.css',
    '../shared/manager-list-page-responsive.css',
    '../shared/manager-page-stats-scroll.css',
    '../shared/manager-cc-page-parity.css',
  ],
})
export class ManagerCreatorReviewsComponent implements OnInit, OnDestroy {
  private readonly objectService = inject(ObjectService);
  private readonly reviewService = inject(ReviewService);
  private readonly authService = inject(AuthService);
  private readonly destinationService = inject(DestinationService);
  private readonly http = inject(HttpClient);
  private readonly managerReportsService = inject(ManagerReportsService);
  private readonly dashboardService = inject(ManagerDashboardService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  readonly translationService = inject(TranslationService);
  private readonly creatorNameById = new Map<number, string>();
  private readonly pendingReportCreatorIds = new Set<number>();
  private readonly creatorObjectCounts = new Map<number, number>();

  allThreads: ManagerReviewThread[] = [];
  managedDestination = '';

  searchTerm = '';
  responseFilter: 'all' | 'responded' | 'pending' | 'concerning' = 'all';
  creatorFilter: 'all' | number = 'all';
  touristFilter: 'all' | number = 'all';
  creatorFilterMenuOpen = false;
  touristFilterMenuOpen = false;
  responseFilterMenuOpen = false;
  readonly responseFilterOptions: Array<{
    value: 'all' | 'responded' | 'pending' | 'concerning';
    labelKey: string;
  }> = [
    { value: 'all', labelKey: 'manager.creatorReviews.filters.allResponses' },
    { value: 'responded', labelKey: 'manager.creatorReviews.filters.withReply' },
    { value: 'pending', labelKey: 'manager.creatorReviews.filters.pendingReply' },
    { value: 'concerning', labelKey: 'manager.creatorReviews.filters.concerningReplies' },
  ];
  selectedRatings: number[] = [];

  @ViewChild('creatorFilterRoot') private creatorFilterRoot?: ElementRef<HTMLElement>;
  @ViewChild('touristFilterRoot') private touristFilterRoot?: ElementRef<HTMLElement>;
  @ViewChild('responseFilterRoot') private responseFilterRoot?: ElementRef<HTMLElement>;

  selectedThread: ManagerReviewThread | null = null;

  queuePage = 1;
  queuePageSize = 5;
  readonly queuePageSizeOptions = [5, 10, 15, 20];

  isLoading = true;
  errorMessage = '';
  successMessage = '';

  reportModalOpen = false;
  reportModalCreatorId: number | null = null;
  reportModalCategory = 'unprofessional_conduct';
  reportModalReason = '';

  reportTouristModalOpen = false;
  reportModalTouristId: number | null = null;
  reportModalTouristCategory = 'other';
  reportModalTouristReason = '';

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
          this.errorMessage =
            error?.error?.message ??
            this.translationService.translate('manager.creatorReviews.error.load');
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

  get touristOptions(): { id: number; name: string }[] {
    const map = new Map<number, string>();
    for (const thread of this.allThreads) {
      if (thread.touristId) {
        map.set(thread.touristId, thread.touristName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get pagedThreads(): ManagerReviewThread[] {
    const start = (this.queuePage - 1) * this.queuePageSize;
    return this.filteredThreads.slice(start, start + this.queuePageSize);
  }

  get queueTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredThreads.length / this.queuePageSize));
  }

  get queuePageStart(): number {
    if (this.filteredThreads.length === 0) {
      return 0;
    }
    return (this.queuePage - 1) * this.queuePageSize + 1;
  }

  get queuePageEnd(): number {
    return Math.min(this.queuePage * this.queuePageSize, this.filteredThreads.length);
  }

  onQueueGoToPage(page: number): void {
    if (page >= 1 && page <= this.queueTotalPages) {
      this.queuePage = page;
      this.triggerViewUpdate();
    }
  }

  onQueuePageSizeChange(value: number | string): void {
    this.queuePageSize = Number(value);
    this.queuePage = 1;
    this.triggerViewUpdate();
  }

  get filteredThreads(): ManagerReviewThread[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.allThreads.filter((thread) => {
      if (this.creatorFilter !== 'all' && thread.creatorId !== this.creatorFilter) {
        return false;
      }
      if (this.touristFilter !== 'all' && thread.touristId !== this.touristFilter) {
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
    return this.isCreatorResponseConcerning(thread) || this.isTouristReviewConcerning(thread);
  }

  isCreatorResponseConcerning(thread: ManagerReviewThread): boolean {
    return isConcerningCreatorReply({
      creatorResponse: thread.creatorResponse,
      touristRating: thread.rating,
    });
  }

  isTouristReviewConcerning(thread: ManagerReviewThread): boolean {
    return isConcerningText(thread.touristReview);
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
          ? this.translationService.translate('manager.creatorReviews.creatorSummary', { count: objectCount })
          : this.translationService.translate('manager.creatorReviews.creatorSummaryFallback');
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

    const concerningKind = detectConcerningReplyKind({
      creatorResponse: target.creatorResponse,
      touristRating: target.rating,
    });
    this.reportModalCreatorId = target.creatorId;
    this.reportModalCategory = getConcerningReportCategory(concerningKind);
    this.reportModalReason = target.creatorResponse?.trim()
      ? buildReviewReportReason({
          reviewId: target.id,
          objectName: target.objectName,
          touristName: target.touristName,
          touristRating: target.rating,
          creatorName: target.creatorName,
          creatorResponse: target.creatorResponse!,
          category: this.reportModalCategory,
          autoDetected: concerningKind != null,
        }, {
          categoryPrefix: this.translationService.translate('manager.reportModal.reason.category'),
          autoDetected: this.translationService.translate('manager.reportModal.reason.autoDetected'),
          managerModeration: this.translationService.translate('manager.reportModal.reason.managerModeration'),
          reviewLabel: this.translationService.translate('manager.reportModal.reason.review'),
          touristLabel: this.translationService.translate('manager.reportModal.reason.tourist'),
          creatorLabel: this.translationService.translate('manager.reportModal.reason.creator'),
          replyLabel: this.translationService.translate('manager.reportModal.reason.reply'),
          categoryLabels: {
            inappropriate_content: this.translationService.translate('manager.reportModal.categories.inappropriate_content'),
            repeated_violations: this.translationService.translate('manager.reportModal.categories.repeated_violations'),
            unprofessional_conduct: this.translationService.translate('manager.reportModal.categories.unprofessional_conduct'),
            spam_abuse: this.translationService.translate('manager.reportModal.categories.spam_abuse'),
            other: this.translationService.translate('manager.reportModal.categories.other'),
          },
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
    this.successMessage = this.translationService.translate('manager.reportModal.successSubmitted');
    this.reportModalOpen = false;
    this.triggerViewUpdate();
  }

  hasPendingReportForCreator(creatorId: number): boolean {
    return this.pendingReportCreatorIds.has(creatorId);
  }

  get reportableTourists(): ReportableCreatorOption[] {
    const map = new Map<number, ReportableCreatorOption>();
    for (const thread of this.allThreads) {
      if (!thread.touristId) {
        continue;
      }
      map.set(thread.touristId, {
        id: thread.touristId,
        name: thread.touristName,
        contentSummary: this.translationService.translate('manager.creatorReviews.touristSummary', {
          rating: thread.rating,
          objectName: thread.objectName,
        }),
        hasPendingReport: this.pendingReportCreatorIds.has(thread.touristId),
      });
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  openTouristReportModal(thread?: ManagerReviewThread | null): void {
    const target = thread ?? this.selectedThread;
    if (!target?.touristId) {
      return;
    }

    const concerningKind = detectConcerningTextKind(target.touristReview);
    this.reportModalTouristId = target.touristId;
    this.reportModalTouristCategory = getConcerningReportCategory(concerningKind);
    this.reportModalTouristReason = target.touristReview?.trim()
      ? buildReviewReportReason({
          reviewId: target.id,
          objectName: target.objectName,
          touristName: target.touristName,
          touristRating: target.rating,
          creatorName: target.creatorName,
          creatorResponse: target.touristReview,
          category: this.reportModalTouristCategory,
          autoDetected: concerningKind != null,
        }, {
          categoryPrefix: this.translationService.translate('manager.reportModal.reason.category'),
          autoDetected: this.translationService.translate('manager.reportModal.reason.autoDetectedReview'),
          managerModeration: this.translationService.translate('manager.reportModal.reason.managerModeration'),
          reviewLabel: this.translationService.translate('manager.reportModal.reason.review'),
          touristLabel: this.translationService.translate('manager.reportModal.reason.tourist'),
          creatorLabel: this.translationService.translate('manager.reportModal.reason.creator'),
          replyLabel: this.translationService.translate('manager.reportModal.reason.reviewText'),
        })
      : '';
    this.reportTouristModalOpen = true;
  }

  closeTouristReportModal(): void {
    this.reportTouristModalOpen = false;
  }

  onTouristReportSubmitted(): void {
    if (this.reportModalTouristId) {
      this.pendingReportCreatorIds.add(this.reportModalTouristId);
    }
    this.successMessage = this.translationService.translate('manager.reportModal.successSubmitted');
    this.reportTouristModalOpen = false;
    this.triggerViewUpdate();
  }

  hasPendingReportForTourist(touristId: number): boolean {
    return this.pendingReportCreatorIds.has(touristId);
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

  get creatorFilterLabel(): string {
    if (this.creatorFilter === 'all') {
      return this.translationService.translate('manager.creatorReviews.filters.allCreators');
    }

    return (
      this.creatorOptions.find((creator) => creator.id === this.creatorFilter)?.name
      ?? this.translationService.translate('manager.creatorReviews.filters.allCreators')
    );
  }

  get touristFilterLabel(): string {
    if (this.touristFilter === 'all') {
      return this.translationService.translate('manager.creatorReviews.filters.allTourists');
    }

    return (
      this.touristOptions.find((tourist) => tourist.id === this.touristFilter)?.name
      ?? this.translationService.translate('manager.creatorReviews.filters.allTourists')
    );
  }

  get responseFilterLabelKey(): string {
    return (
      this.responseFilterOptions.find((option) => option.value === this.responseFilter)?.labelKey
      ?? 'manager.creatorReviews.filters.allResponses'
    );
  }

  toggleCreatorFilterMenu(event: Event): void {
    event.stopPropagation();
    this.creatorFilterMenuOpen = !this.creatorFilterMenuOpen;
    if (this.creatorFilterMenuOpen) {
      this.touristFilterMenuOpen = false;
      this.responseFilterMenuOpen = false;
    }
  }

  selectCreatorFilter(value: 'all' | number, event: Event): void {
    event.stopPropagation();
    this.creatorFilter = value;
    this.creatorFilterMenuOpen = false;
    this.onFilterChange();
  }

  toggleTouristFilterMenu(event: Event): void {
    event.stopPropagation();
    this.touristFilterMenuOpen = !this.touristFilterMenuOpen;
    if (this.touristFilterMenuOpen) {
      this.creatorFilterMenuOpen = false;
      this.responseFilterMenuOpen = false;
    }
  }

  selectTouristFilter(value: 'all' | number, event: Event): void {
    event.stopPropagation();
    this.touristFilter = value;
    this.touristFilterMenuOpen = false;
    this.onFilterChange();
  }

  toggleResponseFilterMenu(event: Event): void {
    event.stopPropagation();
    this.responseFilterMenuOpen = !this.responseFilterMenuOpen;
    if (this.responseFilterMenuOpen) {
      this.creatorFilterMenuOpen = false;
      this.touristFilterMenuOpen = false;
    }
  }

  selectResponseFilter(
    value: 'all' | 'responded' | 'pending' | 'concerning',
    event: Event,
  ): void {
    event.stopPropagation();
    this.responseFilter = value;
    this.responseFilterMenuOpen = false;
    this.onFilterChange();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;

    if (
      this.creatorFilterMenuOpen
      && !this.creatorFilterRoot?.nativeElement.contains(target)
    ) {
      this.creatorFilterMenuOpen = false;
    }

    if (
      this.touristFilterMenuOpen
      && !this.touristFilterRoot?.nativeElement.contains(target)
    ) {
      this.touristFilterMenuOpen = false;
    }

    if (
      this.responseFilterMenuOpen
      && !this.responseFilterRoot?.nativeElement.contains(target)
    ) {
      this.responseFilterMenuOpen = false;
    }
  }

  onFilterChange(): void {
    if (
      this.selectedThread &&
      !this.filteredThreads.some((t) => t.id === this.selectedThread!.id)
    ) {
      this.queuePage = 1;
      this.selectedThread = this.filteredThreads[0] ?? null;
    } else if (this.selectedThread) {
      const idx = this.filteredThreads.findIndex((t) => t.id === this.selectedThread!.id);
      if (idx >= 0) {
        this.queuePage = Math.floor(idx / this.queuePageSize) + 1;
      }
    } else {
      this.queuePage = 1;
    }
    this.triggerViewUpdate();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.onFilterChange();
  }

  resetFilters(): void {
    this.creatorFilterMenuOpen = false;
    this.touristFilterMenuOpen = false;
    this.responseFilterMenuOpen = false;
    this.searchTerm = '';
    this.responseFilter = 'all';
    this.creatorFilter = 'all';
    this.touristFilter = 'all';
    this.selectedRatings = [];
    this.onFilterChange();
  }

  selectThread(thread: ManagerReviewThread): void {
    this.selectedThread = thread;
  }

  formatDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return this.translationService.translate('manager.creatorReviews.fallback.notAvailable');
    }
    return date.toLocaleString(this.translationService.currentLocale(), {
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

  filledStars(rating: number): string {
    return '\u2605'.repeat(Math.max(0, Math.min(5, rating)));
  }

  emptyStars(rating: number): string {
    return '\u2606'.repeat(5 - Math.max(0, Math.min(5, rating)));
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
      return this.translationService.translate('manager.creatorReviews.creatorSummary', {
        count: objectCount,
      });
    }

    return this.translationService.translate('manager.creatorReviews.creatorActiveFallback');
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
            : this.translationService.translate(
                'manager.creatorReviews.managedDestinationFallback',
              );
          this.triggerViewUpdate();
        },
        error: () => {
          this.managedDestination = this.translationService.translate(
            'manager.creatorReviews.managedDestinationFallback',
          );
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
      switchMap(({ objects, myReports }) => {
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

        const managedObjectIds = [...objectContext.keys()];
        if (!managedObjectIds.length) {
          return of(this.mapReviewsToThreads([], objectContext));
        }

        return this.fetchReviewsForManagedObjects(managedObjectIds).pipe(
          map((reviews) => this.mapReviewsToThreads(reviews, objectContext)),
        );
      }),
    );
  }

  /** Loads reviews only for objects in the manager's scope using a single batched endpoint. */
  private fetchReviewsForManagedObjects(objectIds: number[]): Observable<ReviewDto[]> {
    return this.reviewService.getForManagerObjects(objectIds).pipe(
      catchError(() => of([] as ReviewDto[])),
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
        touristId: review.userId,
        touristName:
          review.userFullName?.trim() ||
          this.translationService.translate('manager.creatorReviews.fallback.tourist'),
        touristInitials: this.initials(review.userFullName),
        objectId: review.objectId,
        objectName:
          review.objectName?.trim() ||
          this.translationService.translate('manager.creatorReviews.fallback.object', {
            id: review.objectId,
          }),
        localityName:
          review.localityName?.trim() ||
          context?.localityName ||
          review.destinationName?.trim() ||
          context?.destinationName ||
          this.translationService.translate('manager.creatorReviews.fallback.notAvailable'),
        destinationName:
          review.destinationName?.trim() ||
          context?.destinationName ||
          this.translationService.translate('manager.creatorReviews.fallback.notAvailable'),
        creatorId,
        creatorName,
        rating: review.rating,
        touristReview:
          review.text?.trim() ||
          this.translationService.translate('manager.creatorReviews.fallback.notAvailable'),
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
      return this.translationService.translate('manager.creatorReviews.fallback.contentCreator');
    }

    const known = this.creatorNameById.get(creatorId)?.trim();
    if (known) {
      return known;
    }

    return this.translationService.translate('manager.creatorReviews.fallback.contentCreator');
  }

  private resolveMissingCreatorNames(creatorIds: number[]): void {
    const pending = creatorIds.filter((id) => !this.hasResolvedCreatorName(id));
    if (!pending.length) {
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
        takeUntil(this.destroy$),
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

    const fallback = this.translationService.translate(
      'manager.creatorReviews.fallback.contentCreator',
    );
    return !new RegExp(`^${fallback}$`, 'i').test(name) && name.trim().length > 0;
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
