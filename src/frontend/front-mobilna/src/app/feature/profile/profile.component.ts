import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService, UserDto, VisitedPlaceDto } from '../../services/auth';
import { FavoriteService } from '../../services/favorite';
import { EventPlannerService } from '../../services/event-planner';
import { LocationTrackingService, TrackedLocation } from '../../services/location-tracking';
import { ReviewService } from '../../services/review';
import { ProfileStatsCacheService, ProfileStatsSnapshot } from '../../services/profile-stats-cache';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface ProfileStat {
  labelKey: string;
  value: number | null;
  icon: 'heart' | 'calendar' | 'star';
}

interface ProfileAction {
  titleKey: string;
  icon: string;
  accent: 'teal' | 'blue' | 'green' | 'gray' | 'red';
  route?: string;
  action?: 'logout';
}

interface ProfileSection {
  titleKey: string;
  items: ProfileAction[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly maxShareLocationAgeMs = 25 * 60 * 1000;
  private readonly authService = inject(AuthService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly eventPlannerService = inject(EventPlannerService);
  private readonly locationTrackingService = inject(LocationTrackingService);
  private readonly reviewService = inject(ReviewService);
  private readonly profileStatsCache = inject(ProfileStatsCacheService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  protected user: UserDto | null = null;
  protected readonly stats = signal<ProfileStat[]>(this.buildStats());
  protected visitedPlaces: VisitedPlaceDto[] = [];
  protected shareUrl = '';
  protected shareExpiresAt = '';
  protected shareError = '';
  protected shareBusyHours: number | null = null;
  protected copySuccess = false;
  protected readonly shareDurations = [1, 4, 24];

  protected readonly sections: ProfileSection[] = [
    {
      titleKey: 'profile.section.trips',
      items: [
        { titleKey: 'profile.favorites', icon: 'heart', accent: 'teal', route: '/favorites' },
        { titleKey: 'profile.stats.plans', icon: 'calendar', accent: 'green', route: '/planner' },
        { titleKey: 'profile.myReviews', icon: 'star', accent: 'blue', route: '/my-reviews' },
      ],
    },
    {
      titleKey: 'profile.section.account',
      items: [
        {
          titleKey: 'profile.moderator',
          icon: 'document',
          accent: 'gray',
          route: '/moderator-access',
        },
        { titleKey: 'profile.logout', icon: 'logout', accent: 'red', action: 'logout' },
      ],
    },
  ];

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser?.id) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = currentUser;
    this.applyStatsSnapshot(this.resolveInitialStats(currentUser));
    this.loadStats();
    this.loadVisitedPlaces();

    this.authService
      .getById(currentUser.id)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        this.applyStatsSnapshot(this.resolveInitialStats(user));
        this.loadStats();
        this.loadVisitedPlaces();
      });
  }

  protected get fullName(): string {
    const first = this.user?.firstName?.trim() ?? '';
    const last = this.user?.lastName?.trim() ?? '';
    const fullName = `${first} ${last}`.trim();
    return fullName || this.translationService.translate('profile.defaultUser');
  }

  protected get email(): string {
    return this.user?.email?.trim() || this.translationService.translate('common.emailNotAvailable');
  }

  protected get editLabel(): string {
    return this.translationService.translate('profile.edit');
  }

  protected get activityLabel(): string {
    return this.translationService.translate('profile.activeAccount');
  }

  protected get profileImageUrl(): string {
    const raw = this.user?.profileImageUrl?.trim() || '/images/profiles/default_icon.png';
    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (/^https?:\/\//i.test(raw)) return raw;
    return `${apiBase}${raw.startsWith('/') ? raw : `/${raw}`}`;
  }

  protected handleAction(item: ProfileAction): void {
    if (item.action === 'logout') {
      this.authService
        .logout()
        .pipe(catchError(() => of(null)))
        .subscribe(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          this.router.navigate(['/home']).then(() => {
            window.location.reload();
          });
        });
      return;
    }

    if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  protected openEditProfile(): void {
    this.router.navigate(['/profile/edit']);
  }

  protected openVisitedPlace(place: VisitedPlaceDto): void {
    const route = place.kind === 'destination' ? '/destination' : '/locality';
    this.router.navigate([route, place.id]);
  }

  protected async copyShareUrl(): Promise<void> {
    if (!this.shareUrl || typeof navigator === 'undefined' || !navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(this.shareUrl);
    this.copySuccess = true;
    setTimeout(() => {
      this.copySuccess = false;
    }, 2200);
  }

  protected generateLocationShare(durationHours: number): void {
    this.shareError = '';
    this.copySuccess = false;
    this.shareUrl = '';
    this.shareExpiresAt = '';
    this.shareBusyHours = durationHours;

    this.prepareLocationShare()
      .pipe(
        switchMap(() => this.authService.createLocationShare(durationHours)),
        catchError((error) => {
          this.shareError = this.resolveShareError(error);
          return of(null);
        }),
        finalize(() => {
          this.shareBusyHours = null;
        }),
      )
      .subscribe((share) => {
        if (!share) {
          return;
        }

        this.shareUrl = share.shareUrl;
        this.shareExpiresAt = share.expiresAtUtc;
      });
  }

  protected trackSection(_: number, section: ProfileSection): string {
    return section.titleKey;
  }

  protected trackItem(_: number, item: ProfileAction): string {
    return item.titleKey;
  }

  protected trackStat(_: number, stat: ProfileStat): string {
    return stat.labelKey;
  }

  private prepareLocationShare(): Observable<void> {
    const currentLocation = this.locationTrackingService.getCurrentLocation();

    if (this.isFreshLocation(currentLocation)) {
      return this.pushLocationToBackend(currentLocation).pipe(map(() => void 0));
    }

    return this.locationTrackingService.captureCurrentLocation().pipe(map(() => void 0));
  }

  private pushLocationToBackend(location: TrackedLocation): Observable<unknown> {
    return this.authService.updateMyLocation({
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: location.accuracy,
      recordedAtUtc: new Date(location.updatedAt).toISOString(),
    });
  }

  private isFreshLocation(location: TrackedLocation | null): location is TrackedLocation {
    return !!location && Date.now() - location.updatedAt <= this.maxShareLocationAgeMs;
  }

  private resolveShareError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    const message = (error as { error?: { message?: string } })?.error?.message?.trim();

    if (!message) {
      return 'profile.shareLocationError';
    }

    if (message.includes('Current location') || message.includes('Location can be shared')) {
      return 'profile.shareLocationError';
    }

    return message;
  }

  private loadStats(): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    forkJoin({
      favorites: this.favoriteService
        .getMyFavoritesPaged({ page: 1, pageSize: 1 })
        .pipe(catchError(() => of({ items: [], page: 1, pageSize: 1, totalCount: 0, totalPages: 0 }))),
      planner: this.eventPlannerService
        .getMyPlanner({ page: 1, pageSize: 1 })
        .pipe(catchError(() => of({ items: [], page: 1, pageSize: 1, totalCount: 0, totalPages: 0 }))),
      reviews: this.reviewService
        .getMine({ page: 1, pageSize: 1 }, { bypassRegion: true })
        .pipe(catchError(() => of({ items: [], page: 1, pageSize: 1, totalCount: 0, totalPages: 0 }))),
    }).subscribe(({ favorites, planner, reviews }) => {
      const snapshot = this.profileStatsCache.write({
        favorites: this.readCollectionCount(favorites),
        plans: this.readCollectionCount(planner),
        reviews: this.readCollectionCount(reviews),
      });

      if (this.user) {
        const updatedUser: UserDto = {
          ...this.user,
          favoritesCount: snapshot.favorites,
          plansCount: snapshot.plans,
          reviewsCount: snapshot.reviews,
        };

        this.user = updatedUser;
        this.authService.setCurrentUser(updatedUser);
      }

      this.applyStatsSnapshot(snapshot);
    });
  }

  private loadVisitedPlaces(): void {
    if (!this.authService.isLoggedIn()) {
      this.visitedPlaces = [];
      return;
    }

    this.authService
      .getVisitedPlaces(6)
      .pipe(catchError(() => of([])))
      .subscribe((places) => {
        this.visitedPlaces = places;
      });
  }

  private resolveInitialStats(user: UserDto): Partial<ProfileStatsSnapshot> {
    const cached = this.profileStatsCache.read();

    return {
      favorites: this.readPreferredCount(user.favoritesCount, cached?.favorites),
      plans: this.readPreferredCount(user.plansCount, cached?.plans),
      reviews: this.readPreferredCount(user.reviewsCount, cached?.reviews),
    };
  }

  private applyStatsSnapshot(snapshot: Partial<ProfileStatsSnapshot>): void {
    this.stats.set(this.buildStats(snapshot));
  }

  private buildStats(snapshot: Partial<ProfileStatsSnapshot> = {}): ProfileStat[] {
    return [
      { labelKey: 'profile.stats.favorites', value: this.toDisplayCount(snapshot.favorites), icon: 'heart' },
      { labelKey: 'profile.stats.plans', value: this.toDisplayCount(snapshot.plans), icon: 'calendar' },
      { labelKey: 'profile.stats.reviews', value: this.toDisplayCount(snapshot.reviews), icon: 'star' },
    ];
  }

  private readCollectionCount(raw: unknown): number {
    if (Array.isArray(raw)) {
      return raw.length;
    }

    if (!raw || typeof raw !== 'object') {
      return 0;
    }

    const obj = raw as Record<string, unknown>;

    // Proba sve poznate varijante totalCount polja
    const totalCount =
      obj['totalCount'] ??
      obj['TotalCount'] ??
      obj['total'] ??
      obj['Total'] ??
      obj['count'] ??
      obj['Count'];

    if (typeof totalCount === 'number') {
      return totalCount;
    }

    if (typeof totalCount === 'string') {
      const parsed = Number(totalCount);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    // Proba array polja
    const items =
      obj['items'] ??
      obj['Items'] ??
      obj['data'] ??
      obj['Data'] ??
      obj['results'] ??
      obj['Results'];

    if (Array.isArray(items)) {
      return items.length;
    }

    const value = obj['value'] ?? obj['Value'];
    if (Array.isArray(value)) {
      return value.length;
    }

    return 0;
  }

  private readPreferredCount(primary: unknown, fallback: unknown): number | undefined {
    const fallbackCount = this.toStoredCount(fallback);

    if (typeof primary === 'number' && Number.isFinite(primary) && primary > 0) {
      return primary;
    }

    if (typeof primary === 'string') {
      const parsed = Number(primary);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    if (fallbackCount != null) {
      return fallbackCount;
    }

    return undefined;
  }

  private toDisplayCount(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    return null;
  }

  private toStoredCount(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
    }

    return undefined;
  }
}
