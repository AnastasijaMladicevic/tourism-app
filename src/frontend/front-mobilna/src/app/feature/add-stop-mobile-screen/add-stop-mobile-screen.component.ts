import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

interface AddStopCategory {
  label: string;
  icon: string;
  active?: boolean;
}

interface RecentStopItem {
  title: string;
  subtitle: string;
  meta: string;
}

@Component({
  selector: 'app-add-stop-mobile-screen',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './add-stop-mobile-screen.component.html',
  styleUrl: './add-stop-mobile-screen.component.scss',
})
export class AddStopMobileScreenComponent {
  readonly categories: AddStopCategory[] = [
    { label: 'Coffee', icon: 'coffee', active: true },
    { label: 'ATMs', icon: 'credit_card' },
    { label: 'Restaurants', icon: 'restaurant' },
    { label: 'Pharmacy', icon: 'local_hospital' },
  ];

  readonly recentItems: RecentStopItem[] = [
    { title: 'Don Pizza', subtitle: 'Vojvode Putnika 8, Kragujevac 34000', meta: 'Open • Popular now' },
    { title: 'Tango Pub', subtitle: 'Karađorđeva 28, Kragujevac 34104', meta: 'Open • Popular now' },
    { title: 'Capri Pastry', subtitle: 'Karađorđeva 58, Kragujevac 34000', meta: 'Closing soon' },
    { title: 'Central Apoteke', subtitle: 'Kopitareva bb, Kragujevac 34000', meta: '24 Hours' },
    { title: 'Borač Park', subtitle: 'Radoja Domanovića, Kragujevac', meta: '' },
    { title: 'Vita Janic Market', subtitle: 'Radoja Domanovića, Kragujevac', meta: 'Closed • Opens 07:00 Tue' },
  ];

  constructor(private router: Router) {}

  close(): void {
    void this.router.navigate(['/map']);
  }
}
