import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';
import { ObjectDto, ObjectService } from '../../services/object';
import { environment } from '../../../environment/environment';

export interface Hotel {
  id: number;
  name: string;
  image?: string;
  badge?: string;
  badgeType?: 'top' | 'value';
  rating: number;
  reviews: number;
  distance: string;
  amenities: string[];
  price?: number;
  saved: boolean;
  typeName: string;
  locality?: string;
  description?: string;
}

@Component({
  selector: 'app-hotels',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, BottomNavComponent],
  templateUrl: './hotels.html',
  styleUrls: ['./hotels.css'],
  encapsulation: ViewEncapsulation.None,
})
export class HotelsComponent implements OnInit {
  searchQuery = '';
  activeCategory = 'All Hotels';
  isLoading = true;
  errorMessage = '';
  showSortMenu = false;
  sortOption: 'rating' | 'az' | 'za' = 'rating';

  hotels: Hotel[] = [];

  constructor(
    private objectService: ObjectService,
    private cdr: ChangeDetectorRef,
    private location: Location,
  ) {}

  ngOnInit(): void {
    this.loadHotels();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!(event.target as HTMLElement).closest('.sort-anchor')) this.showSortMenu = false;
  }

  get categories(): string[] {
    const unique = Array.from(new Set(this.hotels.map((hotel) => hotel.typeName).filter(Boolean)));
    return ['All Hotels', ...unique];
  }

  get filteredHotels(): Hotel[] {
    let list = [...this.hotels];

    const query = this.searchQuery.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (hotel) =>
          hotel.name.toLowerCase().includes(query) ||
          (hotel.locality ?? '').toLowerCase().includes(query),
      );
    }

    if (this.activeCategory !== 'All Hotels') {
      list = list.filter((hotel) => hotel.typeName === this.activeCategory);
    }

    switch (this.sortOption) {
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'az':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'za':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return list;
  }

  setCategory(category: string): void {
    this.activeCategory = category;
  }

  setSort(option: 'rating' | 'az' | 'za'): void {
    this.sortOption = option;
    this.showSortMenu = false;
  }

  sortLabel(): string {
    const map = { rating: 'Top Rated', az: 'A -> Z', za: 'Z -> A' };
    return map[this.sortOption];
  }

  toggleSave(hotel: Hotel): void {
    hotel.saved = !hotel.saved;
  }

  goBack(): void {
    this.location.back();
  }

  loadHotels(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.objectService.getAll().subscribe({
      next: (objects) => {
        const objectList = this.toArray<ObjectDto>(objects).map((obj) => this.normalizeObject(obj));
        const hotelObjects = objectList.filter((obj) => this.isHotel(obj.objectTypeName));

        this.hotels = hotelObjects.map((obj) => this.toHotelCard(obj));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error(err);
        this.hotels = [];
        this.isLoading = false;
        this.errorMessage = 'Failed to load hotels.';
        this.cdr.detectChanges();
      },
    });
  }

  private toArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[];
    if (!raw || typeof raw !== 'object') return [];
    const obj = raw as Record<string, unknown>;
    const listKeys = ['items', 'data', 'results', 'value'];
    for (const key of listKeys) {
      const candidate = obj[key];
      if (Array.isArray(candidate)) return candidate as T[];
    }
    return [];
  }

  private normalizeObject(raw: ObjectDto): ObjectDto {
    const dto = raw as unknown as Record<string, unknown>;
    return {
      id: Number(dto['id'] ?? dto['Id'] ?? 0),
      name: String(dto['name'] ?? dto['Name'] ?? ''),
      description: (dto['description'] ?? dto['Description'] ?? undefined) as string | undefined,
      address: (dto['address'] ?? dto['Address'] ?? undefined) as string | undefined,
      phoneNumber: (dto['phoneNumber'] ?? dto['PhoneNumber'] ?? undefined) as string | undefined,
      website: (dto['website'] ?? dto['Website'] ?? undefined) as string | undefined,
      workingHours: (dto['workingHours'] ?? dto['WorkingHours'] ?? undefined) as string | undefined,
      longitude: this.readOptionalNumber(dto, ['longitude', 'Longitude']),
      latitude: this.readOptionalNumber(dto, ['latitude', 'Latitude']),
      averageRating: this.readOptionalNumber(dto, ['averageRating', 'AverageRating']),
      reviewCount: this.readOptionalNumber(dto, ['reviewCount', 'ReviewCount']),
      distanceKm: this.readOptionalNumber(dto, ['distanceKm', 'DistanceKm']),
      isActive: Boolean(dto['isActive'] ?? dto['IsActive'] ?? true),
      objectTypeId: Number(dto['objectTypeId'] ?? dto['ObjectTypeId'] ?? 0),
      objectTypeName: String(dto['objectTypeName'] ?? dto['ObjectTypeName'] ?? ''),
      localityName: (dto['localityName'] ?? dto['LocalityName'] ?? undefined) as string | undefined,
      destinationName:
        (dto['destinationName'] ?? dto['DestinationName'] ?? undefined) as string | undefined,
      images: ((dto['images'] ?? dto['Images'] ?? []) as ObjectDto['images']) || [],
    };
  }

  private readOptionalNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = obj[key];
      if (value == null) continue;
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }
    return undefined;
  }

  private isHotel(typeName?: string): boolean {
    if (!typeName) return false;
    return typeName.trim().toLowerCase().includes('hotel');
  }

  private toHotelCard(obj: ObjectDto): Hotel {
    const rating = obj.averageRating ?? 0;
    return {
      id: obj.id,
      name: obj.name,
      image: this.mainImage(obj),
      badge: rating >= 4.7 ? 'Top Rated' : rating >= 4.2 ? 'Great Value' : undefined,
      badgeType: rating >= 4.7 ? 'top' : rating >= 4.2 ? 'value' : undefined,
      rating,
      reviews: obj.reviewCount ?? 0,
      distance: this.distanceText(obj.distanceKm),
      amenities: this.amenitiesFromObject(obj),
      price: undefined,
      saved: false,
      typeName: obj.objectTypeName || 'Hotel',
      locality: obj.localityName ?? obj.destinationName ?? 'Montenegro',
      description: obj.description ?? obj.address ?? 'Stay close to the best local experiences.',
    };
  }

  private mainImage(obj: ObjectDto): string | undefined {
    const main = obj.images?.find((image) => image.isMain) ?? obj.images?.[0];
    return this.resolveMediaUrl(main?.url);
  }

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) return undefined;
    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (trimmed.startsWith('/')) return `${apiBase}${trimmed}`;
    return `${apiBase}/${trimmed}`;
  }

  private distanceText(distanceKm?: number): string {
    if (distanceKm == null) return 'Location available';
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m from center`;
    return `${distanceKm.toFixed(1)} km from center`;
  }

  private amenitiesFromObject(obj: ObjectDto): string[] {
    const amenities: string[] = [];
    if (obj.website) amenities.push('WiFi');
    if (obj.phoneNumber) amenities.push('Parking');
    if (obj.workingHours) amenities.push('Breakfast');
    if (!amenities.length) amenities.push('Restaurant');
    return amenities.slice(0, 3);
  }
}
