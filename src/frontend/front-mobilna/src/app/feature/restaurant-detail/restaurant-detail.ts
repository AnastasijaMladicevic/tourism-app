import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { ObjectService } from '../../services/object';
import { ImageDto } from '../../services/image';
import { AuthService } from '../../services/auth';
import { forkJoin } from 'rxjs';
import { ReviewDto } from '../../services/review';
import { MapComponent } from '../../shared/components/map/map';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MapComponent],
  templateUrl: './restaurant-detail.html',
  styleUrls: ['./restaurant-detail.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class RestaurantDetailComponent implements OnInit {

  object: any = null;
  images: ImageDto[] = [];
  mainImage = '';
  isLoading = true;
  errorMessage = '';
  isFavorite = false;
  reviews: ReviewDto[] = [];


  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private objectService: ObjectService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
  const id = Number(this.route.snapshot.paramMap.get('id'));

  forkJoin({
    object: this.objectService.getById(id),
  }).subscribe({
    next: ({ object }) => {
      this.object = object;
      this.images = (object.images as ImageDto[]) || [];
      this.reviews = object.reviews || [];               
      this.mainImage = this.getMainImage(this.images);
      this.isLoading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error(err);
      this.isLoading = false;
      this.errorMessage = 'Greška pri učitavanju restorana.';
      this.cdr.detectChanges();
    }
  });
}

  private getMainImage(images: ImageDto[]): string {
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

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('sr-RS', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  goBack(): void {
    this.router.navigate(['/restaurants']);   // ili /objects
  }

  viewOnMap(): void {
    if (!this.object?.latitude || !this.object?.longitude) return;
    this.router.navigate(['/map'], {
      state: {
        lat: this.object.latitude,
        lng: this.object.longitude,
        zoom: 16
      }
    });
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

  // Swipe podrška (touch) - jednostavna
  onSwipe(event: any): void {
    if (event.direction === 'left') this.nextImage();
    if (event.direction === 'right') this.prevImage();
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

    // prag da ne reaguje na mali pomeraj
    if (Math.abs(delta) < 50) return;

    if (delta < 0) {
      // swipe LEFT → sledeća slika
      this.nextImage();
    } else {
      // swipe RIGHT → prethodna slika
      this.prevImage();
    }
  }
  getWorkingHours(): string {
    if (!this.object?.workingHours) return 'Radno vreme nije navedeno';

    try {
      const hours = JSON.parse(this.object.workingHours);
      const today = new Date().getDay(); // 0=ned, 1=pon...
      const dayKeys = ['ned', 'pon', 'uto', 'sre', 'cet', 'pet', 'sub'];
      const todayKey = dayKeys[today];

      return hours[todayKey] || hours['pon'] || 'Radno vreme nije navedeno';
    } catch {
      return this.object.workingHours;
    }
  }
  

  formatReviewDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('eu', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // === MODAL ZA SVE RECENZIJE ===
  showAllReviewsModal = false;
  getRatingPercentage(rating: number): number {
    if (!this.reviews || this.reviews.length === 0) return 0;

    const count = this.reviews.filter(r => Math.floor(r.rating) === rating).length;
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
}
