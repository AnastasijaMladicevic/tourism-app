import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';

import { DestinationService, DestinationDto } from '../../services/destination';
import { ImageService, ImageDto } from '../../services/image';
import { MatIconModule } from "@angular/material/icon";
import { MapComponent } from "../../shared/components/map/map";
import { environment } from '../../../environment/environment';
import { AuthService } from '../../services/auth';
import { FavoriteStateService } from '../../services/favorite-state';
import { PendingActionService } from '../../services/pending-action';
import { RouterHistoryService } from '../../services/router-history';
import { QrLinkDto, QrLinkService } from '../../services/qr-link';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-destination-detail',
  templateUrl: './destination-detail.html',
  styleUrls: ['./destination-detail.scss'],
  imports: [MatIconModule, MapComponent, TranslatePipe]
})
export class DestinationDetailComponent implements OnInit, OnDestroy {
  showGalleryModal = false;
  currentImageIndex = 0;
  destination: DestinationDto | null = null;
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
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private destinationService: DestinationService,
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
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      destination: this.destinationService.getById(id),
      images: this.imageService.getForDestination?.(id),
      qr: this.qrLinkService.getForEntity('destinations', id).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ destination, images, qr }) => {
        const normalizedDestination = this.normalizeDestination(destination);
        this.destination = normalizedDestination;
        this.qrLink = qr;
        this.images = (images || []).map((image) => ({
          ...image,
          url: this.resolveMediaUrl(image.url) ?? image.url,
        }));
        this.mainImage = this.getMainImage();
        this.syncFavoriteState();
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
  private getMainImage(): string {
    if (this.images?.length) {
      const main = this.images.find(i => i.isMain);
      return main?.url || this.images[0].url;
    }

    return this.resolveMediaUrl(this.destination?.mainImageUrl) || '';
  }

  isFavoritePending(destinationId?: number | null): boolean {
    if (destinationId == null) return false;
    return this.favoritePendingIds.has(destinationId);
  }
  toggleFavorite(destination: DestinationDto | null, event: Event): void {
    if (!destination?.id) return;

    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'favorite-object',
        payload: destination
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });

      return;
    }

    if (this.favoritePendingIds.has(destination.id)) return;

    this.favoritePendingIds.add(destination.id);

    this.favoriteStateService
      .toggle({
        type: 'destination',
        entityId: destination.id
      }, this.favoriteId ?? undefined)
      .subscribe({
        next: (state) => {
          this.isFavorite = state.isFavorite;
          this.favoriteId = state.favoriteId ?? null;

          if (this.destination) {
            (this.destination as any).isFavorite = state.isFavorite;
            (this.destination as any).favoriteId = state.favoriteId;
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Favorite toggle failed:', err);
        },
        complete: () => {
          this.favoritePendingIds.delete(destination.id);
          this.cdr.detectChanges();
        }
      });
  }
  private readonly handleWindowFocus = (): void => {
    this.syncFavoriteState();
  };
  private syncFavoriteState(): void {
    if (!this.destination?.id || !this.authService.isLoggedIn()) {
      this.isFavorite = false;
      this.favoriteId = null;
      this.cdr.detectChanges();
      return;
    }

    this.favoriteStateService
      .loadFavorites(true)
      .pipe(catchError((err) => {
        console.error('Failed to sync destination favorite state:', err);
        return of(new Map<string, number>());
      }))
      .subscribe(() => {
        const stateful = {
          isFavorite: this.isFavorite,
          favoriteId: this.favoriteId ?? undefined,
        };

        this.favoriteStateService.applyToItem(stateful, {
          type: 'destination',
          entityId: this.destination!.id,
        });

        this.isFavorite = stateful.isFavorite;
        this.favoriteId = stateful.favoriteId ?? null;
        this.cdr.detectChanges();
      });
  }

  goBack(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  
    if (returnUrl && returnUrl.startsWith('/')) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
  
    this.routerHistory.goBack('/destinations');
  }
  
  viewOnMap(): void {
    if (this.destination?.latitude == null || this.destination?.longitude == null) return;

    this.router.navigate(['/map'], {
      state: {
        lat: this.destination.latitude,
        lng: this.destination.longitude,
        zoom: 19,
        selectedItem: this.destination,
        selectedType: 'destination'
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

  private normalizeDestination(raw: DestinationDto): DestinationDto {
    const dto = raw as unknown as Record<string, unknown>;

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      displayTitle: (dto['displayTitle'] ?? dto['DisplayTitle'] ?? undefined) as string | undefined,
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      mainImageUrl: this.resolveMediaUrl(
        (dto['mainImageUrl'] ?? dto['MainImageUrl'] ?? undefined) as string | undefined,
      ),
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      distanceKm: this.readOptionalNumber(dto, ['distanceKm', 'DistanceKm']),
      averageRating: this.readOptionalNumber(dto, ['averageRating', 'AverageRating']),
      reviewCount: this.readOptionalNumber(dto, ['reviewCount', 'ReviewCount']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      status: (dto['status'] ?? dto['Status'] ?? undefined) as string | undefined,
      destinationTypeId: Number(dto['destinationTypeId'] ?? dto['DestinationTypeId'] ?? 0),
      destinationTypeName: String(
        dto['destinationTypeName'] ?? dto['DestinationTypeName'] ?? '',
      ),
      regionId: this.readOptionalNumber(dto, ['regionId', 'RegionId']),
      regionName: (dto['regionName'] ?? dto['RegionName'] ?? undefined) as string | undefined,
      regionCode: (dto['regionCode'] ?? dto['RegionCode'] ?? undefined) as string | undefined,
      images: ((dto['images'] ?? dto['Images'] ?? []) as DestinationDto['images']) || [],
      isFavorite: (dto['isFavorite'] ?? dto['IsFavorite'] ?? undefined) as boolean | undefined,
      favoriteId: this.readOptionalNumber(dto, ['favoriteId', 'FavoriteId']),
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

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) return undefined;

    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (trimmed.startsWith('/')) return `${apiBase}${trimmed}`;
    return `${apiBase}/${trimmed}`;
  }
}
