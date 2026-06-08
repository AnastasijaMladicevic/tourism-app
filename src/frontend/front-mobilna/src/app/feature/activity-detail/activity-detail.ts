import { ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ActivityService, ActivityDto, PagedActivityResultDto } from '../../services/activity';
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
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-activity-detail',
  imports: [MatIconModule, MapComponent, TranslatePipe],
  templateUrl: './activity-detail.html',
  styleUrl: './activity-detail.scss',
})
export class ActivityDetailComponent implements OnInit, OnDestroy {
  showGalleryModal = false;
  currentImageIndex = 0;
  activity: ActivityDto | null = null;
  nearbyActivities: ActivityDto[] = [];
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
    private activityService: ActivityService,
    private cdr: ChangeDetectorRef,
    private imageService: ImageService,
    private authService: AuthService,
    private favoriteStateService: FavoriteStateService,
    private pendingActionService: PendingActionService,
    private routerHistory: RouterHistoryService,
    private qrLinkService: QrLinkService,
    private translationService: TranslationService,
    private el: ElementRef
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = Number(params.get('id'));

      if (!id) return;

      this.loadActivity(id);
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

  private loadActivity(id: number): void {
    this.isLoading = true;

    forkJoin({
      activity: this.activityService.getById(id),
      images: this.imageService.getForActivity?.(id),
      qr: this.qrLinkService.getForEntity('activities', id).pipe(catchError(() => of(null)))
    }).subscribe({
      next: ({ activity, images, qr }) => {
        const normalized = this.normalizeActivity(activity);

        this.activity = normalized;
        this.qrLink = qr;
        this.images = images || [];
        this.mainImage = this.getMainImage();

        this.syncFavoriteState();
        this.loadNearbyActivities(normalized);

        this.isLoading = false;
        this.cdr.detectChanges();
        this.setupTitleObserver();
      },
      error: () => {
        this.errorMessage = 'Failed to load activity';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
  private loadNearbyActivities(currentActivity: ActivityDto): void {
    if (currentActivity.latitude == null || currentActivity.longitude == null) {
      this.nearbyActivities = [];
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.activityService
      .getNearby({
        latitude: currentActivity.latitude,
        longitude: currentActivity.longitude,
        radiusMeters: 5000,
        page: 1,
        pageSize: 6,
        sortOrder: 'asc',
      })
      .subscribe({
        next: (result) => {
          this.nearbyActivities = this.extractItems(result)
            .map((item) => this.normalizeActivity(item))
            .filter((item) => item.id !== currentActivity.id)
            .slice(0, 3);

          this.isLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load nearby Activitys:', err);
          this.nearbyActivities = [];
          this.isLoading = false;
          this.cdr.detectChanges();
        },
      });
  }
  private normalizeActivity(raw: ActivityDto): ActivityDto {
    const dto = raw as unknown as Record<string, unknown>;

    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      mainImageUrl: (dto['mainImageUrl'] ?? dto['MainImageUrl'] ?? undefined) as string | undefined,
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      distanceMeters: this.readOptionalNumber(dto, ['distanceMeters', 'DistanceMeters']),
      price: this.readOptionalNumber(dto, ['price', 'Price']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      status: String(dto['status'] ?? dto['Status'] ?? ''),
      activityTypeId: Number(dto['ActivityTypeId'] ?? dto['ActivityTypeId'] ?? 0),
      activityTypeName: String(dto['ActivityTypeName'] ?? dto['ActivityTypeName'] ?? ''),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? undefined) as string | undefined,
      destinationName: (dto['destinationName'] ?? dto['DestinationName'] ?? undefined) as string | undefined,
      objectId: this.readOptionalNumber(dto, ['objectId', 'ObjectId']),
      objectName: (dto['objectName'] ?? dto['ObjectName'] ?? undefined) as string | undefined,
      images: ((dto['images'] ?? dto['Images'] ?? []) as ActivityDto['images']) || [],
      createdByUserId: Number(dto['createdByUserId'] ?? 0),
      createdAt: String(dto['createdAt'] ?? ''),
      updatedAt: String(dto['updatedAt'] ?? '')
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
  private extractItems(result: PagedActivityResultDto<ActivityDto> | Record<string, unknown> | null | undefined): ActivityDto[] {
    if (!result || typeof result !== 'object') {
      return [];
    }

    const raw = result as Record<string, unknown>;
    const candidates = [raw['items'], raw['Items'], raw['data'], raw['Data'], raw['results'], raw['Results']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate as ActivityDto[];
      }
    }

    return [];
  }
  openNearbyActivity(activityId: number): void {
    this.router.navigate(['/activity', activityId]);
  }

  getActivityTypeIcon(typeName: string): string {
    const t = (typeName || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (t.includes('gastro') || t.includes('hrana') || t.includes('food') || t.includes('kulinar') || t.includes('degustac')) return 'restaurant';
    if (t.includes('plivanje') || t.includes('swim') || t.includes('bazen') || t.includes('voda') || t.includes('water')) return 'pool';
    if (t.includes('pješ') || t.includes('pjes') || t.includes('hiking') || t.includes('trek') || t.includes('planin')) return 'hiking';
    if (t.includes('bicikl') || t.includes('cycling') || t.includes('bike')) return 'directions_bike';
    if (t.includes('kajak') || t.includes('kayak') || t.includes('veslan') || t.includes('rowing')) return 'rowing';
    if (t.includes('fudbal') || t.includes('football') || t.includes('soccer')) return 'sports_soccer';
    if (t.includes('tenis') || t.includes('tennis')) return 'sports_tennis';
    if (t.includes('sport') || t.includes('fitnes') || t.includes('gym')) return 'fitness_center';
    if (t.includes('muzik') || t.includes('music') || t.includes('ples') || t.includes('dance')) return 'music_note';
    if (t.includes('kultura') || t.includes('culture') || t.includes('muzej') || t.includes('museum')) return 'museum';
    if (t.includes('foto') || t.includes('photo')) return 'photo_camera';
    if (t.includes('more') || t.includes('sea') || t.includes('ocean') || t.includes('ribolov') || t.includes('fish')) return 'waves';
    if (t.includes('adrenali') || t.includes('adrenalin') || t.includes('xtreme') || t.includes('skydiv')) return 'bolt';
    return 'local_activity';
  }
  getNearbyActivityImage(activity: ActivityDto): string | undefined {
    return this.resolveMediaUrl(activity.mainImageUrl);
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

    return this.activity?.mainImageUrl || '';
  }

  getParticipationFee(): string {
    return this.activity?.price != null && this.activity.price > 0
      ? `${this.activity.price} €`
      : this.translationService.translate('activity.free');
  }

  isFavoritePending(activityId?: number | null): boolean {
    if (activityId == null) return false;
    return this.favoritePendingIds.has(activityId);
  }
  toggleFavorite(activity: ActivityDto | null, event: Event): void {
    if (!activity?.id) return;

    event.preventDefault();
    event.stopPropagation();

    if (!this.authService.isLoggedIn()) {
      this.pendingActionService.setAction({
        type: 'favorite-object',
        payload: activity
      });

      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url }
      });

      return;
    }

    if (this.favoritePendingIds.has(activity.id)) return;

    this.favoritePendingIds.add(activity.id);

    this.favoriteStateService
      .toggle({
        type: 'activity',
        entityId: activity.id
      }, this.favoriteId ?? undefined)
      .subscribe({
        next: (state) => {
          this.isFavorite = state.isFavorite;
          this.favoriteId = state.favoriteId ?? null;

          if (this.activity) {
            (this.activity as any).isFavorite = state.isFavorite;
            (this.activity as any).favoriteId = state.favoriteId;
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Favorite toggle failed:', err);
        },
        complete: () => {
          this.favoritePendingIds.delete(activity.id);
          this.cdr.detectChanges();
        }
      });
  }

  private syncFavoriteState(): void {
    if (!this.activity?.id || !this.authService.isLoggedIn()) {
      this.isFavorite = false;
      this.favoriteId = null;
      this.cdr.detectChanges();
      return;
    }

    this.favoriteStateService
      .loadFavorites(true)
      .pipe(catchError((err) => {
        console.error('Failed to sync activity favorite state:', err);
        return of(new Map<string, number>());
      }))
      .subscribe(() => {
        const stateful = {
          isFavorite: this.isFavorite,
          favoriteId: this.favoriteId ?? undefined,
        };

        this.favoriteStateService.applyToItem(stateful, {
          type: 'activity',
          entityId: this.activity!.id,
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
    
    this.routerHistory.goBack('/activities');
  }

  viewOnMap(): void {
    if (!this.activity?.latitude || !this.activity?.longitude) return;

    this.router.navigate(['/map'], {
      state: {
        lat: this.activity.latitude,
        lng: this.activity.longitude,
        zoom: 19,
        selectedItem: this.activity,
        selectedType: 'activity'
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

  private readonly handleWindowFocus = (): void => {
    this.syncFavoriteState();
  };
}
