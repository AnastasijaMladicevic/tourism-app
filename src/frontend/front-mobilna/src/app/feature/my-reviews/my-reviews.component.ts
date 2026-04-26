import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ReviewDto, ReviewService } from '../../services/review';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface ReviewCard {
  id: number;
  objectName: string;
  ratingLabel: string;
  ratingStars: string[];
  text: string;
  createdLabel: string;
  statusLabel: string;
  creatorResponse: string | null;
}

@Component({
  selector: 'app-my-reviews',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './my-reviews.component.html',
  styleUrl: './my-reviews.component.scss',
})
export class MyReviewsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  protected readonly reviews = signal<ReviewCard[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.id) {
      this.router.navigate(['/profile']);
      return;
    }

    this.reviewService
      .getMine({ page: 1, pageSize: 200 })
      .pipe(
        catchError(() => {
          this.errorMessage.set(this.translationService.translate('reviews.loadError'));
          return of([] as ReviewDto[]);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((items) => {
        const ownReviews = this.toArray(items)
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .map((item) => this.mapReview(item));

        this.reviews.set(ownReviews);
      });
  }

  protected trackReview(_: number, item: ReviewCard): number {
    return item.id;
  }

  protected ratingAria(ratingLabel: string): string {
    return this.translationService.translate('reviews.ratingAria', { rating: ratingLabel });
  }

  private toArray(raw: unknown): ReviewDto[] {
    if (Array.isArray(raw)) return raw as ReviewDto[];
    if (!raw || typeof raw !== 'object') return [];

    const obj = raw as Record<string, unknown>;
    const listKeys = ['items', 'data', 'results', 'value'];

    for (const key of listKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) {
        return candidate as ReviewDto[];
      }
    }

    return [];
  }

  private mapReview(item: ReviewDto): ReviewCard {
    const safeRating = Math.max(0, Math.min(5, Math.round(item.rating)));

    return {
      id: item.id,
      objectName: item.objectName || this.translationService.translate('reviews.objectFallback'),
      ratingLabel: `${safeRating}/5`,
      ratingStars: Array.from({ length: safeRating }, () => 'star'),
      text: item.text?.trim() || this.translationService.translate('reviews.textFallback'),
      createdLabel: this.formatDate(item.createdAt),
      statusLabel: item.status || this.translationService.translate('reviews.statusFallback'),
      creatorResponse: item.creatorResponse?.trim() || null,
    };
  }

  private formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return this.translationService.translate('common.dateNotAvailable');
    }

    return date.toLocaleDateString(this.translationService.currentLocale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
