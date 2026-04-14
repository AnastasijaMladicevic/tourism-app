import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { ObjectService, ObjectDto, ObjectImageDto } from '../../services/object';
import { ImageService, ImageDto } from '../../services/image';
import { AuthService } from '../../services/auth';
import { forkJoin } from 'rxjs';

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
  mainImage = '';
  isLoading = true;
  errorMessage = '';
  isFavorite = false;

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
    console.log(`🔍 Učitavanje hotela ID: ${id}`);

    forkJoin({
      object: this.objectService.getById(id),
      images: this.imageService.getForObject(id)
    }).subscribe({
      next: ({ object, images }) => {
        console.log('✅ Hotel učitan:', object);
        console.log('✅ Slike učitane:', images.length);

        this.hotel = object;
        
        // Kombinuj embedded slike sa endpoint slikama
        const embeddedImages = object.images || [];
        this.images = [...embeddedImages, ...images];
        this.mainImage = this.getMainImage(this.images);
        
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Greška pri učitavanju:', err);
        this.isLoading = false;
        this.errorMessage = 'Greška pri učitavanju hotela.';
        this.cdr.detectChanges();
      }
    });
  }

  private getMainImage(images: (ImageDto | ObjectImageDto)[]): string {
    if (!images || images.length === 0) return '';
    const main = images.find(i => i.isMain);
    return main?.url ?? images[0].url;
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

  // === MODAL GALERIJA ===
  showGalleryModal = false;
  currentImageIndex = 0;

  openGallery(index: number = 0): void {
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

  private touchStartX = 0;
  private touchEndX = 0;

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
}
