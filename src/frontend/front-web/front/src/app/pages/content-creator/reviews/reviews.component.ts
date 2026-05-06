import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { ActivitiesService } from '../../../services/activities';
import { EventService } from '../../../services/event.service';

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
  private readonly activitiesService = inject(ActivitiesService);
  private readonly eventService = inject(EventService);
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
  ratingFilter: 'all' | 1 | 2 | 3 | 4 | 5 = 'all';
  sortOrder: 'desc' | 'asc' = 'desc';

  responseText = '';

  ngOnInit(): void {
    this.searchInput$
      .pipe(
        map((value) => value.trim()),
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadReviews());

    this.loadReviews();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadReviews(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.loadReviewsRequest()
      .pipe(
        timeout(12000),
        catchError((firstError) => {
          // Auto-retry once to recover from transient auth-refresh stalls.
          return timer(300).pipe(
            switchMap(() => this.loadReviewsRequest()),
            timeout(12000),
            catchError(() => throwError(() => firstError))
          );
        }),
        switchMap((objectIds) => {
          if (objectIds.length === 0) {
            return of([] as ReviewDto[]);
          }

          return this.fetchAllReviews().pipe(
            map((reviews) => reviews.filter((review) => objectIds.includes(review.objectId)))
          );
        }),
        finalize(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (reviews) => {
          this.allReviews = reviews;
          this.filteredReviews = reviews;
          if (!this.selectedReview || !reviews.some((item) => item.id === this.selectedReview?.id)) {
            this.selectReview(reviews[0] ?? null);
          }
          this.cdr.detectChanges();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? 'Failed to load reviews.';
          this.cdr.detectChanges();
        }
      });
  }

  private loadReviewsRequest() {
    return this.getMyContentIds();
  }

  onFilterChange(): void {
    this.loadReviews();
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
    this.ratingFilter = 'all';
    this.responseFilter = 'all';
    this.sortOrder = 'desc';
    this.loadReviews();
  }

  get isAllFiltersSelected(): boolean {
    return this.ratingFilter === 'all' && this.responseFilter === 'all';
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

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const action$ = this.selectedReview.creatorResponse
      ? this.reviewService.updateResponse(this.selectedReview.id, { creatorResponse: content })
      : this.reviewService.respond(this.selectedReview.id, { creatorResponse: content });

    action$
      .pipe(finalize(() => {
        this.isSubmitting = false;
      }))
      .subscribe({
        next: (updated) => {
          this.updateReviewInCollections(updated);
          localStorage.removeItem(this.getDraftKey(updated.id));
          this.successMessage = 'Response sent successfully.';
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
        this.cdr.detectChanges();
      },
      error: () => {
        this.selectedObject = null;
        this.cdr.detectChanges();
      }
    });

    this.isLoadingImages = true;
    this.cdr.detectChanges();
    this.objectService.getImages(objectId)
      .pipe(finalize(() => {
        this.isLoadingImages = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (images) => {
          this.selectedObjectImages = images ?? [];
          this.cdr.detectChanges();
        },
        error: () => {
          this.selectedObjectImages = [];
          this.cdr.detectChanges();
        }
      });
  }

  private getMyContentIds() {
    const pageSize = 200;

    const objectIds$ = this.getAllPagedIds((page) => (
      this.objectService.getMy(
        { page, pageSize, sortBy: 'name', sortOrder: 'asc' },
        { bypassRegion: true }
      )
    ));

    const activityIds$ = this.getAllPagedIds((page) => (
      this.activitiesService.getMyActivities(
        { page, pageSize, sortBy: 'name', sortOrder: 'asc' }
      )
    ));

    const eventIds$ = this.getAllPagedIds((page) => (
      this.eventService.getMy(
        { page, pageSize, sortBy: 'name', sortOrder: 'asc' }
      )
    ));

    return forkJoin([objectIds$, activityIds$, eventIds$]).pipe(
      map(([objectIds, activityIds, eventIds]) => ([
        ...objectIds,
        ...activityIds,
        ...eventIds
      ])),
      map((ids) => Array.from(new Set(ids))),
      map((ids) => ids.filter((id) => Number.isFinite(id) && id > 0)),
    );
  }

  private getAllPagedIds<T extends { id: number }>(
    fetchPage: (page: number) => Observable<{ items?: T[]; totalPages?: number }>
  ) {
    return fetchPage(1).pipe(
      switchMap((firstPage) => {
        const firstItems = firstPage.items ?? [];
        const totalPages = Math.max(1, firstPage.totalPages ?? 1);

        if (totalPages === 1) {
          return of(firstItems.map((item) => item.id));
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, index) => fetchPage(index + 2));

        return forkJoin(requests).pipe(
          map((pages) => [
            ...firstItems,
            ...pages.flatMap((page) => page.items ?? [])
          ]),
          map((items) => items.map((item) => item.id))
        );
      }),
    );
  }

  private updateReviewInCollections(updated: ReviewDto): void {
    this.allReviews = this.allReviews.map((review) => review.id === updated.id ? updated : review);
    this.filteredReviews = this.filteredReviews.map((review) => review.id === updated.id ? updated : review);
    this.selectedReview = this.filteredReviews.find((review) => review.id === updated.id) ?? null;
    if (this.selectedReview) {
      this.responseText = this.selectedReview.creatorResponse?.trim() ?? this.responseText;
    }
  }

  private getDraftKey(reviewId: number): string {
    return `cc-review-draft-${reviewId}`;
  }

  private getReviewQuery(): ReviewQueryParams {
    const query: ReviewQueryParams = {
      page: 1,
      pageSize: 100,
      sortBy: 'createdAt',
      sortOrder: this.sortOrder
    };

    const trimmedSearch = this.searchTerm.trim();
    if (trimmedSearch) {
      query.search = trimmedSearch;
    }

    if (this.responseFilter === 'responded') {
      query.hasResponse = true;
    } else if (this.responseFilter === 'pending') {
      query.hasResponse = false;
    }

    if (this.ratingFilter !== 'all') {
      query.minRating = this.ratingFilter;
      query.maxRating = this.ratingFilter;
    }

    return query;
  }

  private fetchAllReviews() {
    const query = this.getReviewQuery();
    const pageSize = query.pageSize ?? 100;
    return this.reviewService.getAll(query, { bypassRegion: true }).pipe(
      switchMap((firstPage) => {
        const firstItems = firstPage.items ?? [];
        const totalPages = Math.max(1, firstPage.totalPages ?? 1);

        if (totalPages === 1) {
          return of(firstItems);
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, index) => (
          this.reviewService.getAll(
            { ...query, page: index + 2, pageSize },
            { bypassRegion: true }
          )
        ));

        return forkJoin(requests).pipe(
          map((pages) => [
            ...firstItems,
            ...pages.flatMap((page) => page.items ?? [])
          ])
        );
      })
    );
  }
}