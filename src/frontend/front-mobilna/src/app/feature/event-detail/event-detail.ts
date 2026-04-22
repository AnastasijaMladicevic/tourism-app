import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';
import { EventService, EventDto } from '../../services/event';
import { ImageService, ImageDto } from '../../services/image';
import { AuthService } from '../../services/auth';
import { MapComponent } from '../../shared/components/map/map';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MapComponent, TranslatePipe],
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

  showGalleryModal = false;
  currentImageIndex = 0;

  private touchStartX = 0;
  private touchEndX = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private imageService: ImageService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private translationService: TranslationService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    forkJoin({
      event: this.eventService.getById(id),
      images: this.imageService.getForEvent(id),
    }).subscribe({
      next: ({ event, images }) => {
        this.event = event;
        this.images = images || [];
        this.mainImage = this.getMainImage(this.images);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load event details:', err);
        this.isLoading = false;
        this.errorMessage = this.translationService.translate('event.loadingError');
        this.cdr.detectChanges();
      },
    });
  }

  private getMainImage(images: ImageDto[]): string {
    if (!images.length) return '';
    const main = images.find((image) => image.isMain);
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
    return new Date(dateStr).toLocaleDateString(this.translationService.currentLocale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  goBack(): void {
    this.router.navigate(['/events']);
  }

  addToPlanner(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    alert(this.translationService.translate('event.addedToPlanner'));
  }

  buyTicket(): void {
    const price = this.event?.price
      ? `${this.event.price} €`
      : this.translationService.translate('event.free');
    alert(this.translationService.translate('event.ticketAlert', { price }));
  }

  getTicketPrice(): string {
    return this.event?.price ? `${this.event.price} €` : this.translationService.translate('event.free');
  }

  viewOnMap(): void {
    if (!this.event?.latitude || !this.event?.longitude) return;
    this.router.navigate(['/map'], {
      state: {
        lat: this.event.latitude,
        lng: this.event.longitude,
        zoom: 16,
      },
    });
  }

  openGallery(index = 0): void {
    if (!this.images.length) return;
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

  onSwipe(event: any): void {
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
}
