import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  Subject,
  Observable,
  catchError,
  debounceTime,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  takeUntil,
  distinctUntilChanged,
  throwError,
  timer,
  timeout
} from 'rxjs';
import { ObjectDto, ObjectImageDto, ObjectService } from '../../../services/object';
import { ReviewDto, ReviewQueryParams, ReviewService } from '../../../services/review';

@Component({
  selector: 'app-content-creator-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css', '../../admin/shared/admin-page-title.css']
})
export class ContentCreatorReviewsComponent implements OnInit, OnDestroy {
  private readonly reviewService = inject(ReviewService);
  private readonly objectService = inject(ObjectService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  allReviews: ReviewDto[] = [];
  filteredReviews: ReviewDto[] = [];
  creatorObjects: ObjectDto[] = [];
  objectFilterId: number | null = null;
  selectedReview: ReviewDto | null = null;
  selectedObject: ObjectDto | null = null;
  selectedObjectImages: ObjectImageDto[] = [];

  isLoading = true;
  isSubmitting = false;
  isLoadingImages = false;
  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  responseFilter: 'all' | 'responded' | 'pending' = 'all';
  selectedRatings: number[] = [];
  sortOrder: 'desc' | 'asc' = 'desc';

  queuePage = 1;
  queuePageSize = 8;
  readonly queuePageSizeOptions = [5, 8, 10, 15];
  totalFilteredReviews = 0;
  totalReviewPages = 1;

  responseText = '';
  private creatorObjectsLoaded = false;
  private readonly searchInput$ = new Subject<string>();

  ngOnInit(): void {
    this.objectFilterId = this.parseObjectId(this.route.snapshot.queryParamMap.get('objectId'));

    this.searchInput$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.queuePage = 1;
        this.loadReviews();
      });

    this.loadReviews();

    this.route.queryParamMap
      .pipe(
        map((params) => this.parseObjectId(params.get('objectId'))),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((objectId) => {
        if (objectId === this.objectFilterId) {
          return;
        }

        this.objectFilterId = objectId;
        this.queuePage = 1;
        this.loadReviews();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReviews(keepSuccessMessage = false): void {
    this.isLoading = true;
    this.errorMessage = '';
    if (!keepSuccessMessage) {
      this.successMessage = '';
    }

    this.fetchCreatorObjectReviews()
      .pipe(
        timeout(12000),
        catchError((firstError) => {
          // Auto-retry once to recover from transient auth-refresh stalls.
          return timer(300).pipe(
            switchMap(() => this.fetchCreatorObjectReviews()),
            timeout(12000),
            catchError(() => throwError(() => firstError))
          );
        }),
        finalize(() => {
          this.isLoading = false;
          this.triggerViewUpdate();
        })
      )
      .subscribe({
        next: (result) => {
          const previousSelectedId = this.selectedReview?.id ?? null;
          const reviews = this.dedupeReviewsById(result.items ?? []);
          const resolvedTotalPages = Math.max(1, result.totalPages || 1);

          if (result.totalCount > 0 && this.queuePage > resolvedTotalPages) {
            this.queuePage = resolvedTotalPages;
            this.loadReviews(keepSuccessMessage);
            return;
          }

          this.allReviews = [...reviews];
          this.filteredReviews = reviews;
          this.totalFilteredReviews = result.totalCount ?? reviews.length;
          this.totalReviewPages = resolvedTotalPages;

          if (reviews.length === 0) {
            this.selectReview(null);
            this.triggerViewUpdate();
            return;
          }

          const match = previousSelectedId != null
            ? reviews.find((review) => review.id === previousSelectedId) ?? null
            : null;

          this.selectReview(match ?? reviews[0]);
          this.triggerViewUpdate();
        },
        error: (error: any) => {
          this.allReviews = [];
          this.filteredReviews = [];
          this.totalFilteredReviews = 0;
          this.totalReviewPages = 1;
          this.selectReview(null);
          this.errorMessage = error?.error?.message ?? 'Failed to load reviews.';
          this.triggerViewUpdate();
        }
      });
  }

  onFilterChange(): void {
    this.queuePage = 1;
    this.loadReviews();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchInput$.next(value.trim());
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.objectFilterId = null;
    this.queuePage = 1;
    this.selectedRatings = [];
    this.responseFilter = 'all';
    this.sortOrder = 'desc';
    this.syncObjectFilterQueryParam();
    this.loadReviews();
  }

  onObjectFilterChange(value: number | string | null): void {
    if (value == null || value === '') {
      this.objectFilterId = null;
    } else {
      const parsed = Number(value);
      this.objectFilterId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    this.queuePage = 1;
    this.syncObjectFilterQueryParam();
    this.loadReviews();
  }

  onQueuePreviousPage(): void {
    if (this.queuePage <= 1) {
      return;
    }

    this.queuePage--;
    this.loadReviews(true);
  }

  onQueueNextPage(): void {
    if (this.queuePage >= this.queueTotalPages) {
      return;
    }

    this.queuePage++;
    this.loadReviews(true);
  }

  onQueuePageSizeChange(value: number | string): void {
    this.queuePageSize = Number(value);
    this.queuePage = 1;
    this.loadReviews(true);
  }

  selectAllFilters(): void {
    this.selectedRatings = [];
    this.responseFilter = 'all';
    this.sortOrder = 'desc';
    this.queuePage = 1;
    this.loadReviews();
  }

  selectAllRatings(): void {
    this.selectedRatings = [];
    this.onFilterChange();
  }

  get isAllRatingsSelected(): boolean {
    return this.selectedRatings.length === 0;
  }

  get emptyQueueMessage(): string {
    if (this.objectFilterId != null) {
      const name = this.creatorObjects.find((object) => object.id === this.objectFilterId)?.name?.trim();
      return name ? `No reviews found for ${name}.` : 'No reviews found for this object.';
    }

    return 'No reviews found for your objects.';
  }

  get selectedObjectFilterLabel(): string {
    if (this.objectFilterId == null) {
      return 'All objects';
    }

    return this.creatorObjects.find((object) => object.id === this.objectFilterId)?.name?.trim()
      ?? 'Selected object';
  }

  toggleRating(rating: number): void {
    if (this.selectedRatings.includes(rating)) {
      this.selectedRatings = this.selectedRatings.filter((item) => item !== rating);
    } else {
      this.selectedRatings = [...this.selectedRatings, rating].sort((a, b) => a - b);
    }

    this.onFilterChange();
  }

  isRatingSelected(rating: number): boolean {
    return this.selectedRatings.includes(rating);
  }

  selectReview(review: ReviewDto | null): void {
    this.selectedReview = review;
    this.selectedObject = null;
    this.selectedObjectImages = [];
    this.successMessage = '';
    this.errorMessage = '';

    if (!review) {
      this.responseText = '';
      return;
    }

    this.responseText = review.creatorResponse?.trim() ?? '';
    this.loadSelectedObjectDetails(review.objectId);
  }

  saveDraft(): void {
    if (!this.selectedReview) {
      return;
    }

    const key = this.getDraftKey(this.selectedReview.id);
    localStorage.setItem(key, this.responseText);
    this.successMessage = 'Draft saved locally.';
    this.errorMessage = '';
  }

  restoreDraft(): void {
    if (!this.selectedReview) {
      return;
    }

    const draft = localStorage.getItem(this.getDraftKey(this.selectedReview.id));
    if (draft != null) {
      this.responseText = draft;
    }
  }

  sendResponse(): void {
    if (!this.selectedReview || this.isSubmitting) {
      return;
    }

    const content = this.responseText.trim();
    if (!content) {
      this.errorMessage = 'Response cannot be empty.';
      this.successMessage = '';
      return;
    }

    const reviewId = this.selectedReview.id;
    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const action$ = this.selectedReview.creatorResponse
      ? this.reviewService.updateResponse(reviewId, { creatorResponse: content })
      : this.reviewService.respond(reviewId, { creatorResponse: content });

    action$
      .pipe(
        switchMap((updated) =>
          this.reviewService.getById(updated.id).pipe(
            catchError(() => of(updated))
          )
        ),
        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: (fresh) => {
          this.updateReviewInCollections(fresh);
          localStorage.removeItem(this.getDraftKey(fresh.id));
          this.successMessage = 'Response sent successfully.';
          this.loadReviews(true);
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? 'Failed to send response.';
        }
      });
  }

  deleteResponse(): void {
    if (!this.selectedReview || this.isSubmitting || !this.selectedReview.creatorResponse) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.reviewService
      .deleteResponse(this.selectedReview.id)
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: (updated) => {
          this.updateReviewInCollections(updated);
          this.responseText = '';
          this.successMessage = 'Response deleted successfully.';
          this.loadReviews(true);
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? 'Failed to delete response.';
        }
      });
  }

  get queueCountLabel(): string {
    return `${this.totalFilteredReviews} review${this.totalFilteredReviews === 1 ? '' : 's'}`;
  }

  get queueTotalPages(): number {
    return this.totalReviewPages;
  }

  get pagedQueueReviews(): ReviewDto[] {
    return this.filteredReviews;
  }

  get queuePageStart(): number {
    if (this.totalFilteredReviews === 0) {
      return 0;
    }

    return (this.queuePage - 1) * this.queuePageSize + 1;
  }

  get queuePageEnd(): number {
    return Math.min(this.queuePage * this.queuePageSize, this.totalFilteredReviews);
  }

  get selectedReviewHasResponse(): boolean {
    return !!this.selectedReview?.creatorResponse?.trim();
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '—';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  ratingStars(rating: number): string {
    return '★'.repeat(Math.max(0, Math.min(5, rating))) + '☆'.repeat(Math.max(0, 5 - rating));
  }

  private loadSelectedObjectDetails(objectId: number): void {
    this.objectService.getById(objectId).subscribe({
      next: (objectDetails) => {
        this.selectedObject = objectDetails;
        this.triggerViewUpdate();
      },
      error: () => {
        this.selectedObject = null;
        this.triggerViewUpdate();
      }
    });

    this.isLoadingImages = true;
    this.objectService.getImages(objectId)
      .pipe(finalize(() => {
        this.isLoadingImages = false;
        this.triggerViewUpdate();
      }))
      .subscribe({
        next: (images) => {
          this.selectedObjectImages = this.dedupeImagesById(images ?? []);
          this.triggerViewUpdate();
        },
        error: () => {
          this.selectedObjectImages = [];
          this.triggerViewUpdate();
        }
      });
  }

  private getMyObjects(): Observable<ObjectDto[]> {
    const pageSize = 200;

    return this.getAllPagedItems((page) => (
      this.objectService.getMy(
        { page, pageSize, sortBy: 'name', sortOrder: 'asc' },
        { bypassRegion: true }
      )
    ));
  }

  private getAllPagedItems<T>(
    fetchPage: (page: number) => Observable<{ items?: T[]; totalPages?: number }>
  ): Observable<T[]> {
    return fetchPage(1).pipe(
      switchMap((firstPage) => {
        const firstItems = firstPage.items ?? [];
        const totalPages = Math.max(1, firstPage.totalPages ?? 1);

        if (totalPages === 1) {
          return of(firstItems);
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2));

        return forkJoin(requests).pipe(
          map((pages) => [
            ...firstItems,
            ...pages.flatMap((page) => page.items ?? [])
          ])
        );
      }),
    );
  }

  private updateReviewInCollections(updated: ReviewDto): void {
    this.allReviews = this.dedupeReviewsById(
      this.allReviews.map((review) => review.id === updated.id ? updated : review)
    );
    this.filteredReviews = this.dedupeReviewsById(
      this.filteredReviews.map((review) => review.id === updated.id ? updated : review)
    );
    this.selectedReview = this.filteredReviews.find((review) => review.id === updated.id) ?? null;
    if (this.selectedReview) {
      this.responseText = this.selectedReview.creatorResponse?.trim() ?? this.responseText;
    }
  }

  private getDraftKey(reviewId: number): string {
    return `cc-review-draft-${reviewId}`;
  }

  private fetchCreatorObjectReviews(): Observable<{ items: ReviewDto[]; totalCount: number; totalPages: number }> {
    return this.ensureCreatorObjectsLoaded().pipe(
      switchMap((objects: ObjectDto[]) => {
        if (objects.length === 0) {
          return of({ items: [] as ReviewDto[], totalCount: 0, totalPages: 1 });
        }

        const objectNames = new Map(objects.map((object) => [object.id, object.name] as const));

        return this.reviewService.getForCreator(
          this.buildCreatorReviewQuery(),
          { bypassRegion: true }
        ).pipe(
          map((result) => ({
            items: (result.items ?? []).map((review) => ({
              ...review,
              objectName: review.objectName?.trim()
                ? review.objectName
                : (objectNames.get(review.objectId) ?? `Object #${review.objectId}`)
            })),
            totalCount: result.totalCount ?? 0,
            totalPages: result.totalPages ?? 1
          }))
        );
      })
    );
  }

  private ensureCreatorObjectsLoaded(): Observable<ObjectDto[]> {
    if (this.creatorObjectsLoaded) {
      return of(this.creatorObjects);
    }

    return this.getMyObjects().pipe(
      map((objects: ObjectDto[]) => {
        this.creatorObjects = this.sortObjectsByName(objects);
        this.creatorObjectsLoaded = true;

        if (
          this.objectFilterId != null
          && !this.creatorObjects.some((object) => object.id === this.objectFilterId)
        ) {
          this.objectFilterId = null;
          this.syncObjectFilterQueryParam();
        }

        return this.creatorObjects;
      })
    );
  }

  private buildCreatorReviewQuery(): ReviewQueryParams {
    return {
      page: this.queuePage,
      pageSize: this.queuePageSize,
      search: this.searchTerm.trim() || undefined,
      objectId: this.objectFilterId ?? undefined,
      ratings: this.selectedRatings.length > 0 ? this.selectedRatings.join(',') : undefined,
      hasResponse: this.responseFilter === 'all'
        ? undefined
        : this.responseFilter === 'responded',
      sortBy: 'createdAt',
      sortOrder: this.sortOrder,
    };
  }

  private dedupeReviewsById(reviews: ReviewDto[]): ReviewDto[] {
    const seen = new Set<number>();
    return reviews.filter((review) => {
      if (seen.has(review.id)) {
        return false;
      }

      seen.add(review.id);
      return true;
    });
  }

  private dedupeImagesById(images: ObjectImageDto[]): ObjectImageDto[] {
    const seen = new Set<string>();
    return images.filter((image) => {
      const key = image.id != null ? `id:${image.id}` : `url:${image.url}`;
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private triggerViewUpdate(): void {
    queueMicrotask(() => {
      this.cdr.detectChanges();
    });
  }

  private parseObjectId(value: string | null): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  private sortObjectsByName(objects: ObjectDto[]): ObjectDto[] {
    return [...objects].sort((left, right) =>
      (left.name ?? '').localeCompare(right.name ?? '', undefined, { sensitivity: 'base' })
    );
  }

  private syncObjectFilterQueryParam(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { objectId: this.objectFilterId ?? null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
