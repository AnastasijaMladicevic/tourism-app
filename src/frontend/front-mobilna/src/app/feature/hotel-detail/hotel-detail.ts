import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../services/auth';
import { ImageDto, ImageService } from '../../services/image';
import { ObjectDto, ObjectImageDto, ObjectService } from '../../services/object';
import { ReviewDto, ReviewService } from '../../services/review';

interface ReviewCard {
  id: number;
  author: string;
  initials: string;
  rating: number;
  stars: boolean[];
  text: string;
  relativeDate: string;
  creatorResponse?: string | null;
}

@Component({
  selector: 'app-hotel-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './hotel-detail.html',
  styleUrls: ['./hotel-detail.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HotelDetailComponent implements OnInit {
  hotel: ObjectDto | null = null;
  images: (ImageDto | ObjectImageDto)[] = [];
  reviews: ReviewCard[] = [];
  mainImage = '';
  isLoading = true;
  errorMessage = '';
  workingHoursText = '';
  isFavorite = false;
  showAllReviews = false;

  showGalleryModal = false;
  currentImageIndex = 0;

  private touchStartX = 0;
  private touchEndX = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private objectService: ObjectService,
    private imageService: ImageService,
    private authService: AuthService,
    private reviewService: ReviewService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      object: this.objectService.getById(id),
      images: this.imageService.getForObject(id),
      reviews: this.reviewService.getAll(),
    }).subscribe({
      next: ({ object, images, reviews }) => {
        this.hotel = object;
        this.workingHoursText = object.workingHours ? this.formatWorkingHours(object.workingHours) : '';

        const embeddedImages = object.images || [];
        this.images = [...embeddedImages, ...images];
        this.mainImage = this.getMainImage(this.images);
        this.reviews = this.toReviewCards(reviews, object.id);

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load hotel details:', err);
        this.isLoading = false;
        this.errorMessage = 'Greška pri učitavanju hotela.';
        this.cdr.detectChanges();
      },
    });
  }

  get visibleReviews(): ReviewCard[] {
    return this.showAllReviews ? this.reviews : this.reviews.slice(0, 2);
  }

  toggleFavorite(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.isFavorite = !this.isFavorite;
  }

  toggleReviewsExpanded(): void {
    this.showAllReviews = !this.showAllReviews;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  goBack(): void {
    this.router.navigate(['/hotels']);
  }

  bookNow(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    alert('Book Now - Booking sistem će biti integrisan kasnije');
  }

  addToPlanner(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    alert('Hotel je dodat u Planner');
  }

  callHotel(): void {
    if (!this.hotel?.phoneNumber) {
      alert('Broj telefona nije dostupan');
      return;
    }
    window.location.href = `tel:${this.hotel.phoneNumber}`;
  }

  viewOnMap(): void {
    if (!this.hotel?.latitude || !this.hotel?.longitude) return;
    const lat = this.hotel.latitude;
    const lng = this.hotel.longitude;
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=17`, '_blank');
  }

  openGallery(index = 0): void {
    if (!this.images.length) return;
    this.currentImageIndex = index;
    this.showGalleryModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeGallery(): void {
    this.showGalleryModal = false;
    document.body.style.overflow = 'visible';
  }

  nextImage(): void {
    if (!this.images.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
  }

  prevImage(): void {
    if (!this.images.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
  }

  private getMainImage(images: (ImageDto | ObjectImageDto)[]): string {
    if (!images.length) return '';
    const main = images.find((image) => image.isMain);
    return main?.url ?? images[0].url;
  }

  private formatWorkingHours(workingHours: string): string {
    try {
      const parsed = JSON.parse(workingHours) as Record<string, string>;
      const order = ['pon', 'uto', 'sre', 'cet', 'pet', 'sub', 'ned'];
      const labels: Record<string, string> = {
        pon: 'Mon',
        uto: 'Tue',
        sre: 'Wed',
        cet: 'Thu',
        pet: 'Fri',
        sub: 'Sat',
        ned: 'Sun',
      };

      const entries = Object.entries(parsed)
        .filter(([, value]) => value)
        .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));

      if (!entries.length) return '';
      if (entries.length === 1) {
        const [day, value] = entries[0];
        return value === '00:00-24:00' ? 'Open 24/7' : `${labels[day] ?? day}: ${value}`;
      }

      const allValues = entries.map(([, value]) => value);
      const firstValue = allValues[0];
      if (allValues.every((value) => value === firstValue)) {
        return `Daily: ${firstValue}`;
      }

      return entries.map(([day, value]) => `${labels[day] ?? day}: ${value}`).join(', ');
    } catch {
      return workingHours;
    }
  }

  private handleSwipe(): void {
    const delta = this.touchEndX - this.touchStartX;

    if (Math.abs(delta) < 50) return;

    if (delta < 0) {
      this.nextImage();
    } else {
      this.prevImage();
    }
  }

  private toReviewCards(rawReviews: ReviewDto[], hotelId: number): ReviewCard[] {
    return this.toArray<ReviewDto>(rawReviews)
      .map((review) => this.normalizeReview(review))
      .filter((review) => review.objectId === hotelId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((review) => ({
        id: review.id,
        author: review.userFullName || 'Guest',
        initials: this.getInitials(review.userFullName),
        rating: review.rating,
        stars: Array.from({ length: 5 }, (_, index) => index < review.rating),
        text: review.text,
        relativeDate: this.formatRelativeDate(review.createdAt),
        creatorResponse: review.creatorResponse,
      }));
  }

  private normalizeReview(raw: ReviewDto): ReviewDto {
    const dto = raw as unknown as Record<string, unknown>;
    const reviewedByUserIdValue = dto['reviewedByUserId'] ?? dto['ReviewedByUserId'] ?? null;

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      userId: Number(dto['userId'] ?? dto['UserId'] ?? 0),
      userFullName: String(dto['userFullName'] ?? dto['UserFullName'] ?? 'Guest'),
      objectId: Number(dto['objectId'] ?? dto['ObjectId'] ?? 0),
      objectName: String(dto['objectName'] ?? dto['ObjectName'] ?? ''),
      rating: Number(dto['rating'] ?? dto['Rating'] ?? 0),
      text: String(dto['text'] ?? dto['Text'] ?? ''),
      creatorResponse: (dto['creatorResponse'] ?? dto['CreatorResponse'] ?? null) as string | null,
      creatorResponseAt: (dto['creatorResponseAt'] ?? dto['CreatorResponseAt'] ?? null) as string | null,
      status: String(dto['status'] ?? dto['Status'] ?? ''),
      reviewedByUserId: reviewedByUserIdValue == null ? null : Number(reviewedByUserIdValue),
      reviewedByFullName: (dto['reviewedByFullName'] ?? dto['ReviewedByFullName'] ?? null) as string | null,
      createdAt: String(dto['createdAt'] ?? dto['CreatedAt'] ?? ''),
    };
  }

  private toArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (!raw || typeof raw !== 'object') return [];
    const obj = raw as Record<string, unknown>;
    const listKeys = ['items', 'data', 'results', 'value'];

    for (const key of listKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }

    return [];
  }

  private getInitials(fullName?: string): string {
    const words = (fullName ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    if (!words.length) return 'G';
    return words.map((word) => word.charAt(0).toUpperCase()).join('');
  }

  private formatRelativeDate(dateValue: string): string {
    const createdAt = new Date(dateValue);
    if (Number.isNaN(createdAt.getTime())) return '';

    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return '1 DAY AGO';
    if (diffDays < 7) return `${diffDays} DAYS AGO`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks === 1) return '1 WEEK AGO';
    if (diffWeeks < 5) return `${diffWeeks} WEEKS AGO`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths <= 1) return '1 MONTH AGO';
    if (diffMonths < 12) return `${diffMonths} MONTHS AGO`;

    const diffYears = Math.floor(diffDays / 365);
    return diffYears <= 1 ? '1 YEAR AGO' : `${diffYears} YEARS AGO`;
  }
}
