import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { DestinationService, DestinationDto } from '../../services/destination';
import { ImageService, ImageDto } from '../../services/image';
import { MatIconModule } from "@angular/material/icon";
import { MapComponent } from "../../shared/components/map/map";

@Component({
  selector: 'app-destination-detail',
  templateUrl: './destination-detail.html',
  styleUrls: ['./destination-detail.scss'],
  imports: [MatIconModule, MapComponent]
})
export class DestinationDetailComponent implements OnInit {
  showGalleryModal = false;
  currentImageIndex = 0;
  destination: DestinationDto | null = null;
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
    private destinationService: DestinationService,
    private cdr: ChangeDetectorRef,
    private imageService: ImageService
    
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    
    forkJoin({
      destination: this.destinationService.getById(id),
      images: this.imageService.getForDestination?.(id)
    }).subscribe({
      next: ({ destination, images }) => {
        this.destination = destination;
        this.images = images || [];
        this.mainImage = this.getMainImage();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load destination';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  private getMainImage(): string {
    if (this.images?.length) {
      const main = this.images.find(i => i.isMain);
      return main?.url || this.images[0].url;
    }

    return this.destination?.mainImageUrl || '';
  }

  toggleFavorite(): void {
    this.isFavorite = !this.isFavorite;
  }

  goBack(): void {
    this.router.navigate(['/destinations']);
  }

  viewOnMap(): void {
    if (!this.destination?.latitude || !this.destination?.longitude) return;

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
}