import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { EventService } from '../../../../services/event.service';
import { EventDto } from '../../../../models/event.model';
import { TranslationService } from '../../../../services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

interface DetailItem {
  label: string;
  value: string;
}

@Component({
  selector: 'app-event-details',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  templateUrl: './event-details.component.html',
  styleUrls: [
    './event-details.component.css',
    '../../../admin/shared/admin-page-title.css',
    '../../shared/cc-list-page-header.css'
  ]
})
export class EventDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly eventService = inject(EventService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly translationService = inject(TranslationService);

  event: EventDto | null = null;
  isLoading = true;
  errorMessage = '';

  readonly organizerNames = ['Marcus Chen', 'Elena Rodriguez'];
  readonly organizerInitials = ['MC', 'ER'];

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.errorMessage = this.translationService.translate('contentCreator.eventDetails.invalidId');
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
        this.errorMessage = error?.error?.message ?? this.translationService.translate('contentCreator.eventDetails.notFound');
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
    return this.event?.eventTypeName || this.translationService.translate('event.title');
  }

  get statusLabel(): string {
    const status = (this.event?.status ?? '').trim().toLowerCase();
    if (!status) {
      return this.translationService.translate('contentCreator.events.status.draft');
    }

    return this.translationService.translate(`contentCreator.events.status.${status}`);
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
      { label: this.translationService.translate('contentCreator.eventDetails.startDate'), value: this.formatDate(this.event.startDate) },
      { label: this.translationService.translate('contentCreator.eventDetails.endDate'), value: this.formatDate(this.event.endDate ?? this.event.startDate) },
      {
        label: this.translationService.translate('event.ticketPrice'),
        value: this.event.price ? `EUR ${this.event.price.toFixed(2)}` : this.translationService.translate('event.free')
      },
      {
        label: this.translationService.translate('contentCreator.eventDetails.capacity'),
        value: this.event.maxVisitors
          ? this.translationService.translate('contentCreator.eventDetails.guests', {
              count: this.event.maxVisitors.toLocaleString(this.translationService.currentLocale()),
            })
          : this.translationService.translate('common.notAvailable')
      }
    ];
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) {
      return this.translationService.translate('common.notAvailable');
    }

    return new Date(date).toLocaleDateString(this.translationService.currentLocale(), {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  get summary(): string {
    if (!this.event?.description) {
      return this.translationService.translate('contentCreator.eventDetails.summaryFallback');
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
