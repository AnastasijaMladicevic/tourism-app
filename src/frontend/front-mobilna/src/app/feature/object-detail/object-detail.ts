import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subscription, catchError, combineLatest, finalize, forkJoin, of } from 'rxjs';

import { AuthService } from '../../services/auth';
import { ImageDto, ImageService } from '../../services/image';
import { ObjectDto, ObjectImageDto, ObjectService, PagedResultDto } from '../../services/object';
import { ReviewDto, ReviewService } from '../../services/review';
import { QrLinkDto, QrLinkService } from '../../services/qr-link';
import { MapComponent } from '../../shared/components/map/map';
import { environment } from '../../../environment/environment';
import { FavoriteStateService } from '../../services/favorite-state';
import { FormsModule } from '@angular/forms';
import { RouterHistoryService } from '../../services/router-history';
import { PendingActionService } from '../../services/pending-action';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MapComponent, FormsModule, TranslatePipe],
  templateUrl: './object-detail.html',
  styleUrls: ['./object-detail.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class ObjectDetailComponent implements OnInit, OnDestroy {
  object: ObjectDto | null = null;
  images: ImageDto[] = [];
  mainImage = '';
  isLoading = true;
  errorMessage = '';
  qrLink: QrLinkDto | null = null;


  showConfirmModal = false;
  confirmMessage = '';
  confirmCallback: (() => void) | null = null;

  showSuccessModal = false;
  successMessage = '';

  showReviewImagesModal = false;
  selectedReviewImagesForModal: ImageDto[] = [];
  selectedReviewImageIndex = 0;
  existingReviewImages: ImageDto[] = [];
  reviews: ReviewDto[] = [];
  nearbyObjects: ObjectDto[] = [];
  galleryImages: string[] = [];
  showGalleryModal = false;
  currentImageIndex = 0;
  showAllReviewsModal = false;
  isFavorite = false;
  favoriteId: number | null = null;
  showWriteReviewModal = false;
  newReview = {
    rating: 0,
    text: '',
    images: [] as File[]
  };
  isSubmittingReview = false;
  userReview: ReviewDto | null = null;
  selectedReviewImages: File[] = [];
  reviewImagePreviews: string[] = [];
  titleVisible = true;
  private titleObserver?: IntersectionObserver;
  private observerSetup = false;
  private favoritePendingIds = new Set<number>();
  private touchStartX = 0;
  private touchEndX = 0;
  private readonly subscriptions = new Subscription();
  private pendingOpenReviewId: number | null = null;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private objectService: ObjectService,
    private imageService: ImageService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private favoriteStateService: FavoriteStateService,
    private reviewService: ReviewService,
    private routerHistory: RouterHistoryService,
    private pendingActionService: PendingActionService,
    private qrLinkService: QrLinkService,
    private translationService: TranslationService,
    private el: ElementRef
  ) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.paramMap.subscribe((params) => {
        const id = Number(params.get('id'));
        if (id) this.loadObject(id);
      })
    );

    // Obrada dolaska sa My Reviews (edit mode)
    this.subscriptions.add(
      this.route.queryParams.subscribe((params) => {
        const reviewId = Number(params['reviewId']);
        const mode = params['mode'];

        if (reviewId && mode === 'edit-review') {
          this.pendingOpenReviewId = reviewId;
          // Sačekaj da se objekat i recenzije učitaju
          this.tryOpenPendingReview();
        }
      })
    );
    this.route.queryParams.subscribe(params => {

      if (
        params['openReview'] === 'true' &&
        this.authService.isLoggedIn()
      ) {

        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            openReview: null
          },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });

        setTimeout(() => {
          this.openWriteReview();
        }, 100);
      }
    });
    window.addEventListener('focus', this.handleWindowFocus);
    window.addEventListener('favorite-object', (event: any) => {
      const obj = event.detail;
      if (obj) {
        this.toggleFavorite(obj, new Event('click'));
      }
    });
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    document.body.style.overflow = 'visible';
    window.removeEventListener('focus', this.handleWindowFocus);
    this.titleObserver?.disconnect();
  }

  private setupTitleObserver(): void {
    if (this.observerSetup) return;
    setTimeout(() => {
      const titleEl = this.el.nativeElement.querySelector('.title');
      if (!titleEl) return;
      this.observerSetup = true;
      this.titleObserver = new IntersectionObserver(
        ([entry]) => {
          this.titleVisible = entry.isIntersecting;
          this.cdr.detectChanges();
        },
        { rootMargin: '-55px 0px 0px 0px', threshold: 0 }
      );
      this.titleObserver.observe(titleEl);
    }, 100);
  }

  private loadObject(id: number): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.object = null;
    this.images = [];
    this.mainImage = '';
    this.qrLink = null;
    this.reviews = [];
    this.nearbyObjects = [];

    forkJoin({
      object: this.objectService.getById(id),
      images: this.imageService.getForObject(id).pipe(catchError(() => of([] as ImageDto[]))),
      qr: this.qrLinkService.getForEntity('objects', id).pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ object, images, qr }) => {
        const normalizedObject = this.normalizeObject(object);
        const normalizedImages = this.normalizeImages(images);

        this.object = normalizedObject;
        this.qrLink = qr;
        this.images = normalizedImages;
        this.reviews = normalizedObject.reviews || [];
        this.loadReviewImages();
        const currentUserId = this.authService.getCurrentUser()?.id;

        this.userReview =
          this.reviews.find(r => r.userId === currentUserId) ?? null;
        this.mainImage =
          this.getMainImage(normalizedImages) ||
          this.resolveMediaUrl(normalizedObject.mainImageUrl) ||
          this.getMainImage(this.normalizeImages((normalizedObject.images || []) as ImageDto[]));
        this.syncFavoriteState();
        this.cdr.detectChanges();
        this.setupTitleObserver();
        this.loadNearbyObjects(normalizedObject);
        const review = this.reviews.find(r => r.id === this.pendingOpenReviewId);

        if (this.pendingOpenReviewId) {
          setTimeout(() => this.tryOpenPendingReview(), 300);
        }
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.errorMessage = this.translationService.translate('object.loadError');
        this.cdr.detectChanges();
      },
    });
  }
  private tryOpenPendingReview(): void {
    if (!this.pendingOpenReviewId || !this.reviews.length) return;

    const review = this.reviews.find(r => r.id === this.pendingOpenReviewId);
    if (review) {
      this.openWriteReviewFromExisting(review);
      this.pendingOpenReviewId = null;
    } else {
      // Ako još nije učitano - pokušaj ponovo za 600ms
      setTimeout(() => this.tryOpenPendingReview(), 600);
    }
  }
  private openWriteReviewFromExisting(review: ReviewDto): void {
    this.newReview = {
      rating: review.rating,
      text: review.text || '',
      images: []
    };

    this.showWriteReviewModal = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }
  private loadNearbyObjects(currentObject: ObjectDto): void {
    if (currentObject.latitude == null || currentObject.longitude == null) {
      this.nearbyObjects = [];
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    const currentTypeGroup = this.getObjectFamily(currentObject.objectTypeName);

    this.objectService
      .getNearby(
        {
          latitude: currentObject.latitude,
          longitude: currentObject.longitude,
          radiusMeters: 5000,
          type: currentObject.objectTypeName || undefined,
          page: 1,
          pageSize: 8,
          sortOrder: 'asc',
        },
        { bypassLanguage: true },
      )
      .subscribe({
        next: (result) => {
          this.nearbyObjects = this.extractItems(result)
            .map((item) => this.normalizeObject(item))
            .filter((item) => item.id !== currentObject.id)
            .filter((item) => this.getObjectFamily(item.objectTypeName) === currentTypeGroup)
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

  private getObjectFamily(typeName?: string): string {
    const normalized = (typeName ?? '').trim().toLowerCase();
    if (
      normalized.includes('hotel') ||
      normalized.includes('resort') ||
      normalized.includes('motel') ||
      normalized.includes('apartman') ||
      normalized.includes('apartment')
    ) {
      return 'accommodation';
    }

    if (
      normalized.includes('restoran') ||
      normalized.includes('restaurant') ||
      normalized.includes('bistro') ||
      normalized.includes('konoba') ||
      normalized.includes('taverna') ||
      normalized.includes('pizzeria') ||
      normalized.includes('kafana') ||
      normalized.includes('bar') ||
      normalized.includes('cafe') ||
      normalized.includes('kafic') ||
      normalized.includes('club') ||
      normalized.includes('klub') ||
      normalized.includes('winery') ||
      normalized.includes('vinarija')
    ) {
      return 'dining';
    }

    if (normalized.includes('pump') || normalized.includes('gas') || normalized.includes('fuel')) {
      return 'fuel';
    }

    return normalized || 'other';
  }

  get showObjectPriceCard(): boolean {
    return this.getObjectPriceMode(this.object?.objectTypeName) !== 'hidden' && Number(this.object?.price ?? 0) > 0;
  }

  get usesTicketPricing(): boolean {
    return this.getObjectPriceMode(this.object?.objectTypeName) === 'ticket';
  }

  private getObjectPriceMode(typeName?: string | null): 'hidden' | 'ticket' | 'starting' {
    const normalized = this.normalizeObjectTypeName(typeName);
    if (!normalized) {
      return 'starting';
    }

    const ticketKeywords = [
      'muzej',
      'museum',
      'galerija',
      'gallery',
      'akva park',
      'aqua park',
      'aquapark',
      'zoo vrt',
      'zoo',
      'akvarijum',
      'aquarium',
      'pozoriste',
      'pozorište',
      'theatre',
      'theater',
      'bioskop',
      'cinema',
    ];

    const hiddenKeywords = [
      'benzinska pumpa',
      'gas station',
      'bolnica',
      'hospital',
      'clinic',
      'biblioteka',
      'library',
      'crkva',
      'church',
      'manastir',
      'monastery',
      'spomenik',
      'monument',
      'trzni centar',
      'tržni centar',
      'shopping centar',
      'shopping center',
      'mall',
      'trznica',
      'tržnica',
      'suvenirnica',
      'igraliste',
      'igralište',
    ];

    if (hiddenKeywords.some((keyword) => normalized.includes(this.normalizeObjectTypeName(keyword)))) {
      return 'hidden';
    }

    if (ticketKeywords.some((keyword) => normalized.includes(this.normalizeObjectTypeName(keyword)))) {
      return 'ticket';
    }

    return 'starting';
  }

  private normalizeObjectTypeName(value?: string | null): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private extractItems(
    result: PagedResultDto<ObjectDto> | Record<string, unknown> | null | undefined,
  ): ObjectDto[] {
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
  reserveNow(item: any): void {
    const website = item?.website?.trim();
    const phone = item?.phoneNumber?.trim();

    if (website) {
      const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
      window.open(url, '_blank');
      return;
    }

    if (phone) {
      window.location.href = `tel:${phone}`;
      return;
    }

    console.warn('No website or phone available');
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
      menuUrl: (dto['menuUrl'] ?? dto['MenuUrl'] ?? undefined) as string | undefined,
      cuisineType: (dto['cuisineType'] ?? dto['CuisineType'] ?? undefined) as string | undefined,
      workingHours: (dto['workingHours'] ?? dto['WorkingHours'] ?? undefined) as string | undefined,
      price: this.readOptionalNumber(dto, ['price', 'Price']) as unknown as Int16Array | undefined,
      amenities: (((dto['amenities'] ?? dto['Amenities'] ?? []) as string[]) || []) as [],
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

  private normalizeImages(images: ImageDto[]): ImageDto[] {
    return images
      .map((image) => ({
        ...image,
        url: this.resolveMediaUrl(image.url) ?? '',
      }))
      .filter((image) => !!image.url);
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

  isFavoritePending(objectId?: number | null): boolean {
    if (objectId == null) return false;
    return this.favoritePendingIds.has(objectId);
  }
  toggleFavorite(object: ObjectDto | null, event: Event): void {
    if (!object?.id) return;

    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'favorite-object',
        payload: object
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });

      return;
    }

    if (this.favoritePendingIds.has(object.id)) return;

    this.favoritePendingIds.add(object.id);

    this.favoriteStateService
      .toggle({
        type: 'object',
        entityId: object.id
      }, this.favoriteId ?? undefined)
      .subscribe({
        next: (state) => {
          this.isFavorite = state.isFavorite;
          this.favoriteId = state.favoriteId ?? null;

          if (this.object) {
            (this.object as any).isFavorite = state.isFavorite;
            (this.object as any).favoriteId = state.favoriteId;
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Favorite toggle failed:', err);
        },
        complete: () => {
          this.favoritePendingIds.delete(object.id);
          this.cdr.detectChanges();
        }
      });
  }
  private readonly handleWindowFocus = (): void => {
    this.syncFavoriteState();
  };
  private syncFavoriteState(): void {
    if (!this.object?.id || !this.authService.isLoggedIn()) {
      this.isFavorite = false;
      this.favoriteId = null;
      this.cdr.detectChanges();
      return;
    }

    this.favoriteStateService
      .loadFavorites(true)
      .pipe(catchError((err) => {
        console.error('Failed to sync object favorite state:', err);
        return of(new Map<string, number>());
      }))
      .subscribe(() => {
        const stateful = {
          isFavorite: this.isFavorite,
          favoriteId: this.favoriteId ?? undefined,
        };

        this.favoriteStateService.applyToItem(stateful, {
          type: 'object',
          entityId: this.object!.id,
        });

        this.isFavorite = stateful.isFavorite;
        this.favoriteId = stateful.favoriteId ?? null;
        this.cdr.detectChanges();
      });
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
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  
    if (returnUrl && returnUrl.startsWith('/')) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
  
    this.routerHistory.goBack('/objects');
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
  openConfirm(message: string, onConfirm: () => void): void {
    this.confirmMessage = message;
    this.confirmCallback = onConfirm;
    this.showConfirmModal = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeConfirm(): void {
    this.showConfirmModal = false;
    this.confirmCallback = null;
    document.body.style.overflow = 'visible';
  }

  confirmAction(): void {
    this.confirmCallback?.();
    this.closeConfirm();
  }

  openSuccess(message: string): void {
    this.successMessage = message;
    this.showSuccessModal = true;
    document.body.style.overflow = 'hidden';
    this.cdr.detectChanges();
  }

  closeSuccess(): void {
    this.showSuccessModal = false;
    document.body.style.overflow = 'visible';
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
    if (!this.object?.workingHours) return this.translationService.translate('object.workingHoursNotAvailable');

    try {
      const hours = JSON.parse(this.object.workingHours) as Record<string, string>;
      const today = new Date().getDay();
      const dayKeys = ['ned', 'pon', 'uto', 'sre', 'cet', 'pet', 'sub'];
      const todayKey = dayKeys[today];

      return hours[todayKey] || hours['pon'] || this.translationService.translate('object.workingHoursNotAvailable');
    } catch {
      return this.object.workingHours;
    }
  }

  formatReviewDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', year: 'numeric' });
  }

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

  openNearbyObjects(objectId: number): void {
    this.router.navigate(['/object', objectId]);
  }
  openWriteReview(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], {
        queryParams: {
          returnUrl: this.router.url,
          openReview: 'true'
        }
      });

      return;
    }

    if (this.userReview) {
      this.newReview = {
        rating: this.userReview.rating,
        text: this.userReview.text,
        images: []
      };

      this.existingReviewImages = [];

      this.imageService.getForReview(this.userReview.id).subscribe({
        next: images => {
          this.existingReviewImages = images.map(img => ({
            ...img,
            url: this.resolveMediaUrl(img.url) ?? ''
          }));

          this.cdr.detectChanges();
        },
        error: () => {
          this.existingReviewImages = [];
        }
      });
    } else {
      this.resetNewReview();
      this.existingReviewImages = [];
    }

    setTimeout(() => {
      this.showWriteReviewModal = true;
      document.body.style.overflow = 'hidden';
      this.cdr.detectChanges();
    }, 50);
  }

  closeWriteReview(): void {
    this.showWriteReviewModal = false;
    document.body.style.overflow = 'visible';
    this.resetNewReview();
    this.isSubmittingReview = false;
    this.existingReviewImages = [];
    this.selectedReviewImages = [];
    this.reviewImagePreviews = [];
  }

  private resetNewReview(): void {
    this.newReview = { rating: 0, text: '', images: [] as File[] };
  }

  setReviewRating(stars: number): void {
    this.newReview.rating = stars;
  }

  onReviewImagesSelected(event: any): void {
    const files: FileList = event.target.files;
    if (!files?.length) return;

    const maxImages = 5;
    const maxSizePerImage = 5 * 1024 * 1024; // 5MB

    const currentCount = this.existingReviewImages.length + this.selectedReviewImages.length;
    const availableSlots = maxImages - currentCount;

    if (availableSlots <= 0) {
      alert('Možete dodati najviše 5 slika.');
      event.target.value = '';
      return;
    }

    const selectedFileKeys = new Set(
      this.selectedReviewImages.map(file =>
        `${file.name}_${file.size}_${file.lastModified}`
      )
    );

    const pickedFiles = Array.from(files).slice(0, availableSlots);

    for (const file of pickedFiles) {
      const fileKey = `${file.name}_${file.size}_${file.lastModified}`;

      if (!file.type.startsWith('image/')) {
        alert(`Fajl "${file.name}" nije slika.`);
        continue;
      }

      if (file.size > maxSizePerImage) {
        alert(`Slika "${file.name}" je veća od 5MB.`);
        continue;
      }

      if (selectedFileKeys.has(fileKey)) {
        alert(`Slika "${file.name}" je već dodata.`);
        continue;
      }

      selectedFileKeys.add(fileKey);
      this.selectedReviewImages.push(file);

      const reader = new FileReader();
      reader.onload = () => {
        this.reviewImagePreviews.push(reader.result as string);
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }

    event.target.value = '';
  }

  deleteExistingReviewImage(imageId: number): void {
    console.log('klik na X', imageId);

    if (!this.userReview?.id) return;

    const reviewId = this.userReview.id;

    this.openConfirm('Da li sigurno želiš da obrišeš ovu sliku?', () => {
      console.log('potvrđeno brisanje');

      this.imageService.deleteReviewImage(reviewId, imageId).subscribe({
        next: () => {
          this.existingReviewImages =
            this.existingReviewImages.filter(img => img.id !== imageId);

          this.reviews = this.reviews.map(review => {
            if (review.id !== reviewId) return review;

            return {
              ...review,
              images: (review.images || []).filter(img => img.id !== imageId)
            };
          });

          if (this.userReview) {
            this.userReview.images =
              (this.userReview.images || []).filter(img => img.id !== imageId);
          }

          this.cdr.detectChanges();
          this.openSuccess('Slika je uspešno obrisana.');
        },
        error: (err) => {
          console.error('Failed to delete review image', err);
          this.openSuccess('Slika nije obrisana.');
        }
      });
    });
  }

  openReviewImages(review: ReviewDto): void {
    if (!review.images?.length) return;

    this.selectedReviewImagesForModal = review.images;
    this.selectedReviewImageIndex = 0;
    this.showReviewImagesModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeReviewImages(): void {
    this.showReviewImagesModal = false;
    this.selectedReviewImagesForModal = [];
    this.selectedReviewImageIndex = 0;
    document.body.style.overflow = this.showAllReviewsModal ? 'hidden' : 'visible';
  }

  nextReviewImage(): void {
    if (!this.selectedReviewImagesForModal.length) return;

    this.selectedReviewImageIndex =
      (this.selectedReviewImageIndex + 1) % this.selectedReviewImagesForModal.length;
  }

  prevReviewImage(): void {
    if (!this.selectedReviewImagesForModal.length) return;

    this.selectedReviewImageIndex =
      (this.selectedReviewImageIndex - 1 + this.selectedReviewImagesForModal.length) %
      this.selectedReviewImagesForModal.length;
  }
  private loadReviewImages(): void {
    if (!this.reviews.length) return;

    forkJoin(
      this.reviews.map(r => this.imageService.getForReview(r.id).pipe(catchError(() => of([]))))
    ).subscribe(results => {
      results.forEach((images, i) => {
        this.reviews[i].images = (images as any[]).map(img => ({
          ...img,
          url: this.resolveMediaUrl(img.url) ?? ''
        }));
      });
      this.cdr.detectChanges();
    });
  }
  removeReviewImage(index: number): void {
    this.reviewImagePreviews.splice(index, 1);
    this.selectedReviewImages.splice(index, 1);
    this.cdr.detectChanges();
  }
  submitReview(): void {
    if (this.newReview.rating === 0 || !this.newReview.text.trim() || !this.object?.id) {
      alert('Molimo unesite ocenu (1-5) i komentar.');
      return;
    }

    this.isSubmittingReview = true;

    const payload = {
      objectId: this.object.id,
      rating: this.newReview.rating,
      text: this.newReview.text.trim(),
    };

    const request$ = this.userReview
      ? this.reviewService.update(this.userReview.id, payload)
      : this.reviewService.create(payload);

    request$
      .pipe(
        finalize(() => {
          this.isSubmittingReview = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (savedReview) => {
          const wasEdit = !!this.userReview;

          if (wasEdit) {
            this.reviews = this.reviews.map(r =>
              r.id === savedReview.id
                ? {
                  ...savedReview,
                  images: this.userReview?.images || []
                }
                : r
            );

            this.userReview = {
              ...savedReview,
              images: this.userReview?.images || []
            };
          } else {
            this.reviews = [
              {
                ...savedReview,
                images: []
              },
              ...this.reviews
            ];

            this.userReview = {
              ...savedReview,
              images: []
            };

            if (this.object) {
              this.object.reviewCount = (this.object.reviewCount || 0) + 1;

              if (this.object.averageRating !== undefined) {
                const total =
                  this.object.averageRating * (this.reviews.length - 1) + savedReview.rating;

                this.object.averageRating = Number((total / this.reviews.length).toFixed(1));
              } else {
                this.object.averageRating = savedReview.rating;
              }
            }
          }

          const finish = () => {
            this.loadReviewImages();
            this.closeWriteReview();
            this.cdr.detectChanges();

            this.openSuccess(
              wasEdit
                ? 'Recenzija uspešno ažurirana!'
                : 'Recenzija uspešno poslata!'
            );
          };

          if (this.selectedReviewImages.length > 0 && savedReview?.id) {
            this.imageService.uploadReviewImages(savedReview.id, this.selectedReviewImages)
              .subscribe({
                next: () => {
                  finish();
                },
                error: (err) => {
                  console.error('Failed to upload review images', err);
                  finish();
                }
              });
          } else {
            finish();
          }
        },
        error: (err) => {
          console.error(err);
          alert('Došlo je do greške. Molimo pokušajte ponovo.');
        }
      });
  }

  protected deleteMyReview(): void {
    if (!this.userReview) return;
  
    const reviewId = this.userReview.id;
  
    this.openConfirm(this.translationService.translate('object.deleteReviewConfirm'), () => {
      this.isSubmittingReview = true;
  
      this.reviewService.delete(reviewId)
        .pipe(
          finalize(() => {
            this.isSubmittingReview = false;
            this.cdr.detectChanges();
          })
        )
        .subscribe({
          next: () => {
            this.reviews = this.reviews.filter(r => r.id !== reviewId);
            this.userReview = null;
            this.existingReviewImages = [];
            this.selectedReviewImages = [];
            this.reviewImagePreviews = [];
  
            if (this.object) {
              this.object.reviewCount = Math.max((this.object.reviewCount || 1) - 1, 0);
  
              if (this.reviews.length > 0) {
                const sum = this.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
                this.object.averageRating = Number((sum / this.reviews.length).toFixed(1));
              } else {
                this.object.averageRating = 0;
              }
            }
  
            this.closeWriteReview();
            this.openSuccess(this.translationService.translate('object.deleteReviewSuccess'));
          },
          error: (err) => {
            console.error('Failed to delete review', err);
            this.openSuccess(this.translationService.translate('object.deleteReviewError'));
          }
        });
    });
  }
}
