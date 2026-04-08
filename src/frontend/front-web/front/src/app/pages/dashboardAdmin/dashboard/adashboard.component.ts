import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
 
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adashboard.component.html',
  styleUrls: ['./adashboard.component.css']
})
export class DashboardComponent {
 
  user = {
    name: 'Jarry McLovin',
    email: 'mclovin@spirego.com',
    initials: 'JM'
  };
 
  // ---- Stat cards ----
  stats = [
    {
      label: 'Total Tourists',
      value: '24,892',
      badge: '+12.5% since last month',
      color: 'blue',
      badgeClass: 'badge-green',
      cardClass: 'blue-tint'
    },
    {
      label: 'Active Destinations',
      value: '142',
      badge: '+3 new this week',
      color: 'green',
      badgeClass: 'badge-green',
      cardClass: 'green-tint'
    },
    {
      label: 'Upcoming Events',
      value: '38',
      badge: '-4% vs previous period',
      color: 'amber',
      badgeClass: 'badge-red',
      cardClass: 'amber-tint'
    },
    {
      label: 'Pending Reviews',
      value: '156',
      badge: 'Moderate — requires moderation',
      color: 'purple',
      badgeClass: 'badge-amber',
      cardClass: 'purple-tint'
    }
  ];
 
  // ---- Activity feed ----
  activityFeed = [
    {
      initials: 'AT',
      user: 'Alex Thompson',
      action: 'updated destination details for',
      target: 'Spire Mountain Resort',
      time: '2 hours ago',
      role: 'ADMIN',
      avatarClass: ''
    },
    {
      initials: 'SJ',
      user: 'Sarah Jenkins',
      action: 'approved 12 user reviews for',
      target: 'Old Town Brewery',
      time: '4 hours ago',
      role: 'CONTENT CREATOR',
      avatarClass: 'green'
    },
    {
      initials: 'MC',
      user: 'Michael Chen',
      action: 'created a new major event:',
      target: 'Summer Solstice Festival 2024',
      time: '6 hours ago',
      role: 'MANAGER',
      avatarClass: 'coral'
    },
    {
      initials: 'EW',
      user: 'Emma Wilson',
      action: 'marked object as permanently closed:',
      target: 'Riverside Antique Shop',
      time: 'Yesterday at 14:20',
      role: 'MANAGER',
      avatarClass: 'purple'
    },
    {
      initials: 'AT',
      user: 'Alex Thompson',
      action: 'uploaded 8 high-res gallery images for',
      target: 'Crystal Lake Hiking Trail',
      time: 'Yesterday at 11:45',
      role: 'CONTENT CREATOR',
      avatarClass: ''
    }
  ];
 
  // ---- Top regions bar chart ----
  topRegions = [
    { name: 'Budva',       percent: 97 },
    { name: 'Kotor',       percent: 83 },
    { name: 'Herceg Novi', percent: 76 },
    { name: 'Rafailovići', percent: 61 },
    { name: 'Bečići',      percent: 38 }
  ];}