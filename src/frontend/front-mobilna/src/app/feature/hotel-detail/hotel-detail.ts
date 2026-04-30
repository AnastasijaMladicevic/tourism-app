import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subscription, catchError, forkJoin, of } from 'rxjs';

import { AuthService } from '../../services/auth';
import { ImageDto, ImageService } from '../../services/image';
import { ObjectDto, ObjectImageDto, ObjectService } from '../../services/object';
import { ReviewDto } from '../../services/review';
import { environment } from '../../../environment/environment';

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

interface NearbyHotelCard {
  id: number;
  name: string;
  image?: string;
  location: string;
  rating?: number;
  reviews: number;
}

@Component({
  selector: 'app-hotel-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './hotel-detail.html',
  styleUrls: ['./hotel-detail.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class HotelDetailComponent implements OnInit, OnDestroy {
  hotel: ObjectDto | null = null;
  images: (ImageDto | ObjectImageDto)[] = [];
  reviews: ReviewCard[] = [];
  nearbyHotels: NearbyHotelCard[] = [];
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
  private readonly subscriptions = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private objectService: ObjectService,
    private imageService: ImageService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const id = Number(params.get('id'));
        if (!id) {
          this.isLoading = false;
          this.errorMessage = 'Greska pri ucitavanju hotela.';
          this.cdr.detectChanges();
          return;
        }

        this.loadHotel(id);
      }),
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    document.body.style.overflow = 'visible';
  }

  private loadHotel(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.hotel = null;
    this.images = [];
    this.reviews = [];
    this.nearbyHotels = [];

    forkJoin({
      object: this.objectService.getById(id),
      images: this.imageService.getForObject(id).pipe(catchError(() => of([] as ImageDto[]))),
    }).subscribe({
      next: ({ object, images }) => {
        const normalizedObject = this.normalizeObject(object);
        const normalizedImages = this.normalizeImages(images);

        this.hotel = normalizedObject;
        this.workingHoursText = normalizedObject.workingHours
          ? this.formatWorkingHours(normalizedObject.workingHours)
          : '';
        this.images = normalizedImages;
        this.mainImage =
          this.getMainImage(normalizedImages) ||
          this.resolveMediaUrl(normalizedObject.mainImageUrl) ||
          this.getMainImage(this.normalizeImages((normalizedObject.images || []) as (ImageDto | ObjectImageDto)[]));
        this.reviews = this.toReviewCards(normalizedObject.reviews || [], normalizedObject.id);

        this.cdr.detectChanges();
        this.loadNearbyHotels(normalizedObject);
      },
      error: (err) => {
        console.error('Failed to load hotel details:', err);
        this.isLoading = false;
        this.errorMessage = 'Greska pri ucitavanju hotela.';
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
    this.router.navigate(['/objects']);
  }

  openNearbyHotel(hotelId: number): void {
    this.router.navigate(['/object', hotelId]);
  }

  bookNow(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    alert('Book Now - Booking sistem ce biti integrisan kasnije');
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
    return this.resolveMediaUrl(main?.url ?? images[0].url) ?? '';
  }

  private normalizeImages(images: (ImageDto | ObjectImageDto)[]): (ImageDto | ObjectImageDto)[] {
    return images
      .map((image) => ({
        ...image,
        url: this.resolveMediaUrl(image.url) ?? '',
      }))
      .filter((image) => !!image.url);
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

  private loadNearbyHotels(currentHotel: ObjectDto): void {
    if (currentHotel.latitude == null || currentHotel.longitude == null) {
      this.nearbyHotels = [];
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.objectService
      .getNearby(
        {
          latitude: currentHotel.latitude,
          longitude: currentHotel.longitude,
          radiusMeters: 15000,
          type: 'Hotel',
          page: 1,
          pageSize: 8,
          sortOrder: 'asc',
        },
        { bypassLanguage: true },
      )
      .subscribe({
        next: (result) => {
          this.nearbyHotels = this.toArray<ObjectDto>(result)
            .map((item) => this.normalizeObject(item))
            .filter((item) => item.id !== currentHotel.id)
            .filter((item) => this.isHotel(item.objectTypeName))
            .slice(0, 2)
            .map((object) => ({
              id: object.id,
              name: object.name,
              image: this.resolveMediaUrl(
                (object.images?.find((image) => image.isMain) ?? object.images?.[0])?.url ?? object.mainImageUrl,
              ),
              location: object.localityName ?? object.destinationName ?? 'Montenegro',
              rating: object.averageRating,
              reviews: object.reviewCount ?? 0,
            }));

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.nearbyHotels = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
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

  private normalizeObject(raw: ObjectDto): ObjectDto {
    const dto = raw as unknown as Record<string, unknown>;
    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      address: (dto['address'] ?? dto['Address'] ?? undefined) as string | undefined,
      phoneNumber: (dto['phoneNumber'] ?? dto['PhoneNumber'] ?? undefined) as string | undefined,
      website: (dto['website'] ?? dto['Website'] ?? undefined) as string | undefined,
      workingHours: (dto['workingHours'] ?? dto['WorkingHours'] ?? undefined) as string | undefined,
      mainImageUrl: (dto['mainImageUrl'] ?? dto['MainImageUrl'] ?? undefined) as string | undefined,
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      averageRating: this.readOptionalNumber(dto, ['averageRating', 'AverageRating']),
      reviewCount: this.readOptionalNumber(dto, ['reviewCount', 'ReviewCount']),
      distanceKm: this.readOptionalNumber(dto, ['distanceKm', 'DistanceKm']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      objectTypeId: Number(dto['objectTypeId'] ?? dto['ObjectTypeId'] ?? 0),
      objectTypeName: String(dto['objectTypeName'] ?? dto['ObjectTypeName'] ?? ''),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? undefined) as string | undefined,
      destinationName: (dto['destinationName'] ?? dto['DestinationName'] ?? undefined) as string | undefined,
      images: ((dto['images'] ?? dto['Images'] ?? []) as ObjectDto['images']) || [],
      reviews: ((dto['reviews'] ?? dto['Reviews'] ?? []) as ReviewDto[]) || [],
    };
  }

  private readOptionalNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = obj[key];
      if (value == null) continue;
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
    return undefined;
  }

  private isHotel(typeName?: string): boolean {
    if (!typeName) return false;
    return typeName.trim().toLowerCase().includes('hotel');
  }

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (trimmed.startsWith('/')) return `${apiBase}${trimmed}`;
    return `${apiBase}/${trimmed}`;
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
