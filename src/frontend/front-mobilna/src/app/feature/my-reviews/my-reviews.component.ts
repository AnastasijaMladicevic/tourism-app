import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService } from '../../services/auth';
import { ReviewDto, ReviewService } from '../../services/review';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './my-reviews.component.html',
  styleUrl: './my-reviews.component.scss',
})
export class MyReviewsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);

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
      .getAll()
      .pipe(
        catchError(() => {
          this.errorMessage.set('Tvoje recenzije trenutno nisu dostupne.');
          return of([] as ReviewDto[]);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((items) => {
        const ownReviews = items
          .filter((item) => Number(item.userId) === currentUser.id)
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
          .map((item) => this.mapReview(item));

        this.reviews.set(ownReviews);
      });
  }

  protected trackReview(_: number, item: ReviewCard): number {
    return item.id;
  }

  private mapReview(item: ReviewDto): ReviewCard {
    const safeRating = Math.max(0, Math.min(5, Math.round(item.rating)));

    return {
      id: item.id,
      objectName: item.objectName || 'Objekat bez naziva',
      ratingLabel: `${safeRating}/5`,
      ratingStars: Array.from({ length: safeRating }, () => 'star'),
      text: item.text?.trim() || 'Recenzija nema dodatni komentar.',
      createdLabel: this.formatDate(item.createdAt),
      statusLabel: item.status || 'Bez statusa',
      creatorResponse: item.creatorResponse?.trim() || null,
    };
  }

  private formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Datum nije dostupan';
    }

    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
