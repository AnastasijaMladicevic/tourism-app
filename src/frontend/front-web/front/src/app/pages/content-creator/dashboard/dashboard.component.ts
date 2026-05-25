import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserDto } from '../../../models/user.model';

type PeriodKey = '7d' | '30d' | '90d';

interface KpiCard {
  label: string;
  value: string;
  meta: string;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'teal';
  icon: string;
}

interface TrendSeries {
  label: string;
  color: string;
  linePath: string;
}

interface StatusRow {
  label: string;
  total: number;
  published: number;
  pending: number;
  rejected: number;
}

interface DonutSlice {
  label: string;
  count: number;
  percent: number;
  color: string;
  dashArray: string;
  dashOffset: number;
}

interface RankedContent {
  type: string;
  name: string;
  status: 'Published' | 'Pending' | 'Rejected';
  destination: string;
  region: string;
  favorites: number;
  plannerAdds: number;
  reviews: number;
  averageRating: number;
  engagementScore: number;
  barPercent: number;
}

interface DestinationPerformance {
  name: string;
  region: string;
  creatorContent: number;
  favorites: number;
  plannerAdds: number;
  reviews: number;
  averageRating: number;
  engagementScore: number;
  barPercent: number;
}

interface RatingRow {
  label: string;
  count: number;
  percent: number;
}

interface UpcomingEvent {
  date: string;
  title: string;
  destination: string;
  type: string;
}

@Component({
  selector: 'app-content-creator-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class ContentCreatorDashboardComponent implements OnInit {
  user: UserDto | null = null;
  selectedPeriod: PeriodKey = '30d';

  periodOptions: { key: PeriodKey; label: string }[] = [
    { key: '7d', label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
  ];

  kpiCards: KpiCard[] = [
    { label: 'Published Content', value: '42', meta: '31 objects, 7 events, 4 activities', tone: 'green', icon: 'task_alt' },
    { label: 'Pending Content', value: '8', meta: 'Waiting for manager moderation', tone: 'amber', icon: 'hourglass_top' },
    { label: 'Rejected Content', value: '3', meta: 'Needs edits before resubmission', tone: 'red', icon: 'cancel' },
    { label: 'Favorites in Period', value: '1,248', meta: '+18% compared with previous period', tone: 'purple', icon: 'favorite' },
    { label: 'Planner Adds in Period', value: '684', meta: 'Saved into tourist trip plans', tone: 'blue', icon: 'event_available' },
    { label: 'Unanswered Reviews', value: '12', meta: 'Reply soon to improve trust', tone: 'teal', icon: 'forum' },
  ];

  engagementSeries: TrendSeries[] = [
    { label: 'Favorites', color: '#7c3aed', linePath: 'M0,72 C8,66 11,58 18,60 C27,63 28,43 37,47 C46,51 50,33 58,36 C67,39 72,18 80,24 C89,30 92,16 100,20' },
    { label: 'Planner adds', color: '#2563eb', linePath: 'M0,82 C9,76 13,70 20,72 C30,74 33,58 42,60 C52,62 55,44 64,48 C73,52 78,32 86,36 C92,39 95,29 100,31' },
    { label: 'Reviews', color: '#0d9488', linePath: 'M0,90 C9,88 14,82 22,84 C30,86 35,76 43,78 C52,81 57,66 65,68 C74,70 78,58 86,62 C93,65 96,51 100,54' },
  ];

  engagementLabels = ['Apr 26', 'May 1', 'May 6', 'May 11', 'May 16', 'May 21', 'Today'];
  engagementSummary = [
    { label: 'Favorites', value: '1,248', color: '#7c3aed' },
    { label: 'Planner Adds', value: '684', color: '#2563eb' },
    { label: 'Reviews', value: '146', color: '#0d9488' },
  ];

  statusRows: StatusRow[] = [
    { label: 'Overall', total: 53, published: 42, pending: 8, rejected: 3 },
    { label: 'Objects', total: 35, published: 31, pending: 3, rejected: 1 },
    { label: 'Events', total: 11, published: 7, pending: 3, rejected: 1 },
    { label: 'Activities', total: 7, published: 4, pending: 2, rejected: 1 },
  ];
  contentDonutTotal = 53;
  contentDonutSlices: DonutSlice[] = [
    { label: 'Published', count: 42, percent: 79, color: '#059669', dashArray: '79 21', dashOffset: 0 },
    { label: 'Pending', count: 8, percent: 15, color: '#d97706', dashArray: '15 85', dashOffset: -79 },
    { label: 'Rejected', count: 3, percent: 6, color: '#dc2626', dashArray: '6 94', dashOffset: -94 },
  ];

  topContent: RankedContent[] = [
    {
      type: 'Object',
      name: 'Kalemegdan Sunset Viewpoint',
      status: 'Published',
      destination: 'Belgrade',
      region: 'Serbia',
      favorites: 356,
      plannerAdds: 214,
      reviews: 42,
      averageRating: 4.8,
      engagementScore: 910,
      barPercent: 100,
    },
    {
      type: 'Event',
      name: 'Danube Jazz Evening',
      status: 'Published',
      destination: 'Novi Sad',
      region: 'Vojvodina',
      favorites: 244,
      plannerAdds: 176,
      reviews: 31,
      averageRating: 4.7,
      engagementScore: 689,
      barPercent: 76,
    },
    {
      type: 'Activity',
      name: 'Old Town Walking Route',
      status: 'Pending',
      destination: 'Kotor',
      region: 'Montenegro',
      favorites: 128,
      plannerAdds: 91,
      reviews: 18,
      averageRating: 4.5,
      engagementScore: 364,
      barPercent: 40,
    },
  ];

  topDestinations: DestinationPerformance[] = [
    { name: 'Belgrade', region: 'Serbia', creatorContent: 18, favorites: 612, plannerAdds: 335, reviews: 68, averageRating: 4.7, engagementScore: 1486, barPercent: 100 },
    { name: 'Novi Sad', region: 'Vojvodina', creatorContent: 12, favorites: 388, plannerAdds: 231, reviews: 44, averageRating: 4.6, engagementScore: 982, barPercent: 66 },
    { name: 'Kotor', region: 'Montenegro', creatorContent: 9, favorites: 248, plannerAdds: 118, reviews: 24, averageRating: 4.5, engagementScore: 556, barPercent: 37 },
  ];

  ratingRows: RatingRow[] = [
    { label: '5 stars', count: 91, percent: 62 },
    { label: '4 stars', count: 36, percent: 25 },
    { label: '3 stars', count: 12, percent: 8 },
    { label: '2 stars', count: 5, percent: 3 },
    { label: '1 star', count: 2, percent: 2 },
  ];

  upcomingEvents: UpcomingEvent[] = [
    { date: 'May 28', title: 'Riverside Food Tour', destination: 'Belgrade', type: 'Culinary event' },
    { date: 'Jun 02', title: 'Fortress Night Walk', destination: 'Novi Sad', type: 'Guided activity' },
    { date: 'Jun 09', title: 'Summer Photo Meetup', destination: 'Kotor', type: 'Community event' },
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.user = this.authService.getUser();
  }

  selectPeriod(period: PeriodKey): void {
    this.selectedPeriod = period;
  }

  statusClass(status: RankedContent['status']): string {
    return `status-pill status-pill--${status.toLowerCase()}`;
  }

  getPublishedPercent(row: StatusRow): number {
    return this.getPercent(row.published, row.total);
  }

  getPendingPercent(row: StatusRow): number {
    return this.getPercent(row.pending, row.total);
  }

  getRejectedPercent(row: StatusRow): number {
    return this.getPercent(row.rejected, row.total);
  }

  getStarTrackWidth(percent: number): string {
    return `${percent}%`;
  }

  private getPercent(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }
}