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

  stats = {
    tourists: 24892,
    destinations: 142,
    events: 38,
    reviews: 156
  };

  statTrends = [
    { label: 'vs last month', value: '+12.5%', positive: true },
    { label: 'vs last week', value: '+3 new', positive: true },
    { label: 'vs previous period', value: '-4.0%', positive: false },
    { label: 'awaiting moderation', value: '156 pending', positive: null as boolean | null }
  ];

  selectedRange = 'Last 30 Days';
  chartRange = 'Last 8 Days';
  funnelRange = 'This Week';

  visitorTrend = [
    { label: 'Aug 12', visitors: 1820, sessions: 2410 },
    { label: 'Aug 13', visitors: 2100, sessions: 2680 },
    { label: 'Aug 14', visitors: 1950, sessions: 2520 },
    { label: 'Aug 15', visitors: 2340, sessions: 3010 },
    { label: 'Aug 16', visitors: 2210, sessions: 2890 },
    { label: 'Aug 17', visitors: 2480, sessions: 3180 },
    { label: 'Aug 18', visitors: 2360, sessions: 3050 },
    { label: 'Aug 19', visitors: 2520, sessions: 3290 }
  ];

  monthlyGoal = {
    percent: 78,
    target: 32000,
    current: 24920,
    change: '+8.2%'
  };

  contentCategories = [
    { name: 'Nature & Trails', value: 1240000, color: '#4f46e5', percent: 36 },
    { name: 'Culture & Heritage', value: 980000, color: '#0d9488', percent: 29 },
    { name: 'Food & Nightlife', value: 620000, color: '#6366f1', percent: 18 },
    { name: 'Events & Festivals', value: 580000, color: '#818cf8', percent: 17 }
  ];

  get contentTotal(): number {
    return this.contentCategories.reduce((sum, c) => sum + c.value, 0);
  }

  regionBreakdown = [
    { name: 'Budva', share: 34, users: 938 },
    { name: 'Kotor', share: 28, users: 772 },
    { name: 'Herceg Novi', share: 18, users: 496 },
    { name: 'Other coast', share: 20, users: 552 }
  ];

  engagementFunnel = [
    { stage: 'Destination Views', count: 45200, change: '+5.2%', positive: true },
    { stage: 'Saved to Trip', count: 18400, change: '+3.1%', positive: true },
    { stage: 'Event Registrations', count: 9200, change: '-1.4%', positive: false },
    { stage: 'Reviews Submitted', count: 6100, change: '+6.8%', positive: true },
    { stage: 'Abandoned Saves', count: 3200, change: '-2.0%', positive: false }
  ];

  get funnelMax(): number {
    return Math.max(...this.engagementFunnel.map(f => f.count));
  }

  discoveryChannels = [
    { name: 'Mobile App', percent: 42, color: '#4f46e5' },
    { name: 'Organic Search', percent: 28, color: '#0d9488' },
    { name: 'Social Media', percent: 16, color: '#6366f1' },
    { name: 'Referrals', percent: 9, color: '#94a3b8' },
    { name: 'Email & Push', percent: 5, color: '#cbd5e1' }
  ];

  activityFeed = [
    {
      initials: 'AT', user: 'Alex Thompson', avatarColor: 'indigo',
      action: 'updated destination details for',
      target: 'Spire Mountain Resort',
      time: '2 hours ago', role: 'ADMIN'
    },
    {
      initials: 'SJ', user: 'Sarah Jenkins', avatarColor: 'teal',
      action: 'approved 12 user reviews for',
      target: 'Old Town Brewery',
      time: '4 hours ago', role: 'CONTENT CREATOR'
    },
    {
      initials: 'MC', user: 'Michael Chen', avatarColor: 'violet',
      action: 'created a new major event:',
      target: 'Summer Solstice Festival 2024',
      time: '6 hours ago', role: 'MANAGER'
    },
    {
      initials: 'EW', user: 'Emma Wilson', avatarColor: 'slate',
      action: 'marked object as permanently closed:',
      target: 'Riverside Antique Shop',
      time: 'Yesterday at 14:20', role: 'MANAGER'
    },
    {
      initials: 'AT', user: 'Alex Thompson', avatarColor: 'indigo',
      action: 'uploaded 8 gallery images for',
      target: 'Crystal Lake Hiking Trail',
      time: 'Yesterday at 11:45', role: 'CONTENT CREATOR'
    }
  ];

  topRegions = [
    { name: 'Budva', percent: 97, score: '4.9' },
    { name: 'Kotor', percent: 83, score: '4.8' },
    { name: 'Herceg Novi', percent: 76, score: '4.7' },
    { name: 'Rafailovići', percent: 61, score: '4.6' },
    { name: 'Bečići', percent: 38, score: '4.5' }
  ];

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

  funnelHeight(count: number): number {
    return Math.round((count / this.funnelMax) * 100);
  }

  formatCompact(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return String(n);
  }

  private initMap(): void {
    this.mapService.initMap('dashboard-map', 42.35, 18.75, 9);
    this.mapMarkers.forEach(m => {
      this.mapService.addMainMapMarker(m.lat, m.lng, m.label);
    });
  }
}
