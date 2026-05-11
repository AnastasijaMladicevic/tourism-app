import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  Subject,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  forkJoin,
  map,
  of,
  switchMap,
  takeUntil,
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
  styleUrls: ['./reviews.component.css']
})
export class ContentCreatorReviewsComponent implements OnInit, OnDestroy {
  private readonly reviewService = inject(ReviewService);
  private readonly objectService = inject(ObjectService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private readonly searchInput$ = new Subject<string>();

  allReviews: ReviewDto[] = [];
  filteredReviews: ReviewDto[] = [];
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

  responseText = '';
  private sourceReviews: ReviewDto[] = [];
  private selectedObjectIdFilter: number | null = null;

  ngOnInit(): void {
    const initialObjectId = this.parseObjectId(this.route.snapshot.queryParamMap.get('objectId'));
    this.selectedObjectIdFilter = initialObjectId;

    this.searchInput$
      .pipe(
        map((value) => value.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.applyCurrentFilters());

    this.loadReviews();

    this.route.queryParamMap
      .pipe(
        map((params) => this.parseObjectId(params.get('objectId'))),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((objectId) => {
        if (objectId === this.selectedObjectIdFilter) {
          return;
        }

        this.selectedObjectIdFilter = objectId;
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
        next: (reviews) => {
          const previousSelectedId = this.selectedReview?.id ?? null;
          this.sourceReviews = this.dedupeReviewsById(reviews);
          this.applyCurrentFilters(previousSelectedId);
        },
        error: (error: any) => {
          this.sourceReviews = [];
          this.allReviews = [];
          this.filteredReviews = [];
          this.selectReview(null);
          this.errorMessage = error?.error?.message ?? 'Failed to load reviews.';
          this.triggerViewUpdate();
        }
      });
  }

  onFilterChange(): void {
    this.applyCurrentFilters();
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.searchInput$.next(value);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectAllFilters();
  }

  selectAllFilters(): void {
    this.selectedRatings = [];
    this.responseFilter = 'all';
    this.sortOrder = 'desc';
    this.applyCurrentFilters();
  }

  get isAllFiltersSelected(): boolean {
    return this.selectedRatings.length === 0 && this.responseFilter === 'all';
  }

  toggleRating(rating: number): void {
    if (this.selectedRatings.includes(rating)) {
      this.selectedRatings = this.selectedRatings.filter((item) => item !== rating);
    } else {
      this.selectedRatings = [...this.selectedRatings, rating].sort((a, b) => a - b);
    }

    this.applyCurrentFilters();
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
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? 'Failed to delete response.';
        }
      });
  }

  get queueCountLabel(): string {
    return `${this.filteredReviews.length} review${this.filteredReviews.length === 1 ? '' : 's'}`;
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

  private applyRatingFilter(reviews: ReviewDto[]): ReviewDto[] {
    if (this.selectedRatings.length === 0) {
      return reviews;
    }

    const allowedRatings = new Set(this.selectedRatings);
    return reviews.filter((review) => allowedRatings.has(review.rating));
  }

  private fetchCreatorObjectReviews(): Observable<ReviewDto[]> {
    return this.getMyObjects().pipe(
      switchMap((objects: ObjectDto[]) => {
        if (objects.length === 0) {
          return of([] as ReviewDto[]);
        }

        const objectIds = new Set(objects.map((object) => object.id));
        const objectNames = new Map(objects.map((object) => [object.id, object.name] as const));

        return this.getAllPagedItems((page) => (
          this.reviewService.getAll(
            { page, pageSize: 200, sortBy: 'createdAt', sortOrder: 'desc' },
            { bypassRegion: true }
          )
        )).pipe(
          map((reviews: ReviewDto[]) => reviews
            .filter((review: ReviewDto) => objectIds.has(review.objectId))
            .map((review: ReviewDto) => ({
              ...review,
              objectName: review.objectName?.trim()
                ? review.objectName
                : (objectNames.get(review.objectId) ?? `Object #${review.objectId}`)
            }))),
          map((reviews: ReviewDto[]) => this.dedupeReviewsById(reviews))
        );
      })
    );
  }

  private applyCurrentFilters(previousSelectedId: number | null = this.selectedReview?.id ?? null): void {
    const normalizedSearch = this.searchTerm.trim().toLowerCase();

    let reviews = [...this.sourceReviews];

    if (this.selectedObjectIdFilter != null) {
      reviews = reviews.filter((review) => review.objectId === this.selectedObjectIdFilter);
    }

    if (this.responseFilter === 'responded') {
      reviews = reviews.filter((review) => !!review.creatorResponse?.trim());
    } else if (this.responseFilter === 'pending') {
      reviews = reviews.filter((review) => !review.creatorResponse?.trim());
    }

    if (normalizedSearch) {
      reviews = reviews.filter((review) => this.matchesSearch(review, normalizedSearch));
    }

    reviews = this.applyRatingFilter(reviews);
    reviews = this.sortReviews(reviews);

    this.allReviews = [...this.sourceReviews];
    this.filteredReviews = reviews;

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
  }

  private matchesSearch(review: ReviewDto, normalizedSearch: string): boolean {
    return [
      review.userFullName,
      review.objectName,
      review.text,
      review.creatorResponse ?? ''
    ]
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  }

  private sortReviews(reviews: ReviewDto[]): ReviewDto[] {
    return [...reviews].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      return this.sortOrder === 'asc' ? leftTime - rightTime : rightTime - leftTime;
    });
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
}
