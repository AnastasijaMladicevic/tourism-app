import {
  Component, OnInit, ViewEncapsulation, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin } from 'rxjs';
import { DestinationService, DestinationDto } from '../../services/destination';
import { FavoriteService } from '../../services/favorite';
import { DestinationTypeService, DestinationTypeDto } from '../../services/destination-type';
import { AuthService } from '../../services/auth';

export interface DestinationView extends DestinationDto {
  isFavorite: boolean;
  favoriteId?: number;
}

// ─── MOCK DATA — obriši kad backend bude spreman ──────────────────────────────
const MOCK_TYPES: DestinationTypeDto[] = [
  { id: 1, name: 'History' },
  { id: 2, name: 'Nature' },
  { id: 3, name: 'Culture' },
];

const MOCK_DESTINATIONS: DestinationView[] = [
  {
    id: 2, name: 'Our Lady of the Rocks',
    description: 'A stunning island church built on an artificially created islet in the Bay of Kotor.',
    distanceKm: 12, averageRating: 4.7, reviewCount: 890,
    isActive: true, destinationTypeId: 1, destinationTypeName: 'History',
    images: [{ id: 2, url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', altText: 'Our Lady of the Rocks', isMain: true }],
    isFavorite: true,
  },
  {
    id: 3, name: 'Lovćen National Park',
    description: 'A stunning mountain park offering panoramic views over Montenegro and the Adriatic Sea.',
    distanceKm: 18, averageRating: 4.8, reviewCount: 650,
    isActive: true, destinationTypeId: 2, destinationTypeName: 'Nature',
    images: [{ id: 3, url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800', altText: 'Lovćen', isMain: true }],
    isFavorite: false,
  },
  {
    id: 4, name: 'Budva Old Town',
    description: 'A vibrant coastal town with a beautiful medieval old town, sandy beaches and lively Mediterranean nightlife.',
    distanceKm: 22, averageRating: 4.6, reviewCount: 2100,
    isActive: true, destinationTypeId: 3, destinationTypeName: 'Culture',
    images: [{ id: 4, url: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800', altText: 'Budva', isMain: true }],
    isFavorite: false,
  },
  {
    id: 5, name: 'Sveti Stefan',
    description: 'An iconic islet village turned luxury resort, connected to the mainland by a narrow causeway.',
    distanceKm: 35, averageRating: 4.5, reviewCount: 1800,
    isActive: true, destinationTypeId: 3, destinationTypeName: 'Culture',
    images: [{ id: 5, url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800', altText: 'Sveti Stefan', isMain: true }],
    isFavorite: false,
  },
  {
    id: 6, name: 'Biogradska Gora',
    description: 'One of the last primeval forests in Europe, home to Lake Biograd and untouched wilderness.',
    distanceKm: 90, averageRating: 4.9, reviewCount: 430,
    isActive: true, destinationTypeId: 2, destinationTypeName: 'Nature',
    images: [{ id: 6, url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800', altText: 'Biogradska Gora', isMain: true }],
    isFavorite: false,
  },
];
// ─── KRAJ MOCK DATA ───────────────────────────────────────────────────────────

// Kada backend bude spreman:
// 1. Obriši MOCK_TYPES i MOCK_DESTINATIONS blok iznad
// 2. U loadData() odkomentariši BACKEND blok i zakomentariši MOCK blok

@Component({
  selector: 'app-attractions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './attractions.html',
  styleUrls: ['./attractions.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class AttractionsComponent implements OnInit {

  searchQuery = '';
  activeFilter = 'All';
  sortOption: 'rating' | 'az' | 'za' | 'distance' = 'rating';
  showSortMenu = false;
  isLoading = false;
  errorMessage = '';

  destinationTypes: DestinationTypeDto[] = [];
  destinations: DestinationView[] = [];

  constructor(
    private router: Router,
    private destinationService: DestinationService,
    private favoriteService: FavoriteService,
    private destinationTypeService: DestinationTypeService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // ── MOCK — zakomentariši ovaj blok kad backend bude spreman ────────────
    this.isLoading = false;
    this.destinationTypes = MOCK_TYPES;
    this.destinations = MOCK_DESTINATIONS;
    // ── KRAJ MOCK ───────────────────────────────────────────────────────────

    // ── BACKEND — odkomentariši ovaj blok kad backend bude spreman ─────────
    // this.destinationTypeService.getAll().subscribe({
    //   next: types => this.destinationTypes = types,
    //   error: () => this.destinationTypes = [],
    // });
    //
    // forkJoin({
    //   destinations: this.destinationService.getAll(),
    //   favorites: this.favoriteService.getMyFavorites(),
    // }).subscribe({
    //   next: ({ destinations, favorites }) => {
    //     this.isLoading = false;
    //     const favMap = new Map<number, number>();
    //     favorites.forEach(f => {
    //       if (f.destinationId) favMap.set(f.destinationId, f.id);
    //     });
    //     this.destinations = destinations.map(d => ({
    //       ...d,
    //       isFavorite: favMap.has(d.id),
    //       favoriteId: favMap.get(d.id),
    //     }));
    //   },
    //   error: err => {
    //     this.isLoading = false;
    //     this.errorMessage = 'Failed to load attractions.';
    //     console.error(err);
    //   },
    // });
    // ── KRAJ BACKEND ────────────────────────────────────────────────────────
  }

  // ── Close sort menu on outside click ──────────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    const target = e.target as HTMLElement;
    if (!target.closest('.sort-anchor')) this.showSortMenu = false;
  }

  // ── Filtering & sorting ────────────────────────────────────────────────────
  get filtered(): DestinationView[] {
    let list = [...this.destinations];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(d => d.name.toLowerCase().includes(q));
    }

    if (this.activeFilter !== 'All') {
      list = list.filter(d => d.destinationTypeName === this.activeFilter);
    }

    switch (this.sortOption) {
      case 'rating':   list.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0)); break;
      case 'az':       list.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'za':       list.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'distance': list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0)); break;
    }

    return list;
  }

  setFilter(filter: string): void { this.activeFilter = filter; }

  setSort(option: 'rating' | 'az' | 'za' | 'distance'): void {
    this.sortOption = option;
    this.showSortMenu = false;
  }

  sortLabel(): string {
    const map = { rating: 'Top Rated', az: 'A → Z', za: 'Z → A', distance: 'Nearest' };
    return map[this.sortOption];
  }

  // ── Favorites ──────────────────────────────────────────────────────────────
  toggleFavorite(destination: DestinationView, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    // ── MOCK — zakomentariši kad backend bude spreman ──────────────────────
    destination.isFavorite = !destination.isFavorite;
    // ── KRAJ MOCK ───────────────────────────────────────────────────────────

    // ── BACKEND — odkomentariši kad backend bude spreman ──────────────────
    // if (destination.isFavorite) {
    //   this.favoriteService.remove(destination.favoriteId!).subscribe({
    //     next: () => {
    //       destination.isFavorite = false;
    //       destination.favoriteId = undefined;
    //     },
    //     error: err => console.error('Remove favorite failed', err),
    //   });
    // } else {
    //   this.favoriteService.add({ destinationId: destination.id }).subscribe({
    //     next: fav => {
    //       destination.isFavorite = true;
    //       destination.favoriteId = fav.id;
    //     },
    //     error: err => console.error('Add favorite failed', err),
    //   });
    // }
    // ── KRAJ BACKEND ────────────────────────────────────────────────────────
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getMainImage(destination: DestinationView): string {
    const main = destination.images?.find(i => i.isMain) ?? destination.images?.[0];
    return main?.url ?? 'assets/images/placeholder.jpg';
  }

  formatDistance(km?: number): string {
    if (km == null) return '';
    return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km} km`;
  }

  viewDetails(destination: DestinationView): void {
    this.router.navigate(['/destination', destination.id]);
  }

  goBack(): void { this.router.navigate(['/home']); }
  goTo(route: string): void { this.router.navigate([`/${route}`]); }
}
