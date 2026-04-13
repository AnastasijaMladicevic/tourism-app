import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

export interface Hotel {
  id: number;
  name: string;
  image: string;
  badge?: string;
  badgeType?: 'top' | 'value';
  rating: number;
  reviews: number;
  distance: string;
  amenities: string[];
  price: number;
  saved: boolean;
}

@Component({
  selector: 'app-hotels',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomNavComponent],
  templateUrl: './hotels.html',
  styleUrls: ['./hotels.css'],
})
export class HotelsComponent {
  searchQuery = '';
  activeCategory = 'All Hotels';

  categories = ['All Hotels', 'Luxury', 'Boutique', 'Eco-friendly', 'Budget'];

  amenityIcons: Record<string, string> = {
    WiFi: 'WiFi',
    Pool: 'Pool',
    Parking: 'Parking',
    Breakfast: 'Breakfast',
    'Private Beach': 'Beach',
    Spa: 'Spa',
    Gym: 'Gym',
    Restaurant: 'Food',
  };

  hotels: Hotel[] = [
    {
      id: 1,
      name: 'Regent Port',
      image: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=600&q=80',
      badge: 'Top Rated',
      badgeType: 'top',
      rating: 4.9,
      reviews: 1240,
      distance: '0.2 km from center',
      amenities: ['WiFi', 'Pool', 'Parking', 'Breakfast'],
      price: 320,
      saved: false,
    },
    {
      id: 2,
      name: 'Heritage Grand Perast',
      image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&q=80',
      rating: 4.7,
      reviews: 850,
      distance: '1.5 km from center',
      amenities: ['WiFi', 'Breakfast', 'Pool'],
      price: 185,
      saved: false,
    },
    {
      id: 3,
      name: 'Aman Sveti Stefan',
      image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=600&q=80',
      badge: 'Top Rated',
      badgeType: 'top',
      rating: 5,
      reviews: 420,
      distance: '6.0 km from center',
      amenities: ['Private Beach', 'WiFi', 'Pool'],
      price: 850,
      saved: false,
    },
    {
      id: 4,
      name: 'Hotel Astoria Budva',
      image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&q=80',
      badge: 'Great Value',
      badgeType: 'value',
      rating: 4.5,
      reviews: 610,
      distance: '0.1 km from center',
      amenities: ['WiFi', 'Parking', 'Breakfast'],
      price: 125,
      saved: false,
    },
  ];

  get filteredHotels(): Hotel[] {
    return this.hotels.filter((hotel) =>
      hotel.name.toLowerCase().includes(this.searchQuery.toLowerCase()),
    );
  }

  setCategory(category: string): void {
    this.activeCategory = category;
  }

  toggleSave(hotel: Hotel): void {
    hotel.saved = !hotel.saved;
  }
}
