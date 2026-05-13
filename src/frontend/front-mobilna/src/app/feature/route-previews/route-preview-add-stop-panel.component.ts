import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-route-preview-add-stop-panel',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './route-preview-add-stop-panel.component.html',
  styleUrl: './route-preview-add-stop-panel.component.scss',
})
export class RoutePreviewAddStopPanelComponent {
  protected readonly quickFilters = ['Coffee', 'Gas', 'Dining', 'Sights'];
  protected readonly suggestions = [
    {
      title: 'Kotor Old Town',
      subtitle: 'Stari Grad, Kotor 85330',
      badge: 'Highly Rated',
      selected: true,
    },
    {
      title: 'Perast Waterfront',
      subtitle: 'Obala Kapetana Marka Martinovica',
      badge: 'Quick Access',
      selected: false,
    },
    {
      title: 'Lovcen National Park',
      subtitle: 'Jezerski Vrh, Cetinje',
      badge: 'Scenic Stop',
      selected: false,
    },
  ];
}
