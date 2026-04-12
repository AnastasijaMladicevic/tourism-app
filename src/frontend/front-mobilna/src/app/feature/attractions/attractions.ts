import {
  Component,
  OnInit,
  ViewEncapsulation,
  HostListener,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { DestinationService, DestinationDto } from '../../services/destination';
import { AuthService } from '../../services/auth';
import { ImageService } from '../../services/image';

export interface DestinationView extends DestinationDto {
  isFavorite: boolean;
  favoriteId?: number;
}

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
  sortOption: 'az' | 'za' | 'distance' = 'az';
  showSortMenu = false;
  isLoading = true;
  errorMessage = '';

  destinationTypes: { id: number; name: string }[] = [];
  destinations: DestinationView[] = [];

  constructor(
    private router: Router,
    private destinationService: DestinationService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    private imageService: ImageService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;

    this.destinationService.getAll().subscribe({
      next: async (destinations) => {
        const destinationsWithImages = await Promise.all(
          destinations.map(async (d) => {
            try {
              const images = await this.imageService.getForDestination(d.id).toPromise();
              return {
                ...d,
                images: images || [],
                isFavorite: false,
                favoriteId: undefined
              };
            } catch {
              return {
                ...d,
                images: [],
                isFavorite: false,
                favoriteId: undefined
              };
            }
          })
        );

        this.destinations = destinationsWithImages;
        this.destinationTypes = this.extractUniqueTypes(this.destinations);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this.errorMessage = 'Failed to load attractions.';
        this.cdr.detectChanges();
      },
    });
  }

  private extractUniqueTypes(destinations: DestinationView[]): { id: number; name: string }[] {
    const map = new Map();
    destinations.forEach((d) => {
      if (d.destinationTypeName) {
        map.set(d.destinationTypeName, { id: d.destinationTypeId, name: d.destinationTypeName });
      }
    });
    return Array.from(map.values());
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event): void {
    if (!(e.target as HTMLElement).closest('.sort-anchor')) this.showSortMenu = false;
  }

  get filtered(): DestinationView[] {
    let list = [...this.destinations];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }

    if (this.activeFilter !== 'All') {
      list = list.filter((d) => d.destinationTypeName === this.activeFilter);
    }

    switch (this.sortOption) {
      case 'az':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'za':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'distance':
        list.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        break;
    }
    return list;
  }

  setFilter(filter: string): void {
    this.activeFilter = filter;
  }

  setSort(option: 'az' | 'za' | 'distance'): void {
    this.sortOption = option;
    this.showSortMenu = false;
  }

  sortLabel(): string {
    const map = { az: 'A → Z', za: 'Z → A', distance: 'Nearest' };
    return map[this.sortOption];
  }

  toggleFavorite(destination: DestinationView, event: Event): void {
    event.stopPropagation();
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    destination.isFavorite = !destination.isFavorite;
  }

  getMainImage(destination: DestinationView): string {
  if (destination.images && destination.images.length > 0) {
    const main = destination.images.find(i => i.isMain);
    const url = main?.url ?? destination.images[0].url;
    console.log(`Image for ${destination.name}:`, url);
    return url;
  }
    return '';
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    console.warn('❌ Image failed to load:', imgElement.src);
    imgElement.style.display = 'none';
  }

  formatDistance(km?: number): string {
    if (km == null) return '';
    return km < 1 ? `${Math.round(km * 1000)} m` : `${km} km`;
  }

  viewDetails(destination: DestinationView): void {
    this.router.navigate(['/destination', destination.id]);
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}