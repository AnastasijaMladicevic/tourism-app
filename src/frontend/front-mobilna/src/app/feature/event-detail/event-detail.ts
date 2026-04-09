import { Component, OnInit, ViewEncapsulation, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { EventService, EventDto } from '../../services/event';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './event-detail.html',
  styleUrls: ['./event-detail.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class EventDetailComponent implements OnInit {
  event: EventDto | null = null;
  isLoading = true;
  errorMessage = '';
  isFavorite = false;
  pinEmoji = '\u{1F4CD}';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private eventService: EventService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.eventService.getById(id).subscribe({
      next: (ev) => {
        this.event = ev;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.errorMessage = 'Greška pri učitavanju događaja.';
        this.cdr.detectChanges();
      },
    });
  }

  toggleFavorite(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.isFavorite = !this.isFavorite;
    // TODO: kasnije pozovi favorite servis
    console.log('Favorite toggled:', this.isFavorite);
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.display = 'none';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('eu', {
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

    // TODO: kasnije prava logika za planner
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
}
