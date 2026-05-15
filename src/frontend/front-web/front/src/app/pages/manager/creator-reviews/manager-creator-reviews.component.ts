import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export interface ManagerReviewThread {
  id: number;
  touristName: string;
  touristInitials: string;
  objectId: number;
  objectName: string;
  localityName: string;
  creatorId: number;
  creatorName: string;
  creatorEmail: string;
  rating: number;
  touristReview: string;
  createdAt: string;
  creatorResponse?: string | null;
  creatorResponseAt?: string | null;
}

@Component({
  selector: 'app-manager-creator-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manager-creator-reviews.component.html',
  styleUrls: ['./manager-creator-reviews.component.css'],
})
export class ManagerCreatorReviewsComponent {
  readonly managedDestination = 'Kotor Bay';

  /** Mock data — replace with filtered API for manager destination objects. */
  readonly allThreads: ManagerReviewThread[] = [
    {
      id: 5012,
      touristName: 'Elena Horvat',
      touristInitials: 'EH',
      objectId: 88,
      objectName: 'Hotel Aurora',
      localityName: 'Perast',
      creatorId: 201,
      creatorName: 'Marko Petrović',
      creatorEmail: 'marko.p@example.com',
      rating: 2,
      touristReview:
        'Room was fine but staff seemed dismissive when we asked about parking. Expected clearer info on the listing.',
      createdAt: '2026-05-12T16:40:00Z',
      creatorResponse:
        'Maybe you should read the listing next time instead of complaining. Not our problem if tourists cannot follow basic instructions.',
      creatorResponseAt: '2026-05-12T18:05:00Z',
    },
    {
      id: 5008,
      touristName: 'James Miller',
      touristInitials: 'JM',
      objectId: 92,
      objectName: 'Bay View Apartments',
      localityName: 'Kotor',
      creatorId: 201,
      creatorName: 'Marko Petrović',
      creatorEmail: 'marko.p@example.com',
      rating: 4,
      touristReview: 'Great location and clean rooms. Would visit again.',
      createdAt: '2026-05-10T11:20:00Z',
      creatorResponse:
        'Thank you for your kind words, James. We are glad you enjoyed the stay and hope to welcome you again.',
      creatorResponseAt: '2026-05-10T14:00:00Z',
    },
    {
      id: 4991,
      touristName: 'Sofia Rossi',
      touristInitials: 'SR',
      objectId: 105,
      objectName: 'Olive Garden Restaurant',
      localityName: 'Risan',
      creatorId: 202,
      creatorName: 'Jelena Vuković',
      creatorEmail: 'jelena.v@example.com',
      rating: 3,
      touristReview: 'Food was good but wait time was long on Saturday evening.',
      createdAt: '2026-05-08T20:15:00Z',
      creatorResponse: null,
      creatorResponseAt: null,
    },
    {
      id: 4975,
      touristName: 'Anna Berg',
      touristInitials: 'AB',
      objectId: 88,
      objectName: 'Hotel Aurora',
      localityName: 'Perast',
      creatorId: 201,
      creatorName: 'Marko Petrović',
      creatorEmail: 'marko.p@example.com',
      rating: 1,
      touristReview: 'Misleading photos — pool area was under renovation and not mentioned anywhere.',
      createdAt: '2026-05-05T09:00:00Z',
      creatorResponse: null,
      creatorResponseAt: null,
    },
  ];

  searchTerm = '';
  responseFilter: 'all' | 'responded' | 'pending' | 'concerning' = 'all';
  creatorFilter: 'all' | number = 'all';
  selectedRatings: number[] = [];

  selectedThread: ManagerReviewThread | null = this.allThreads[0];

  get creatorOptions(): { id: number; name: string }[] {
    const map = new Map<number, string>();
    for (const t of this.allThreads) {
      map.set(t.creatorId, t.creatorName);
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }

  get filteredThreads(): ManagerReviewThread[] {
    const q = this.searchTerm.trim().toLowerCase();
    return this.allThreads.filter((thread) => {
      if (this.creatorFilter !== 'all' && thread.creatorId !== this.creatorFilter) {
        return false;
      }
      if (this.selectedRatings.length && !this.selectedRatings.includes(thread.rating)) {
        return false;
      }
      if (this.responseFilter === 'responded' && !thread.creatorResponse?.trim()) {
        return false;
      }
      if (this.responseFilter === 'pending' && thread.creatorResponse?.trim()) {
        return false;
      }
      if (this.responseFilter === 'concerning' && !this.isConcerning(thread)) {
        return false;
      }
      if (
        q &&
        !thread.touristName.toLowerCase().includes(q) &&
        !thread.objectName.toLowerCase().includes(q) &&
        !thread.creatorName.toLowerCase().includes(q) &&
        !thread.touristReview.toLowerCase().includes(q) &&
        !(thread.creatorResponse?.toLowerCase().includes(q) ?? false)
      ) {
        return false;
      }
      return true;
    });
  }

  get stats() {
    const concerning = this.allThreads.filter((t) => this.isConcerning(t)).length;
    const noResponse = this.allThreads.filter((t) => !t.creatorResponse?.trim()).length;
    return { concerning, noResponse, total: this.allThreads.length };
  }

  isConcerning(thread: ManagerReviewThread): boolean {
    if (!thread.creatorResponse?.trim()) {
      return false;
    }
    const text = thread.creatorResponse.toLowerCase();
    const flags = ['not our problem', 'your fault', 'read the listing', 'cannot follow', 'complaining'];
    return flags.some((f) => text.includes(f)) || (thread.rating <= 2 && text.length > 0);
  }

  isRatingSelected(rating: number): boolean {
    return this.selectedRatings.includes(rating);
  }

  toggleRating(rating: number): void {
    if (this.isRatingSelected(rating)) {
      this.selectedRatings = this.selectedRatings.filter((r) => r !== rating);
    } else {
      this.selectedRatings = [...this.selectedRatings, rating];
    }
  }

  selectAllRatings(): void {
    this.selectedRatings = [];
  }

  get isAllRatingsSelected(): boolean {
    return this.selectedRatings.length === 0;
  }

  onFilterChange(): void {
    if (this.selectedThread && !this.filteredThreads.some((t) => t.id === this.selectedThread!.id)) {
      this.selectedThread = this.filteredThreads[0] ?? null;
    }
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.responseFilter = 'all';
    this.creatorFilter = 'all';
    this.selectedRatings = [];
    this.onFilterChange();
  }

  selectThread(thread: ManagerReviewThread): void {
    this.selectedThread = thread;
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  ratingStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  reportLinkQuery(thread: ManagerReviewThread): Record<string, string> {
    return { creatorId: String(thread.creatorId) };
  }

  trackByThreadId(_: number, thread: ManagerReviewThread): number {
    return thread.id;
  }
}
