import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { LocalityService, LocalityDto, PagedLocalityResultDto } from '../../services/locality';
import { ImageService, ImageDto } from '../../services/image';
import { MatIconModule } from "@angular/material/icon";
import { MapComponent } from "../../shared/components/map/map";
import { environment } from '../../../environment/environment';

@Component({
  selector: 'app-locality-detail',
  imports: [MatIconModule, MapComponent],
  templateUrl: './locality-detail.html',
  styleUrl: './locality-detail.scss',
})
export class LocalityDetailComponent implements OnInit{
   showGalleryModal = false;
    currentImageIndex = 0;
    locality: LocalityDto | null = null;
    nearbyLocalities: LocalityDto[] = [];
    images: ImageDto[] = [];
    mainImage = '';
  
    isLoading = true;
    errorMessage = '';
  
    isFavorite = false;
    private touchStartX = 0;
    private touchEndX = 0;
    constructor(
      private route: ActivatedRoute,
      private router: Router,
      private localityService: LocalityService,
      private cdr: ChangeDetectorRef,
      private imageService: ImageService
      
    ) {}
  
    ngOnInit(): void {
      const id = Number(this.route.snapshot.paramMap.get('id'));
      
      forkJoin({
        locality: this.localityService.getById(id),
        images: this.imageService.getForLocality?.(id)
      }).subscribe({
        next: ({ locality, images }) => {
          const normalizedLocality = this.normalizeLocality(locality)
          this.locality = locality;
          this.images = images || [];
          this.mainImage = this.getMainImage();
          this.isLoading = false;
          this.loadNearbyLocalities(normalizedLocality);
          this.cdr.detectChanges();
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
    this.router.navigate(['/Locality', LocalityId]);
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
  
    toggleFavorite(): void {
      this.isFavorite = !this.isFavorite;
    }
  
    goBack(): void {
      this.router.navigate(['/localities']);
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
