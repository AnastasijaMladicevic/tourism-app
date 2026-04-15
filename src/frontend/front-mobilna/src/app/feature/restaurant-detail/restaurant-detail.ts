import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { ObjectService } from '../../services/object';
import { ImageService, ImageDto } from '../../services/image';
import { AuthService } from '../../services/auth';
import { forkJoin } from 'rxjs';
import { ReviewService, ReviewDto } from '../../services/review';

@Component({
  selector: 'app-restaurant-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
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
    private imageService: ImageService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
  const id = Number(this.route.snapshot.paramMap.get('id'));

  forkJoin({
    object: this.objectService.getById(id),
    images: this.imageService.getForObject(id),
    // reviews: this.reviewService.getForObject(id)   
  }).subscribe({
    next: ({ object, images, /*reviews*/ }) => {
      this.object = object;
      this.images = images || [];
      // this.reviews = reviews || [];               
      this.mainImage = this.getMainImage(images);
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
    const lat = this.object.latitude;
    const lng = this.object.longitude;
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
  

  openAllReviews(): void {
    this.router.navigate(['/reviews', this.object.id]);
  }

  openWriteReview(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    // Otvori modal ili stranicu za pisanje recenzije
    alert('Otvaram formu za pisanje recenzije');
  }

  formatReviewDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short', year: 'numeric' });
  }
}