import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AdminUserListItemDto, AdminUsersService } from '../../../services/admin-users.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {
  private readonly adminUsersService = inject(AdminUsersService);

  isLoading = true;
  loadError = '';

  totalRegistered = 0;
  activeThisPeriod = 0;
  newCountries = 0;
  activePercentDelta = 0;
  countryPercentDelta = 0;

  chartPath = '';
  dailySignups: number[] = [];

  totalAdmins = 0;
  totalManagers = 0;
  totalContentCreators = 0;

  topOrigins: { name: string; users: number }[] = [];
  adminMembers: {
    initials: string;
    name: string;
    email: string;
    role: string;
    lastLogin: string;
    status: 'Active' | 'Inactive';
  }[] = [];
  tourists: {
    name: string;
    email: string;
    origin: string;
    status: 'active' | 'inactive';
    joinedDate: string;
  }[] = [];

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.loadError = '';

    forkJoin({
      allUsers: this.fetchAllUsers(),
      tourists: this.fetchAllUsers('Tourist')
    })
      .pipe(
        map(({ allUsers, tourists }) => {
          this.bindUsersData(allUsers, tourists);
        }),
        catchError(() => {
          this.loadError = 'Could not load users data. Check API and try again.';
          return of(null);
        })
      )
      .subscribe(() => {
        this.isLoading = false;
      });
  }

  private fetchAllUsers(role?: string): Observable<AdminUserListItemDto[]> {
    return this.adminUsersService.getUsers({ page: 1, pageSize: 100, role }).pipe(
      switchMap((firstPage) => {
        const totalPages = firstPage.totalPages ?? 1;
        if (totalPages <= 1) {
          return of(firstPage.items ?? []);
        }

        const requests = Array.from({ length: totalPages - 1 }, (_, i) =>
          this.adminUsersService.getUsers({ page: i + 2, pageSize: 100, role })
        );

        return forkJoin(requests).pipe(
          map((restPages) => [
            ...(firstPage.items ?? []),
            ...restPages.flatMap((p) => p.items ?? [])
          ])
        );
      }),
      map((value) => (Array.isArray(value) ? value : [])),
      catchError(() => of([]))
    );
  }

  private bindUsersData(allUsers: AdminUserListItemDto[], touristsOnly: AdminUserListItemDto[]): void {
    const now = new Date();
    const startCurrentPeriod = new Date(now);
    startCurrentPeriod.setDate(now.getDate() - 30);
    const startPreviousPeriod = new Date(now);
    startPreviousPeriod.setDate(now.getDate() - 60);

    this.totalRegistered = allUsers.length;
    this.activeThisPeriod = allUsers.filter((u) => this.isInRange(u.createdAt, startCurrentPeriod, now)).length;
    const previousActive = allUsers.filter((u) =>
      this.isInRange(u.createdAt, startPreviousPeriod, startCurrentPeriod)
    ).length;
    this.activePercentDelta = this.computePercentDelta(this.activeThisPeriod, previousActive);

    const currentCountries = new Set(
      allUsers
        .filter((u) => this.isInRange(u.createdAt, startCurrentPeriod, now))
        .map((u) => (u.country ?? '').trim())
        .filter((c) => !!c)
    );
    const previousCountries = new Set(
      allUsers
        .filter((u) => this.isInRange(u.createdAt, startPreviousPeriod, startCurrentPeriod))
        .map((u) => (u.country ?? '').trim())
        .filter((c) => !!c)
    );
    this.newCountries = currentCountries.size;
    this.countryPercentDelta = this.computePercentDelta(currentCountries.size, previousCountries.size);

    this.dailySignups = this.buildDailySignups(allUsers, 14);
    this.chartPath = this.buildChartPath(this.dailySignups);

    const internalTeam = allUsers.filter((u) => (u.roleName ?? '').toLowerCase() !== 'tourist');
    this.adminMembers = internalTeam.slice(0, 6).map((u) => ({
      initials: this.getInitials(u.firstName, u.lastName),
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      role: u.roleName || 'Unknown',
      lastLogin: this.formatDate(u.createdAt),
      status: u.isActive ? 'Active' : 'Inactive'
    }));

    this.topOrigins = this.buildTopOrigins(touristsOnly);

    this.totalAdmins = internalTeam.filter((u) => (u.roleName ?? '').toLowerCase() === 'admin').length;
    this.totalManagers = internalTeam.filter((u) => (u.roleName ?? '').toLowerCase() === 'manager').length;
    this.totalContentCreators = internalTeam.filter((u) => {
      const role = (u.roleName ?? '').toLowerCase().replace(/\s+/g, '');
      return role === 'contentcreator' || role === 'content-creator';
    }).length;

    this.tourists = touristsOnly.slice(0, 5).map((u) => ({
      name: `${u.firstName} ${u.lastName}`.trim(),
      email: u.email,
      origin: (u.country ?? '').trim() || 'Unknown',
      status: u.isActive ? 'active' : 'inactive',
      joinedDate: this.formatDate(u.createdAt)
    }));
  }

  private buildTopOrigins(users: AdminUserListItemDto[]): { name: string; users: number }[] {
    const counts = new Map<string, number>();
    for (const user of users) {
      const country = (user.country ?? '').trim() || 'Unknown';
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, usersCount]) => ({ name, users: usersCount }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 4);
  }

  private buildDailySignups(users: AdminUserListItemDto[], days: number): number[] {
    const buckets: number[] = Array.from({ length: days }, () => 0);
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(now.getDate() - (days - 1));

    for (const user of users) {
      if (!user.createdAt) {
        continue;
      }
      const created = new Date(user.createdAt);
      if (Number.isNaN(created.getTime()) || created < start || created > now) {
        continue;
      }
      const dayIndex = Math.floor((created.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (dayIndex >= 0 && dayIndex < days) {
        buckets[dayIndex] += 1;
      }
    }
    return buckets;
  }

  private buildChartPath(values: number[]): string {
    if (!values.length) {
      return '';
    }
    const width = 100;
    const height = 100;
    const max = Math.max(...values, 1);
    return values
      .map((v, i) => {
        const x = (i / Math.max(values.length - 1, 1)) * width;
        const y = height - (v / max) * height;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(' ');
  }

  private isInRange(value: string | undefined, from: Date, to: Date): boolean {
    if (!value) {
      return false;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return false;
    }
    return date >= from && date < to;
  }

  private computePercentDelta(current: number, previous: number): number {
    if (previous <= 0) {
      return current > 0 ? 100 : 0;
    }
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  private getInitials(firstName: string, lastName: string): string {
    return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase() || 'U';
  }

  private formatDate(value?: string): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    }).format(date);
  }
}