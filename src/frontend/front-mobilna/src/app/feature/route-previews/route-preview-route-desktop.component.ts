import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-route-preview-route-desktop',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './route-preview-route-desktop.component.html',
  styleUrl: './route-preview-route-desktop.component.scss',
})
export class RoutePreviewRouteDesktopComponent {
  protected readonly stops = [
    { order: 1, title: 'Santa Monica State Beach', meta: 'Arriving at 10:45 AM • 15 min stop' },
    { order: 2, title: 'Malibu Pier Viewpoint', meta: 'Arriving at 12:10 PM • 30 min stop' },
    { order: 3, title: 'Solvang Danish Village', meta: 'Arriving at 2:40 PM • Lunch break' },
    { order: 4, title: 'Santa Barbara Harbor', meta: 'Arriving at 5:15 PM • Sunset walk' },
    { order: 5, title: 'Morro Bay Embarcadero', meta: 'Arriving at 7:10 PM • Dinner stop' },
  ];
}
