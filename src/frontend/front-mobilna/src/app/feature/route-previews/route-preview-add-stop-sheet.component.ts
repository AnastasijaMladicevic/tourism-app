import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-route-preview-add-stop-sheet',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './route-preview-add-stop-sheet.component.html',
  styleUrl: './route-preview-add-stop-sheet.component.scss',
})
export class RoutePreviewAddStopSheetComponent {
  protected readonly categories = ['Coffee', 'ATMs', 'Restaurants', 'Sights'];
  protected readonly recent = [
    { title: 'Don Pizza', subtitle: 'Vojvode Putnika 8, Kragujevac 34000', meta: 'Open • Popular now' },
    { title: 'Tango Pub', subtitle: 'Karadordeva 28, Kragujevac 34104', meta: '' },
    { title: 'Capri Pastry', subtitle: 'Karadordeva 58, Kragujevac 34000', meta: 'Closing soon' },
    { title: 'Central Apoteke', subtitle: 'Kopitareva bb, Kragujevac 34000', meta: '24 Hours' },
    { title: 'Borac Park', subtitle: 'Radoja Domanovica, Kragujevac', meta: '' },
    { title: 'Vita Janic Market', subtitle: 'Radoja Domanovica, Kragujevac', meta: 'Closed • Opens 07:00 Tue' },
  ];
}
