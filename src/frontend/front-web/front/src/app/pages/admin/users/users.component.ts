import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent {
  topOrigins = [
    { name: 'United Kingdom', users: 1240 },
    { name: 'Germany', users: 880 },
    { name: 'USA', users: 640 },
    { name: 'Others', users: 1150 }
  ];

  adminMembers = [
    {
      initials: 'AS',
      name: 'Alex Sterling',
      email: 'alex.sterling@example.com',
      role: 'Super Admin',
      lastLogin: 'Oct 24, 2023 09:42 AM',
      status: 'Active'
    },
    {
      initials: 'SC',
      name: 'Sarah Chen',
      email: 'sarah.chen@example.com',
      role: 'Manager',
      lastLogin: 'Oct 23, 2023 04:15 PM',
      status: 'Active'
    },
    {
      initials: 'MT',
      name: 'Marcus Thorne',
      email: 'marcus.thorne@example.com',
      role: 'Manager',
      lastLogin: 'Oct 24, 2023 10:05 AM',
      status: 'Active'
    },
    {
      initials: 'ER',
      name: 'Elena Rodriguez',
      email: 'elena.rodriguez@example.com',
      role: 'Super Admin',
      lastLogin: 'Oct 22, 2023 02:30 PM',
      status: 'Active'
    },
    {
      initials: 'DN',
      name: 'David Kim',
      email: 'david.kim@example.com',
      role: 'Content Creator',
      lastLogin: 'Oct 21, 2023 11:20 AM',
      status: 'Active'
    },
    {
      initials: 'MT',
      name: 'Maya Tronas',
      email: 'maya.tronas@example.com',
      role: 'Manager',
      lastLogin: 'Oct 22, 2023 03:20 PM',
      status: 'Active'
    }
  ];

  tourists = [
    {
      name: 'Emma Richardson',
      email: 'emma.r@example.com',
      origin: 'United Kingdom',
      status: 'active',
      joinedDate: 'Nov 12, 2023'
    },
    {
      name: 'Liam Nelson',
      email: 'liam.n@example.com',
      origin: 'Ireland',
      status: 'active',
      joinedDate: 'Oct 25, 2023'
    },
    {
      name: 'Sophia Chen',
      email: 's.chen@example.com',
      origin: 'Singapore',
      status: 'pending',
      joinedDate: 'Feb 1, 2024'
    },
    {
      name: 'Marcus Weber',
      email: 'm.weber@example.com',
      origin: 'Germany',
      status: 'active',
      joinedDate: 'Dec 18, 2023'
    },
    {
      name: 'Isabella Silva',
      email: 'i.silva@example.com',
      origin: 'Brazil',
      status: 'active',
      joinedDate: 'Jun 10, 2024'
    }
  ];
}