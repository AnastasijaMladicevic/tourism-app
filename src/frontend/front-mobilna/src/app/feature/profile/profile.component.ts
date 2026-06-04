import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, forkJoin, map, of, switchMap, throwError, timeout } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService, UpdateUserLocationPayload, UserDto, VisitedPlaceDto } from '../../services/auth';
import { EventPlannerService } from '../../services/event-planner';
import { FavoriteService } from '../../services/favorite';
import { LiveLocationShareService } from '../../services/live-location-share';
import { LocationTrackingService, TrackedLocation } from '../../services/location-tracking';
import { ProfileStatsCacheService, ProfileStatsSnapshot } from '../../services/profile-stats-cache';
import { ReviewService } from '../../services/review';
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
  private readonly liveLocationShareService = inject(LiveLocationShareService);
  private readonly reviewService = inject(ReviewService);
  private readonly profileStatsCache = inject(ProfileStatsCacheService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  protected user: UserDto | null = null;
  protected readonly stats = signal<ProfileStat[]>(this.buildStats());
  protected visitedPlaces: VisitedPlaceDto[] = [];
  protected readonly shareUrl = signal('');
  protected readonly shareExpiresAt = signal('');
  protected readonly shareError = signal('');
  protected readonly liveShareUrl = signal('');
  protected readonly liveShareExpiresAt = signal('');
  protected readonly liveShareError = signal('');
  protected readonly shareBusyKey = signal<string | null>(null);
  protected readonly copySuccessKey = signal<string | null>(null);
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

  protected get formattedDateOfBirth(): string | null {
    const raw = this.user?.dateOfBirth?.trim();
    if (!raw) return null;
    const date = new Date(raw);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'long', year: 'numeric' });
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
    await this.copyGeneratedShare(this.shareUrl(), 'link');
  }

  protected async copyLiveShareUrl(): Promise<void> {
    await this.copyGeneratedShare(this.liveShareUrl(), 'live');
  }

  protected generateLiveLocationShare(durationHours: number): void {
    this.createLocationShare(durationHours, true);
  }

  protected generateLocationShare(durationHours: number): void {
    this.createLocationShare(durationHours, false);
  }

  protected isShareBusy(kind: 'link' | 'live', hours: number): boolean {
    return this.shareBusyKey() === `${kind}:${hours}`;
  }

  protected isCopySuccess(kind: 'link' | 'live'): boolean {
    return this.copySuccessKey() === kind;
  }

  private async copyGeneratedShare(shareUrl: string, kind: 'link' | 'live'): Promise<void> {
    if (!shareUrl) {
      return;
    }

    const copied = await this.copyTextToClipboard(shareUrl);
    if (!copied) {
      return;
    }

    this.copySuccessKey.set(kind);
    setTimeout(() => {
      if (this.copySuccessKey() === kind) {
        this.copySuccessKey.set(null);
      }
    }, 2200);
  }

  private createLocationShare(durationHours: number, live: boolean): void {
    const kind: 'link' | 'live' = live ? 'live' : 'link';
    this.copySuccessKey.set(null);
    this.shareBusyKey.set(`${kind}:${durationHours}`);

    if (live) {
      this.liveShareError.set('');
      this.liveShareUrl.set('');
      this.liveShareExpiresAt.set('');
    } else {
      this.shareError.set('');
      this.shareUrl.set('');
      this.shareExpiresAt.set('');
    }

    const locationRequest = live
      ? this.prepareLiveLocationShare()
      : this.prepareLocationShare();

    locationRequest
      .pipe(
        switchMap((location) => this.authService.createLocationShare(durationHours, location)),
        catchError((error) => {
          const message = this.resolveShareError(error);
          if (live) {
            this.liveShareError.set(message);
          } else {
            this.shareError.set(message);
          }
          return of(null);
        }),
        finalize(() => {
          this.shareBusyKey.set(null);
        }),
      )
      .subscribe((share) => {
        if (!share) {
          return;
        }

        const shareUrl = this.withShareOptions(share.shareUrl, live);

        if (live) {
          this.liveLocationShareService.startSession(share.expiresAtUtc);
          this.liveShareUrl.set(shareUrl);
          this.liveShareExpiresAt.set(share.expiresAtUtc);
          return;
        }

        this.shareUrl.set(shareUrl);
        this.shareExpiresAt.set(share.expiresAtUtc);
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

  private prepareLocationShare(): Observable<UpdateUserLocationPayload | null> {
    const currentLocation = this.locationTrackingService.getCurrentLocation();

    if (this.isFreshLocation(currentLocation)) {
      return of(this.mapTrackedLocationToLocationPayload(currentLocation));
    }

    return this.locationTrackingService.captureCurrentLocation(false).pipe(
      timeout(15000),
      map((location) => this.mapTrackedLocationToLocationPayload(location)),
      catchError((error) => throwError(() => this.resolveLocationPreparationError(error))),
    );
  }

  private prepareLiveLocationShare(): Observable<UpdateUserLocationPayload | null> {
    const currentLocation = this.locationTrackingService.getCurrentLocation();
    const trackingEnabled = this.locationTrackingService.isTrackingEnabled();

    if (!trackingEnabled) {
      return this.redirectToLiveLocationSettings();
    }

    if (this.isFreshGpsLocation(currentLocation)) {
      return of(this.mapTrackedLocationToLocationPayload(currentLocation));
    }

    return this.locationTrackingService.captureCurrentLocation(false, { allowIpFallback: false }).pipe(
      timeout(15000),
      map((location) => {
        if (location.source !== 'gps') {
          throw new Error('profile.shareLiveGpsRequired');
        }

        return this.mapTrackedLocationToLocationPayload(location);
      }),
      catchError(() => this.redirectToLiveLocationSettings()),
    );
  }

  private mapTrackedLocationToLocationPayload(location: TrackedLocation): UpdateUserLocationPayload {
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracyMeters: location.accuracy,
      recordedAtUtc: new Date(location.updatedAt).toISOString(),
    };
  }

  private isFreshLocation(location: TrackedLocation | null): location is TrackedLocation {
    return !!location && Date.now() - location.updatedAt <= this.maxShareLocationAgeMs;
  }

  private isFreshGpsLocation(location: TrackedLocation | null): location is TrackedLocation {
    return this.isFreshLocation(location) && location.source === 'gps';
  }

  private redirectToLiveLocationSettings(): Observable<never> {
    this.liveShareError.set('profile.shareLiveGpsRequired');
    void this.router.navigate(['/location-settings'], {
      queryParams: { locationConsent: 1, liveShare: 1 },
    });
    return throwError(() => new Error('profile.shareLiveGpsRequired'));
  }

  private resolveLocationPreparationError(error: unknown): Error {
    if (error instanceof Error) {
      switch (error.message) {
        case 'geoDenied':
        case 'geoUnavailable':
        case 'geoUnsupported':
        case 'geoFailed':
          return error;
        default:
          return new Error('profile.shareLocationError');
      }
    }

    return new Error('profile.shareLocationError');
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

  private async copyTextToClipboard(text: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fall back to the legacy copy flow below on non-secure or restricted contexts.
      }
    }

    if (typeof document === 'undefined') {
      return false;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
      return document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  private withShareOptions(shareUrl: string, live: boolean): string {
    const language = this.translationService.language();

    try {
      const url = new URL(shareUrl);
      url.searchParams.set('lang', language);
      if (live) {
        url.searchParams.set('live', '1');
      } else {
        url.searchParams.delete('live');
      }
      return url.toString();
    } catch {
      const separator = shareUrl.includes('?') ? '&' : '?';
      const liveSegment = live ? '&live=1' : '';
      return `${shareUrl}${separator}lang=${encodeURIComponent(language)}${liveSegment}`;
    }
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
