import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';
import { EventDto } from '../../../../models/event.model';

interface DetailItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-details.component.html',
  styleUrls: ['./event-details.component.css']
})
export class EventDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly cdr = inject(ChangeDetectorRef);

  event: EventDto | null = null;
  isLoading = true;
  errorMessage = '';

  readonly organizerNames = ['Marcus Chen', 'Elena Rodriguez'];
  readonly organizerInitials = ['MC', 'ER'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage = 'Invalid event id';
      this.isLoading = false;
      return;
    }

    this.eventService.getMyById(id).subscribe({
      next: (event) => {
        this.event = event;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        this.errorMessage = error?.error?.message ?? 'Event not found or you do not have permission to view it.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/content-creator/events']);
  }

  editEvent(): void {
    if (!this.event) {
      return;
    }

    this.router.navigate(['/content-creator/events/edit', this.event.id]);
  }

  get bannerUrl(): string {
    return this.normalizeImageUrl(this.event?.mainImageUrl) || '/assets/pozadina.png';
  }

  get categoryLabel(): string {
    return this.event?.eventTypeName || 'Festival';
  }

  get statusLabel(): string {
    return this.event?.status || 'Draft';
  }

  getStatusBadgeClass(status: string | undefined): string {
    switch ((status ?? '').toLowerCase()) {
      case 'approved':
      case 'published':
        return 'badge-approved';
      case 'pending':
        return 'badge-pending';
      case 'rejected':
      case 'cancelled':
        return 'badge-rejected';
      default:
        return 'badge-default';
    }
  }

  get rejectionReason(): string {
    const reason = this.event?.rejectionReason?.trim();
    if (!reason || (this.event?.status ?? '').toLowerCase() !== 'rejected') {
      return '';
    }

    return reason;
  }

  get hasRejectionReason(): boolean {
    return this.rejectionReason.length > 0;
  }

  get detailItems(): DetailItem[] {
    if (!this.event) {
      return [];
    }

    return [
      { label: 'Start date', value: this.formatDate(this.event.startDate) },
      { label: 'End date', value: this.formatDate(this.event.endDate ?? this.event.startDate) },
      { label: 'Price', value: this.event.price ? `$${this.event.price.toFixed(2)}` : 'Free' },
      { label: 'Capacity', value: this.event.maxVisitors ? `${this.event.maxVisitors.toLocaleString('en-US')} guests` : '—' }
    ];
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get summary(): string {
    if (!this.event?.description) {
      return 'This creator-facing event view summarizes the schedule, media, and organizer information in one place.';
    }

    return this.event.description;
  }

  private normalizeImageUrl(value?: string | null): string {
    const trimmed = value?.trim();

    if (!trimmed) {
      return '';
    }

    if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(trimmed)) {
      return trimmed;
    }

    try {
      return encodeURI(new URL(trimmed, document.baseURI).href);
    } catch {
      return encodeURI(trimmed);
    }
  }
}