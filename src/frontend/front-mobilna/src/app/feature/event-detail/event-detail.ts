import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { EventService, EventDto } from '../../services/event';
import { ImageService, ImageDto } from '../../services/image';
import { AuthService } from '../../services/auth';
import { forkJoin } from 'rxjs';
import { MapComponent } from '../../shared/components/map/map';


@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MapComponent],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class EventDetailComponent implements OnInit {
  event: EventDto | null = null;
  images: ImageDto[] = [];
  mainImage = '';
  isLoading = true;
  errorMessage = '';
  isFavorite = false;
  pinEmoji = '\u{1F4CD}';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private imageService: ImageService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
  const id = Number(this.route.snapshot.paramMap.get('id'));
  console.log(`🔍 Učitavanje eventa ID: ${id}`);

  forkJoin({
    event: this.eventService.getById(id),
    images: this.imageService.getForEvent(id)
  }).subscribe({
    next: ({ event, images }) => {
      console.log('✅ Event učitan:', event);
      console.log('✅ Slike učitane:', images.length);

      this.event = event;
      this.images = images || [];
      this.mainImage = this.getMainImage(this.images);
      
      this.isLoading = false;
      this.cdr.detectChanges();
    },
    error: (err) => {
      console.error('❌ Greška pri učitavanju:', err);
      this.isLoading = false;
      this.errorMessage = 'Greška pri učitavanju događaja.';
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
      year: 'numeric',
    });
  }

  goBack(): void { this.router.navigate(['/events']); }

  addToPlanner(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    alert('Događaj je dodat u Planner');
  }

  buyTicket(): void {
    const price = this.event?.price ? `${this.event.price} €` : 'Besplatno';
    alert(`Kupovina karte - Cena: ${price}`);
  }

  viewOnMap(): void {
    if (!this.event?.latitude || !this.event?.longitude) return;
    const lat = this.event.latitude;
    const lng = this.event.longitude;
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
}