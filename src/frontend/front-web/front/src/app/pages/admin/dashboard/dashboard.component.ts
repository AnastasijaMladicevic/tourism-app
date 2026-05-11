import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapService } from '../../../services/map.service';
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements AfterViewInit, OnDestroy {

  // ---- Stat kartice ----
  // Kada backend bude gotov, ove vrednosti dobijaš iz servisa
  stats = {
    tourists: 24892,
    destinations: 142,
    events: 38,
    reviews: 156
  };

  // ---- Activity feed ----
  activityFeed = [
    {
      initials: 'AT', user: 'Alex Thompson', avatarColor: 'blue',
      action: 'updated destination details for',
      target: 'Spire Mountain Resort',
      time: '2 hours ago', role: 'ADMIN'
    },
    {
      initials: 'SJ', user: 'Sarah Jenkins', avatarColor: 'green',
      action: 'approved 12 user reviews for',
      target: 'Old Town Brewery',
      time: '4 hours ago', role: 'CONTENT CREATOR'
    },
    {
      initials: 'MC', user: 'Michael Chen', avatarColor: 'coral',
      action: 'created a new major event:',
      target: 'Summer Solstice Festival 2024',
      time: '6 hours ago', role: 'MANAGER'
    },
    {
      initials: 'EW', user: 'Emma Wilson', avatarColor: 'purple',
      action: 'marked object as permanently closed:',
      target: 'Riverside Antique Shop',
      time: 'Yesterday at 14:20', role: 'MANAGER'
    },
    {
      initials: 'AT', user: 'Alex Thompson', avatarColor: 'blue',
      action: 'uploaded 8 gallery images for',
      target: 'Crystal Lake Hiking Trail',
      time: 'Yesterday at 11:45', role: 'CONTENT CREATOR'
    }
  ];

  // ---- Top regions bar chart ----
  topRegions = [
    { name: 'Budva', percent: 97, score: '4.9' },
    { name: 'Kotor', percent: 83, score: '4.8' },
    { name: 'Herceg Novi', percent: 76, score: '4.7' },
    { name: 'Rafailovići', percent: 61, score: '4.6' },
    { name: 'Bečići', percent: 38, score: '4.5' }
  ];

  // ---- Mapa markeri ----
  private mapMarkers = [
    { lat: 42.2833, lng: 18.8333, label: 'Budva' },
    { lat: 42.4247, lng: 18.7712, label: 'Kotor' },
    { lat: 42.4531, lng: 18.5375, label: 'Herceg Novi' },
    { lat: 42.2594, lng: 18.8767, label: 'Rafailovići' },
    { lat: 42.2683, lng: 18.8831, label: 'Bečići' }
  ];
  constructor(private mapService: MapService) { }
  ngOnDestroy(): void {
    this.mapService.destroyMap();
  }
  ngAfterViewInit(): void {
    this.initMap();
  }

  private initMap(): void {

    this.mapService.initMap(
      'dashboard-map',
      42.35,
      18.75,
      9
    );

    this.mapMarkers.forEach(m => {

      this.mapService.addMainMapMarker(
        m.lat,
        m.lng,
        m.label
      );

    });
  }
}