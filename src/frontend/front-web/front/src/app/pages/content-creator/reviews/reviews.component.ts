import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, forkJoin, map, of, switchMap, throwError, timer, timeout } from 'rxjs';
import { ObjectDto, ObjectImageDto, ObjectService } from '../../../services/object';
import { ReviewDto, ReviewService } from '../../../services/review';

@Component({
  selector: 'app-content-creator-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.css']
})
export class ContentCreatorReviewsComponent implements OnInit {
  private readonly reviewService = inject(ReviewService);
  private readonly objectService = inject(ObjectService);

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
    this.loadReviews();
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
        })
      )
      .subscribe({
        next: (reviews) => {
          this.allReviews = reviews;
          this.applyFilters();
        },
        error: (error: any) => {
          this.errorMessage = error?.error?.message ?? 'Failed to load reviews.';
        }
      });
  }

  private loadReviewsRequest() {
    return this.getMyObjectIds();
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    this.filteredReviews = this.allReviews
      .filter((review) => {
        const hasResponse = !!review.creatorResponse?.trim();
        const matchesResponseFilter =
          this.responseFilter === 'all'
          || (this.responseFilter === 'responded' && hasResponse)
          || (this.responseFilter === 'pending' && !hasResponse);

        const matchesRatingFilter =
          this.ratingFilter === 'all' || review.rating === this.ratingFilter;

        const matchesSearch =
          !search
          || review.userFullName.toLowerCase().includes(search)
          || review.objectName.toLowerCase().includes(search)
          || review.text.toLowerCase().includes(search)
          || review.creatorResponse?.toLowerCase().includes(search);

        return matchesResponseFilter && matchesRatingFilter && matchesSearch;
      })
      .sort((a, b) => {
        const left = new Date(a.createdAt).getTime();
        const right = new Date(b.createdAt).getTime();
        return this.sortOrder === 'desc' ? right - left : left - right;
      });

    if (!this.selectedReview || !this.filteredReviews.some((item) => item.id === this.selectedReview?.id)) {
      this.selectReview(this.filteredReviews[0] ?? null);
    }
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
      },
      error: () => {
        this.selectedObject = null;
      }
    });

    this.isLoadingImages = true;
    this.objectService.getImages(objectId)
      .pipe(finalize(() => {
        this.isLoadingImages = false;
      }))
      .subscribe({
        next: (images) => {
          this.selectedObjectImages = images ?? [];
        },
        error: () => {
          this.selectedObjectImages = [];
        }
      });
  }

  private fetchAllReviews() {
    const pageSize = 100;
    return this.reviewService.getAll(
      { page: 1, pageSize, sortBy: 'createdAt', sortOrder: this.sortOrder },
      { bypassRegion: true }
    ).pipe(
      switchMap((firstPage) => {
        const firstItems = firstPage.items ?? [];
        const totalPages = Math.max(1, firstPage.totalPages ?? 1);

        if (totalPages === 1) {
          return of(firstItems);
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, index) => (
          this.reviewService.getAll(
            { page: index + 2, pageSize, sortBy: 'createdAt', sortOrder: this.sortOrder },
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

  private getMyObjectIds() {
    const pageSize = 200;
    return this.objectService.getMy(
      { page: 1, pageSize, sortBy: 'name', sortOrder: 'asc' },
      { bypassRegion: true }
    ).pipe(
      switchMap((firstPage) => {
        const firstItems = firstPage.items ?? [];
        const totalPages = Math.max(1, firstPage.totalPages ?? 1);

        if (totalPages === 1) {
          return of(firstItems.map((item) => item.id));
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, index) => (
          this.objectService.getMy(
            { page: index + 2, pageSize, sortBy: 'name', sortOrder: 'asc' },
            { bypassRegion: true }
          )
        ));

        return forkJoin(requests).pipe(
          map((pages) => [
            ...firstItems,
            ...pages.flatMap((page) => page.items ?? [])
          ]),
          map((items) => items.map((item) => item.id))
        );
      }),
      map((ids) => Array.from(new Set(ids))),
      map((ids) => ids.filter((id) => Number.isFinite(id) && id > 0)),
    );
  }

  private updateReviewInCollections(updated: ReviewDto): void {
    this.allReviews = this.allReviews.map((review) => review.id === updated.id ? updated : review);
    this.applyFilters();
    this.selectedReview = this.filteredReviews.find((review) => review.id === updated.id) ?? null;
    if (this.selectedReview) {
      this.responseText = this.selectedReview.creatorResponse?.trim() ?? this.responseText;
    }
  }

  private getDraftKey(reviewId: number): string {
    return `cc-review-draft-${reviewId}`;
  }
}