import { ChangeDetectorRef, Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../services/auth';
import { ImageDto, ImageService } from '../../services/image';
import { ObjectDto, ObjectImageDto, ObjectService, PagedResultDto } from '../../services/object';
import { ReviewDto } from '../../services/review';
import { MapComponent } from '../../shared/components/map/map';
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MapComponent],
  templateUrl: './object-detail.html',
  styleUrls: ['./object-detail.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ObjectDetailComponent implements OnInit {
  object: ObjectDto | null = null;
  images: ImageDto[] = [];
  mainImage = '';
  isLoading = true;
  errorMessage = '';
  isFavorite = false;
  reviews: ReviewDto[] = [];
  nearbyObjects: ObjectDto[] = [];

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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      object: this.objectService.getById(id),
      images: this.imageService.getForObject(id),
    }).subscribe({
      next: ({ object, images }) => {
        const normalizedObject = this.normalizeObject(object);

        this.object = normalizedObject;
        this.images = images || [];
        this.reviews = normalizedObject.reviews || [];
        this.mainImage = this.getMainImage(images);

        this.loadNearbyObjects(normalizedObject);
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.errorMessage = 'Greška pri učitavanju objekta.';
        this.cdr.detectChanges();
      },
    });
  }

  private loadNearbyObjects(currentObject: ObjectDto): void {
    if (currentObject.latitude == null || currentObject.longitude == null) {
      this.nearbyObjects = [];
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.objectService
      .getNearby({
        latitude: currentObject.latitude,
        longitude: currentObject.longitude,
        radiusMeters: 5000,
        page: 1,
        pageSize: 6,
        sortOrder: 'asc',
      })
      .subscribe({
        next: (result) => {
          this.nearbyObjects = this.extractItems(result)
            .map((item) => this.normalizeObject(item))
            .filter((item) => item.id !== currentObject.id)
            .slice(0, 3);

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load nearby objects:', err);
          this.nearbyObjects = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }

  private extractItems(result: PagedResultDto<ObjectDto> | Record<string, unknown> | null | undefined): ObjectDto[] {
    if (!result || typeof result !== 'object') {
      return [];
    }

    const raw = result as Record<string, unknown>;
    const candidates = [raw['items'], raw['Items'], raw['data'], raw['Data'], raw['results'], raw['Results']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as ObjectDto[];
      }
    }

    return [];
  }

  private normalizeObject(raw: ObjectDto): ObjectDto {
    const dto = raw as unknown as Record<string, unknown>;

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      mainImageUrl: (dto['mainImageUrl'] ?? dto['MainImageUrl'] ?? undefined) as string | undefined,
      address: (dto['address'] ?? dto['Address'] ?? undefined) as string | undefined,
      phoneNumber: (dto['phoneNumber'] ?? dto['PhoneNumber'] ?? undefined) as string | undefined,
      website: (dto['website'] ?? dto['Website'] ?? undefined) as string | undefined,
      workingHours: (dto['workingHours'] ?? dto['WorkingHours'] ?? undefined) as string | undefined,
      price: (dto['price'] ?? dto['Price'] ?? undefined) as Int16Array | undefined,
      amenities: ((dto['amenities'] ?? dto['Amenities'] ?? []) as []) || [],
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      averageRating: this.readOptionalNumber(dto, ['averageRating', 'AverageRating']),
      reviewCount: this.readOptionalNumber(dto, ['reviewCount', 'ReviewCount']),
      distanceKm: this.readOptionalNumber(dto, ['distanceKm', 'DistanceKm']),
      distanceMeters: this.readOptionalNumber(dto, ['distanceMeters', 'DistanceMeters']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      objectTypeId: Number(dto['objectTypeId'] ?? dto['ObjectTypeId'] ?? 0),
      objectTypeName: String(dto['objectTypeName'] ?? dto['ObjectTypeName'] ?? ''),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? undefined) as string | undefined,
      destinationName: (dto['destinationName'] ?? dto['DestinationName'] ?? undefined) as string | undefined,
      images: ((dto['images'] ?? dto['Images'] ?? []) as ObjectImageDto[]) || [],
      reviews: ((dto['reviews'] ?? dto['Reviews'] ?? []) as ReviewDto[]) || [],
    };
  }

  private readOptionalNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = obj[key];
      if (value == null) {
        continue;
      }

      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private getMainImage(images: ImageDto[]): string {
    if (!images || images.length === 0) return '';
    const main = images.find((image) => image.isMain);
    return this.resolveMediaUrl(main?.url ?? images[0].url) ?? '';
  }

  getNearbyObjectImage(object: ObjectDto): string | undefined {
    const mainImage = object.images?.find((image) => image.isMain) ?? object.images?.[0];
    return this.resolveMediaUrl(mainImage?.url ?? object.mainImageUrl);
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

  toggleFavorite(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.isFavorite = !this.isFavorite;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('sr-RS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  goBack(): void {
    this.router.navigate(['/objects']);
  }

  private getType(): string {
    const typeName = (this.object?.objectTypeName ?? '').toLowerCase();
    if (typeName.includes('hotel')) return 'hotel';
    if (typeName.includes('restoran')) return 'restaurant';
    if (typeName.includes('kafana')) return 'kafana';
    return 'object';
  }

  viewOnMap(): void {
    if (!this.object?.latitude || !this.object?.longitude) return;

    this.router.navigate(['/map'], {
      state: {
        lat: this.object.latitude,
        lng: this.object.longitude,
        zoom: 19,
        selectedItem: this.object,
        selectedType: this.getType(),
      },
    });
  }

  openGallery(index = 0): void {
    if (!this.images || this.images.length === 0) return;
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

  onSwipe(event: { direction: string }): void {
    if (event.direction === 'left') this.nextImage();
    if (event.direction === 'right') this.prevImage();
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.changedTouches[0].screenX;
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEndX = event.changedTouches[0].screenX;
    this.handleSwipe();
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

  getWorkingHours(): string {
    if (!this.object?.workingHours) return 'Radno vreme nije navedeno';

    try {
      const hours = JSON.parse(this.object.workingHours) as Record<string, string>;
      const today = new Date().getDay();
      const dayKeys = ['ned', 'pon', 'uto', 'sre', 'cet', 'pet', 'sub'];
      const todayKey = dayKeys[today];

      return hours[todayKey] || hours['pon'] || 'Radno vreme nije navedeno';
    } catch {
      return this.object.workingHours;
    }
  }

  formatReviewDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  showAllReviewsModal = false;

  getRatingPercentage(rating: number): number {
    if (!this.reviews || this.reviews.length === 0) return 0;

    const count = this.reviews.filter((review) => Math.floor(review.rating) === rating).length;
    return Math.round((count / this.reviews.length) * 100);
  }

  openAllReviews(): void {
    this.showAllReviewsModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeAllReviews(): void {
    this.showAllReviewsModal = false;
    document.body.style.overflow = 'visible';
  }

  openWriteReview(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    alert('Otvaram formu za novu recenziju (u izradi)');
  }

  openNearbyObjects(objectId: number): void {
    this.router.navigate(['/object', objectId]);
  }
}
