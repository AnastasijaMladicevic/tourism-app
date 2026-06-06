import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { LocalityService, LocalityDto, PagedLocalityResultDto } from '../../services/locality';
import { ImageService, ImageDto } from '../../services/image';
import { MatIconModule } from "@angular/material/icon";
import { MapComponent } from "../../shared/components/map/map";
import { environment } from '../../../environment/environment';
import { AuthService } from '../../services/auth';
import { FavoriteStateService } from '../../services/favorite-state';
import { PendingActionService } from '../../services/pending-action';
import { RouterHistoryService } from '../../services/router-history';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { QrLinkDto, QrLinkService } from '../../services/qr-link';

@Component({
  selector: 'app-locality-detail',
  imports: [MatIconModule, MapComponent, TranslatePipe],
  templateUrl: './locality-detail.html',
  styleUrl: './locality-detail.scss',
})
export class LocalityDetailComponent implements OnInit, OnDestroy {
  showGalleryModal = false;
  currentImageIndex = 0;
  locality: LocalityDto | null = null;
  nearbyLocalities: LocalityDto[] = [];
  images: ImageDto[] = [];
  mainImage = '';

  isLoading = true;
  errorMessage = '';
  qrLink: QrLinkDto | null = null;

  titleVisible = true;
  private titleObserver?: IntersectionObserver;
  private observerSetup = false;
  isFavorite = false;
  favoriteId: number | null = null;
  private favoritePendingIds = new Set<number>();
  private touchStartX = 0;
  private touchEndX = 0;
  private readonly destroy$ = new Subject<void>();
  private readonly handleFavoriteObject = (event: any): void => {
    const obj = event.detail;
    if (obj) { this.toggleFavorite(obj, new Event('click')); }
  };
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private localityService: LocalityService,
    private cdr: ChangeDetectorRef,
    private imageService: ImageService,
    private authService: AuthService,
    private favoriteStateService: FavoriteStateService,
    private pendingActionService: PendingActionService,
    private routerHistory: RouterHistoryService,
    private qrLinkService: QrLinkService,
    private el: ElementRef
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = Number(params.get('id'));

      if (!id) return;

      this.loadLocality(id);
    });
    window.addEventListener('focus', this.handleWindowFocus);
    window.addEventListener('favorite-object', this.handleFavoriteObject);
    this.cdr.detectChanges();
  }
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('focus', this.handleWindowFocus);
    window.removeEventListener('favorite-object', this.handleFavoriteObject);
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

  private loadLocality(id: number): void {
    this.isLoading = true;

    forkJoin({
      locality: this.localityService.getById(id),
      images: this.imageService.getForLocality?.(id),
      qr: this.qrLinkService.getForEntity('localities', id).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ locality, images, qr }) => {
        const normalized = this.normalizeLocality(locality);

        this.locality = locality;
        this.qrLink = qr;
        this.images = images || [];
        this.mainImage = this.getMainImage();

        this.syncFavoriteState();
        this.loadNearbyLocalities(normalized);

        this.isLoading = false;
        this.cdr.detectChanges();
        this.setupTitleObserver();
      },
      error: () => {
        this.errorMessage = 'Failed to load destination';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
  private loadNearbyLocalities(currentLocality: LocalityDto): void {
    if (currentLocality.latitude == null || currentLocality.longitude == null) {
      this.nearbyLocalities = [];
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.localityService
      .getNearby({
        latitude: currentLocality.latitude,
        longitude: currentLocality.longitude,
        radiusMeters: 5000,
        page: 1,
        pageSize: 6,
        sortOrder: 'asc',
      })
      .subscribe({
        next: (result) => {
          this.nearbyLocalities = this.extractItems(result)
            .map((item) => this.normalizeLocality(item))
            .filter((item) => item.id !== currentLocality.id)
            .slice(0, 3);

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load nearby localities:', err);
          this.nearbyLocalities = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }
  private normalizeLocality(raw: LocalityDto): LocalityDto {
    const dto = raw as unknown as Record<string, unknown>;

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      mainImageUrl: (dto['mainImageUrl'] ?? dto['MainImageUrl'] ?? undefined) as string | undefined,
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      distanceMeters: this.readOptionalNumber(dto, ['distanceMeters', 'DistanceMeters']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      localityTypeId: Number(dto['LocalityTypeId'] ?? dto['LocalityTypeId'] ?? 0),
      localityTypeName: String(dto['LocalityTypeName'] ?? dto['LocalityTypeName'] ?? ''),
      destinationName: String(dto['destinationName'] ?? dto['DestinationName'] ?? ''),
      images: ((dto['images'] ?? dto['Images'] ?? []) as LocalityDto['images']) || [],
      createdByUserId: Number(dto['createdByUserId'] ?? 0),
      createdAt: String(dto['createdAt'] ?? ''),
      destinationId: Number(dto['destinationId'] ?? 0),
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
  private extractItems(result: PagedLocalityResultDto<LocalityDto> | Record<string, unknown> | null | undefined): LocalityDto[] {
    if (!result || typeof result !== 'object') {
      return [];
    }

    const raw = result as Record<string, unknown>;
    const candidates = [raw['items'], raw['Items'], raw['data'], raw['Data'], raw['results'], raw['Results']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as LocalityDto[];
      }
    }

    return [];
  }
  openNearbyLocality(LocalityId: number): void {
    this.router.navigate(['/locality', LocalityId]);
  }
  getNearbyLocalityImage(Locality: LocalityDto): string | undefined {
    return this.resolveMediaUrl(Locality.mainImageUrl);
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

  private getMainImage(): string {
    if (this.images?.length) {
      const main = this.images.find(i => i.isMain);
      return main?.url || this.images[0].url;
    }

    return this.locality?.mainImageUrl || '';
  }

  isFavoritePending(localityId?: number | null): boolean {
    if (localityId == null) return false;
    return this.favoritePendingIds.has(localityId);
  }
  toggleFavorite(locality: LocalityDto | null, event: Event): void {
    if (!locality?.id) return;

    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'favorite-object',
        payload: locality
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });

      return;
    }

    if (this.favoritePendingIds.has(locality.id)) return;

    this.favoritePendingIds.add(locality.id);

    this.favoriteStateService
      .toggle({
        type: 'locality',
        entityId: locality.id
      }, this.favoriteId ?? undefined)
      .subscribe({
        next: (state) => {
          this.isFavorite = state.isFavorite;
          this.favoriteId = state.favoriteId ?? null;

          if (this.locality) {
            (this.locality as any).isFavorite = state.isFavorite;
            (this.locality as any).favoriteId = state.favoriteId;
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Favorite toggle failed:', err);
        },
        complete: () => {
          this.favoritePendingIds.delete(locality.id);
          this.cdr.detectChanges();
        }
      });
  }
  private readonly handleWindowFocus = (): void => {
    this.syncFavoriteState();
  };
  private syncFavoriteState(): void {
    if (!this.locality?.id || !this.authService.isLoggedIn()) {
      this.isFavorite = false;
      this.favoriteId = null;
      this.cdr.detectChanges();
      return;
    }

    this.favoriteStateService
      .loadFavorites(true)
      .pipe(catchError((err) => {
        console.error('Failed to sync locality favorite state:', err);
        return of(new Map<string, number>());
      }))
      .subscribe(() => {
        const stateful = {
          isFavorite: this.isFavorite,
          favoriteId: this.favoriteId ?? undefined,
        };

        this.favoriteStateService.applyToItem(stateful, {
          type: 'locality',
          entityId: this.locality!.id,
        });

        this.isFavorite = stateful.isFavorite;
        this.favoriteId = stateful.favoriteId ?? null;
        this.cdr.detectChanges();
      });
  }

  goBack(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  
    if (returnUrl?.startsWith('/')) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
  
    this.routerHistory.goBack('/localities');
  }

  viewOnMap(): void {
    if (!this.locality?.latitude || !this.locality?.longitude) return;

    this.router.navigate(['/map'], {
      state: {
        lat: this.locality.latitude,
        lng: this.locality.longitude,
        zoom: 19,
        selectedItem: this.locality,
        selectedType: 'locality'
      }
    });
  }
  openGallery(index = 0): void {
    if (!this.images.length) return;
    this.currentImageIndex = index;
    this.showGalleryModal = true;
    document.body.style.overflow = 'hidden';
  }
  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }
  closeGallery(): void {
    this.showGalleryModal = false;
    document.body.style.overflow = 'visible';
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
  nextImage(): void {
    if (!this.images.length) return;
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
  }
  prevImage(): void {
    if (!this.images.length) return;
    this.currentImageIndex = (this.currentImageIndex - 1 + this.images.length) % this.images.length;
  }
}
