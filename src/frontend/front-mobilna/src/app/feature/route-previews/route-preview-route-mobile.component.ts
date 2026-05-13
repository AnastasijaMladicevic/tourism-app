import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-route-preview-route-mobile',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './route-preview-route-mobile.component.html',
  styleUrl: './route-preview-route-mobile.component.scss',
})
export class RoutePreviewRouteMobileComponent {
  protected readonly stops = [
    { order: 1, title: 'Kotor Old Town', meta: 'Start • 0 km' },
    { order: 2, title: 'Our Lady of the Rocks', meta: '12 min • 12.4 km' },
    { order: 3, title: 'Porto Montenegro', meta: '25 min • 8.2 km' },
    { order: 4, title: 'Budva Old Town', meta: '45 min • 22.1 km' },
  ];
}
