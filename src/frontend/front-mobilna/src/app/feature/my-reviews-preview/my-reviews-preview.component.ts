import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService, UserDto } from '../../services/auth';
import { ReviewDto, ReviewService } from '../../services/review';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface ReviewPreviewCard {
  id: number;
  objectId: number;
  title: string;
  location: string;
  createdLabel: string;
  timeAgo: string;
  text: string;
  rating: number;
  objectType: string;
  objectTypeShort: string;
  status: string;
  creatorResponse: string | null;
}

interface ReviewFilter {
  label: string;
  value: string;
}

interface RatingRow {
  label: string;
  value: number;
  count: number;
}

@Component({
  selector: 'app-my-reviews-preview',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './my-reviews-preview.component.html',
  styleUrl: './my-reviews-preview.component.scss',
})
export class MyReviewsPreviewComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly reviewService = inject(ReviewService);
  private readonly translationService = inject(TranslationService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly currentUser = signal<UserDto | null>(null);
  protected readonly reviews = signal<ReviewPreviewCard[]>([]);
  protected readonly totalCount = signal(0);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly searchTerm = signal('');
  protected readonly activeFilter = signal('all');
  protected readonly visibleCount = signal(6);
  protected readonly deletingId = signal<number | null>(null);

  protected readonly filters = computed<ReviewFilter[]>(() => {
    const typeFilters = [...new Set(this.reviews().map((item) => item.objectType.trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, this.translationService.currentLocale()))
      .map((type) => ({ label: type, value: type }));

    return [{ label: this.translationService.translate('common.all'), value: 'all' }, ...typeFilters];
  });

  protected readonly filteredReviews = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchTerm().trim().toLowerCase();

    return this.reviews().filter((item) => {
      const matchesFilter = filter === 'all' || item.objectType === filter;
      const haystack = `${item.title} ${item.location} ${item.text} ${item.status} ${item.objectType}`.toLowerCase();
      const matchesSearch = !query || haystack.includes(query);
      return matchesFilter && matchesSearch;
    });
  });

  protected readonly visibleReviews = computed(() =>
    this.filteredReviews().slice(0, this.visibleCount()),
  );

  protected readonly totalReviews = computed(() =>
    Math.max(this.totalCount(), this.reviews().length),
  );

  protected readonly averageRating = computed(() => {
    const items = this.reviews();
    if (!items.length) return '0.0';

    const total = items.reduce((sum, item) => sum + item.rating, 0);
    return (total / items.length).toFixed(1);
  });

  protected readonly roundedAverageRating = computed(() =>
    Math.round(Number(this.averageRating()) || 0),
  );

  protected readonly ratingRows = computed<RatingRow[]>(() => {
    const items = this.reviews();
    const total = items.length;

    return [5, 4, 3, 2, 1].map((rating) => {
      const count = items.filter((item) => item.rating === rating).length;
      return {
        label: String(rating),
        count,
        value: total ? count / total : 0,
      };
    });
  });

  protected readonly profileImageUrl = computed(() => {
    const raw = this.currentUser()?.profileImageUrl?.trim() || '/images/profiles/default_icon.png';
    return this.resolveProfileImageUrl(raw);
  });

  protected readonly displayName = computed(() => {
    const user = this.currentUser();
    if (!user) return this.translationService.translate('profile.defaultUser');

    const fullName = `${user.firstName?.trim() ?? ''} ${user.lastName?.trim() ?? ''}`.trim();
    return fullName || this.translationService.translate('profile.defaultUser');
  });

  protected readonly profileSubtitle = computed(() => {
    const user = this.currentUser();
    if (!user) return this.translationService.translate('myReviews.subtitleFallback');

    const role = this.roleLabel(user.roleName);
    const country = user.country?.trim();

    if (country) {
      return `${role} • ${country}`;
    }

    return user.email?.trim() || role;
  });

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser.set(currentUser);

    forkJoin({
      user: this.authService.getById(currentUser.id).pipe(catchError(() => of(currentUser))),
      reviews: this.reviewService.getMine({ page: 1, pageSize: 1000 }).pipe(
        catchError((err) => {
          console.error(err);
          this.errorMessage.set('myReviews.loadError');
          return of({ items: [] as ReviewDto[], totalCount: 0, page: 1, pageSize: 1000, totalPages: 0 });
        }),
      ),
    }).subscribe(({ user, reviews }) => {
      this.currentUser.set(user);
      const pagedResponse = reviews as { items?: ReviewDto[]; totalCount?: number };
      this.totalCount.set(pagedResponse.totalCount ?? 0);
      this.reviews.set(this.mapReviewsForUser(this.toArray<ReviewDto>(reviews)));
      this.isLoading.set(false);
      this.cdr.detectChanges();
    });
  }

  protected setFilter(filter: string): void {
    this.activeFilter.set(filter);
    this.visibleCount.set(6);
  }

  protected setSearch(value: string): void {
    this.searchTerm.set(value);
    this.visibleCount.set(6);
  }

  protected stars(count: number): number[] {
    return Array.from({ length: count }, (_, index) => index);
  }

  protected loadMore(): void {
    this.visibleCount.update((count) => count + 6);
  }

  protected canLoadMore(): boolean {
    return this.filteredReviews().length > this.visibleCount();
  }

  protected hasAnyReviews(): boolean {
    return this.totalReviews() > 0;
  }

  protected hasFilteredResults(): boolean {
    return this.filteredReviews().length > 0;
  }

  protected initials(): string {
    const user = this.currentUser();
    const first = user?.firstName?.trim()?.charAt(0) ?? '';
    const last = user?.lastName?.trim()?.charAt(0) ?? '';
    const initials = `${first}${last}`.trim().toUpperCase();
    return initials || 'SG';
  }

  protected openObject(card: ReviewPreviewCard): void {
    this.router.navigate(['/object', card.objectId], {
      queryParams: {
        reviewId: card.id,
        mode: 'edit-review'
      }
    });
  }

  protected deleteReview(card: ReviewPreviewCard): void {
    if (this.deletingId() === card.id) return;

    const confirmed = window.confirm(
      this.translationService.translate('myReviews.deleteConfirm', { title: card.title }),
    );
    if (!confirmed) return;

    this.deletingId.set(card.id);

    this.reviewService.delete(card.id).subscribe({
      next: () => {
        // Ukloni iz liste
        this.reviews.update(items => items.filter(item => item.id !== card.id));

        this.deletingId.set(null);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Delete review error:', err);
        alert(this.translationService.translate('myReviews.deleteError'));
        this.deletingId.set(null);
        this.cdr.detectChanges();
      }
    });
  }

  protected trackReview(_: number, item: ReviewPreviewCard): number {
    return item.id;
  }

  protected trackFilter(_: number, item: ReviewFilter): string {
    return item.value;
  }

  private mapReviewsForUser(reviews: ReviewDto[]): ReviewPreviewCard[] {
    return reviews
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map((item) => {
        const objectType = item.objectTypeName?.trim() || this.translationService.translate('myReviews.objectTypeFallback');
        return {
          id: item.id,
          objectId: item.objectId,
          title: item.objectName?.trim() || this.translationService.translate('reviews.objectFallback'),
          location: this.buildLocationLabel(item),
          createdLabel: this.formatDate(item.createdAt),
          timeAgo: this.formatRelativeDate(item.createdAt),
          text: item.text?.trim() || this.translationService.translate('reviews.textFallback'),
          rating: this.normalizeRating(item.rating),
          objectType,
          objectTypeShort: this.buildTypeShortLabel(objectType),
          status: this.normalizeStatus(item.status),
          creatorResponse: item.creatorResponse?.trim() || null,
        };
      });
  }

  private buildLocationLabel(review: ReviewDto): string {
    const locality = review.localityName?.trim();
    const destination = review.destinationName?.trim();

    if (locality && destination) {
      return `${locality}, ${destination}`;
    }

    return locality || destination || review.address?.trim() || this.translationService.translate('myReviews.locationFallback');
  }

  private buildTypeShortLabel(type: string): string {
    const parts = type
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    return type.slice(0, 2).toUpperCase();
  }

  private normalizeStatus(status?: string | null): string {
    switch ((status ?? '').trim().toLowerCase()) {
      case 'approved':
        return this.translationService.translate('myReviews.status.approved');
      case 'pending':
        return this.translationService.translate('myReviews.status.pending');
      case 'rejected':
        return this.translationService.translate('myReviews.status.rejected');
      default:
        return status?.trim() || this.translationService.translate('reviews.statusFallback');
    }
  }

  private normalizeRating(value: number): number {
    return Math.max(1, Math.min(5, Math.round(Number(value) || 0)));
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

  private formatRelativeDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return this.translationService.translate('common.dateNotAvailable');
    }

    const diffInDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffInDays <= 0) return this.translationService.translate('myReviews.time.today');
    if (diffInDays === 1) return this.translationService.translate('myReviews.time.dayAgo');
    if (diffInDays < 7) {
      return this.translationService.translate('myReviews.time.daysAgo', { count: diffInDays });
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks === 1) return this.translationService.translate('myReviews.time.weekAgo');
    if (diffInWeeks < 5) {
      return this.translationService.translate('myReviews.time.weeksAgo', { count: diffInWeeks });
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths === 1) return this.translationService.translate('myReviews.time.monthAgo');
    if (diffInMonths < 12) {
      return this.translationService.translate('myReviews.time.monthsAgo', { count: diffInMonths });
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return diffInYears === 1
      ? this.translationService.translate('myReviews.time.yearAgo')
      : this.translationService.translate('myReviews.time.yearsAgo', { count: diffInYears });
  }

  private roleLabel(role?: string | null): string {
    switch ((role ?? '').trim().toLowerCase()) {
      case 'admin':
        return this.translationService.translate('myReviews.roles.admin');
      case 'manager':
        return this.translationService.translate('myReviews.roles.manager');
      case 'contentcreator':
      case 'content-creator':
        return this.translationService.translate('myReviews.roles.contentCreator');
      case 'tourist':
        return this.translationService.translate('myReviews.roles.tourist');
      default:
        return this.translationService.translate('myReviews.roles.user');
    }
  }

  private resolveProfileImageUrl(raw: string): string {
    const imageBase = this.localImageBaseUrl();

    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        if (parsed.hostname === 'localhost' && parsed.pathname.startsWith('/images/')) {
          return `${imageBase}${parsed.pathname}`;
        }
        return raw;
      } catch {
        return raw;
      }
    }

    return `${imageBase}${raw.startsWith('/') ? raw : `/${raw}`}`;
  }

  private localImageBaseUrl(): string {
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');

    try {
      const parsed = new URL(apiBase);
      return parsed.origin;
    } catch {
      return apiBase;
    }
  }

  private toArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) {
      return raw as T[];
    }

    if (!raw || typeof raw !== 'object') {
      return [];
    }

    const obj = raw as Record<string, unknown>;
    const listKeys = ['items', 'Items', 'data', 'results', 'value'];

    for (const key of listKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }

    return [];
  }
}
