import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ActivityDto, ActivityService } from '../../services/activity';
import { DestinationDto, DestinationService } from '../../services/destination';
import { FavoriteDto, FavoriteService } from '../../services/favorite';
import { LocalityDto, LocalityService } from '../../services/locality';
import { ObjectDto, ObjectService } from '../../services/object';
import { TranslationService } from '../../services/translation.service';

type FavoriteKind = 'destination' | 'activity' | 'object' | 'locality' | 'route' | 'other';
type FavoriteSortOption = 'newest' | 'title';

interface FavoriteCard {
  id: number;
  title: string;
  categoryLabel: string;
  location: string;
  note: string;
  imageUrl: string;
  quote: string;
  kind: FavoriteKind;
  rating?: number;
  reviewCount?: number;
  canOpenDetails: boolean;
  routeCommands?: (string | number)[];
  searchText: string;
  createdAtTimestamp: number;
}

interface FavoriteChip {
  label: string;
  count: number;
}

interface FavoriteBreakdownItem {
  label: string;
  count: number;
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent implements OnInit {
  private readonly defaultImages = {
    standard: '/assets/izlet-boko-kotorski-zaliv-1.jpg',
    activity: '/assets/lovcen7.jpg',
    object: '/assets/sveti-stefan-4.jpg',
  } as const;
  private readonly favoriteService = inject(FavoriteService);
  private readonly translationService = inject(TranslationService);
  private readonly destinationService = inject(DestinationService);
  private readonly objectService = inject(ObjectService);
  private readonly activityService = inject(ActivityService);
  private readonly localityService = inject(LocalityService);
  private readonly router = inject(Router);

  protected readonly favorites = signal<FavoriteCard[]>([]);
  protected readonly errorMessage = signal('');
  protected readonly isLoading = signal(true);
  protected readonly removingFavoriteId = signal<number | null>(null);
  protected readonly pendingRemovalFavorite = signal<FavoriteCard | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly sortOption = signal<FavoriteSortOption>('newest');

  protected readonly displayedFavorites = computed(() => {
    const normalizedSearch = this.searchTerm().trim().toLowerCase();
    const sorted = [...this.favorites()].sort((left, right) => {
      if (this.sortOption() === 'title') {
        return left.title.localeCompare(right.title);
      }

      return right.createdAtTimestamp - left.createdAtTimestamp;
    });

    if (!normalizedSearch) {
      return sorted;
    }

    return sorted.filter((item) => item.searchText.includes(normalizedSearch));
  });

  protected readonly locationCount = computed(() => this.displayedFavorites().length);

  protected readonly categoryChips = computed<FavoriteChip[]>(() => {
    const counts = new Map<string, number>();

    for (const favorite of this.favorites()) {
      counts.set(favorite.categoryLabel, (counts.get(favorite.categoryLabel) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 4)
      .map(([label, count]) => ({ label, count }));
  });

  protected readonly savedBreakdown = computed<FavoriteBreakdownItem[]>(() => {
    const counts: Record<FavoriteKind, number> = {
      destination: 0,
      activity: 0,
      object: 0,
      locality: 0,
      route: 0,
      other: 0,
    };

    for (const favorite of this.favorites()) {
      counts[favorite.kind] += 1;
    }

    return [
      { label: 'Destinations', count: counts.destination },
      { label: 'Objects', count: counts.object },
      { label: 'Activities', count: counts.activity },
      { label: 'Localities', count: counts.locality },
      { label: 'Routes', count: counts.route },
    ].filter((item) => item.count > 0);
  });

  protected readonly latestSavedLabel = computed(() => {
    const newest = [...this.favorites()].sort(
      (left, right) => right.createdAtTimestamp - left.createdAtTimestamp,
    )[0];

    return newest?.note ?? this.translate('favorites.latestEmpty');
  });

  protected readonly sortLabel = computed(() =>
    this.sortOption() === 'newest'
      ? this.translate('favorites.sortDateAdded')
      : this.translate('favorites.sortName'),
  );
  protected readonly savedCountLabel = computed(() =>
    this.locationCount() === 1
      ? this.translate('favorites.savedItemCount', { count: this.locationCount() })
      : this.translate('favorites.savedItemsCount', { count: this.locationCount() }),
  );

  ngOnInit(): void {
    this.loadFavorites();
  }

  protected translate(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  protected trackFavorite(_: number, item: FavoriteCard): number {
    return item.id;
  }

  protected trackBreakdown(_: number, item: FavoriteBreakdownItem): string {
    return item.label;
  }

  protected trackChip(_: number, item: FavoriteChip): string {
    return item.label;
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  protected toggleSort(): void {
    this.sortOption.update((current) => (current === 'newest' ? 'title' : 'newest'));
  }

  protected requestRemoveFavorite(card: FavoriteCard, event: Event): void {
    event.stopPropagation();
    event.preventDefault();

    if (this.removingFavoriteId()) {
      return;
    }

    this.pendingRemovalFavorite.set(card);
  }

  protected cancelRemoveFavorite(): void {
    if (this.removingFavoriteId()) {
      return;
    }

    this.pendingRemovalFavorite.set(null);
  }

  protected confirmRemoveFavorite(): void {
    const favorite = this.pendingRemovalFavorite();
    if (!favorite || this.removingFavoriteId()) {
      return;
    }

    const favoriteId = favorite.id;

    const previousFavorites = this.favorites();
    const nextFavorites = previousFavorites.filter((item) => item.id !== favoriteId);

    if (nextFavorites.length === previousFavorites.length) {
      this.pendingRemovalFavorite.set(null);
      return;
    }

    this.favorites.set(nextFavorites);
    this.removingFavoriteId.set(favoriteId);
    this.errorMessage.set('');
    this.pendingRemovalFavorite.set(null);

    this.favoriteService
      .remove(favoriteId)
      .pipe(
        catchError(() => {
          this.favorites.set(previousFavorites);
          this.errorMessage.set(this.translate('favorites.removeError'));
          return of(false);
        }),
        finalize(() => this.removingFavoriteId.set(null)),
      )
      .subscribe();
  }

  protected openFavorite(card: FavoriteCard): void {
    if (!card.canOpenDetails || !card.routeCommands?.length) {
      return;
    }

    void this.router.navigate(card.routeCommands);
  }

  protected openFavoriteAction(card: FavoriteCard, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.openFavorite(card);
  }

  private loadFavorites(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.favoriteService
      .getMyFavorites()
      .pipe(
        switchMap((items) => {
          if (!items.length) {
            return of([] as FavoriteCard[]);
          }

          return forkJoin(items.map((item) => this.enrichFavorite(item)));
        }),
        catchError(() => {
          this.errorMessage.set(this.translationService.translate('favorites.loadError'));
          return of([] as FavoriteCard[]);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((items) => {
        this.favorites.set(items.filter(Boolean));
      });
  }

  private enrichFavorite(item: FavoriteDto) {
    if (item.destinationId) {
      return this.destinationService.getById(item.destinationId).pipe(
        map((destination) => this.mapDestinationFavorite(item, destination)),
        catchError(() => of(this.mapDestinationFavorite(item))),
      );
    }

    if (item.activityId) {
      return this.activityService.getById(item.activityId).pipe(
        map((activity) => this.mapActivityFavorite(item, activity)),
        catchError(() => of(this.mapActivityFavorite(item))),
      );
    }

    if (item.objectId) {
      return this.objectService.getById(item.objectId).pipe(
        map((objectItem) => this.mapObjectFavorite(item, objectItem)),
        catchError(() => of(this.mapObjectFavorite(item))),
      );
    }

    if (item.localityId) {
      return this.localityService.getById(item.localityId).pipe(
        map((locality) => this.mapLocalityFavorite(item, locality)),
        catchError(() => of(this.mapLocalityFavorite(item))),
      );
    }

    if (item.routeId) {
      return of(this.mapRouteFavorite(item));
    }

    return of(this.mapFallbackFavorite(item));
  }

  private mapDestinationFavorite(item: FavoriteDto, destination?: DestinationDto): FavoriteCard {
    const title =
      destination?.displayTitle?.trim() ||
      destination?.name?.trim() ||
      item.destinationName ||
      this.translationService.translate('favorites.fallbackTitle', { id: item.id });
    const location = this.buildLocation(destination?.name, destination?.regionName);
    const categoryLabel =
      destination?.destinationTypeName || this.translate('favorites.type.destination');

    return this.createCard({
      id: item.id,
      title,
      categoryLabel,
      location,
      quote: this.translate('favorites.fallbackQuote'),
      note: this.buildRelativeNote(item.createdAt),
      imageUrl: this.resolveDestinationImage(destination),
      canOpenDetails: false,
      kind: 'destination',
      rating: destination?.averageRating,
      reviewCount: destination?.reviewCount,
      createdAt: item.createdAt,
    });
  }

  private mapActivityFavorite(item: FavoriteDto, activity?: ActivityDto): FavoriteCard {
    const title =
      activity?.name?.trim() ||
      item.activityName ||
      this.translationService.translate('favorites.fallbackTitle', { id: item.id });
    const categoryLabel = activity?.activityTypeName || this.translate('favorites.type.activity');
    const location = this.buildLocation(
      activity?.destinationName,
      activity?.localityName,
      activity?.regionName,
    );

    return this.createCard({
      id: item.id,
      title,
      categoryLabel,
      location,
      quote: activity?.durationMinutes
        ? `${activity.durationMinutes} min experience saved for later.`
        : this.translate('favorites.fallbackQuote'),
      note: this.buildRelativeNote(item.createdAt),
      imageUrl: this.resolveMediaUrl(activity?.mainImageUrl) || this.defaultImages.activity,
      canOpenDetails: false,
      kind: 'activity',
      createdAt: item.createdAt,
    });
  }

  private mapObjectFavorite(item: FavoriteDto, objectItem?: ObjectDto): FavoriteCard {
    const title =
      objectItem?.name?.trim() ||
      item.objectName ||
      this.translationService.translate('favorites.fallbackTitle', { id: item.id });
    const categoryLabel = objectItem?.objectTypeName || this.translate('favorites.type.object');
    const location = this.buildLocation(
      objectItem?.localityName,
      objectItem?.destinationName,
      objectItem?.regionName,
    );

    return this.createCard({
      id: item.id,
      title,
      categoryLabel,
      location,
      quote: objectItem?.cuisineType?.trim()
        ? objectItem.cuisineType
        : this.translate('favorites.fallbackQuote'),
      note: this.buildRelativeNote(item.createdAt),
      imageUrl: this.resolveObjectImage(objectItem),
      canOpenDetails: Boolean(objectItem?.id),
      routeCommands: objectItem?.id ? ['/object', objectItem.id] : undefined,
      kind: 'object',
      rating: objectItem?.averageRating,
      reviewCount: objectItem?.reviewCount,
      createdAt: item.createdAt,
    });
  }

  private mapLocalityFavorite(item: FavoriteDto, locality?: LocalityDto): FavoriteCard {
    const title =
      locality?.name?.trim() ||
      item.localityName ||
      this.translationService.translate('favorites.fallbackTitle', { id: item.id });
    const categoryLabel = locality?.localityTypeName || this.translate('favorites.type.locality');
    const location = this.buildLocation(locality?.destinationName, locality?.regionName);

    return this.createCard({
      id: item.id,
      title,
      categoryLabel,
      location,
      quote: this.translate('favorites.fallbackQuote'),
      note: this.buildRelativeNote(item.createdAt),
      imageUrl: this.resolveMediaUrl(locality?.mainImageUrl) || this.defaultImages.standard,
      canOpenDetails: false,
      kind: 'locality',
      createdAt: item.createdAt,
    });
  }

  private mapRouteFavorite(item: FavoriteDto): FavoriteCard {
    const title =
      item.routeName || this.translationService.translate('favorites.fallbackTitle', { id: item.id });

    return this.createCard({
      id: item.id,
      title,
      categoryLabel: this.translate('favorites.routeLabel'),
      location: this.translate('favorites.routeLocation'),
      quote: this.translate('favorites.routeQuote'),
      note: this.buildRelativeNote(item.createdAt),
      imageUrl: this.defaultImages.activity,
      canOpenDetails: false,
      kind: 'route',
      createdAt: item.createdAt,
    });
  }

  private mapFallbackFavorite(item: FavoriteDto): FavoriteCard {
    return this.createCard({
      id: item.id,
      title: this.translationService.translate('favorites.fallbackTitle', { id: item.id }),
      categoryLabel: this.translate('favorites.savedItemLabel'),
      location: this.translate('favorites.locationFallback'),
      quote: this.translate('favorites.fallbackQuote'),
      note: this.buildRelativeNote(item.createdAt),
      imageUrl: this.defaultImages.standard,
      canOpenDetails: false,
      kind: 'other',
      createdAt: item.createdAt,
    });
  }

  private createCard(card: {
    id: number;
    title: string;
    categoryLabel: string;
    location: string;
    note: string;
    imageUrl: string;
    quote: string;
    kind: FavoriteKind;
    canOpenDetails: boolean;
    createdAt: string;
    rating?: number;
    reviewCount?: number;
    routeCommands?: (string | number)[];
  }): FavoriteCard {
    const createdAtTimestamp = new Date(card.createdAt).getTime();
    const searchParts = [card.title, card.categoryLabel, card.location, card.quote]
      .join(' ')
      .toLowerCase();

    return {
      ...card,
      createdAtTimestamp: Number.isNaN(createdAtTimestamp) ? 0 : createdAtTimestamp,
      searchText: searchParts,
    };
  }

  private buildLocation(...parts: Array<string | undefined>): string {
    const normalized = parts
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));

    return normalized.length ? normalized.join(', ') : this.translate('favorites.locationFallback');
  }

  private resolveDestinationImage(destination?: DestinationDto): string {
    const embeddedImage =
      destination?.images?.find((image) => image.isMain)?.url || destination?.images?.[0]?.url;

    return (
      this.resolveMediaUrl(destination?.mainImageUrl) ||
      this.resolveMediaUrl(embeddedImage) ||
      this.defaultImages.standard
    );
  }

  private resolveObjectImage(objectItem?: ObjectDto): string {
    const embeddedImage =
      objectItem?.images?.find((image) => image.isMain)?.url || objectItem?.images?.[0]?.url;

    return (
      this.resolveMediaUrl(objectItem?.mainImageUrl) ||
      this.resolveMediaUrl(embeddedImage) ||
      this.defaultImages.object
    );
  }

  private resolveMediaUrl(raw?: string): string | undefined {
    if (!raw) return undefined;

    const trimmed = raw.trim();
    if (!trimmed) return undefined;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;

    const apiBase = environment.apiUrl.replace(/\/api\/?$/, '');
    if (trimmed.startsWith('/')) return `${apiBase}${trimmed}`;
    return `${apiBase}/${trimmed}`;
  }

  private buildRelativeNote(value: string): string {
    const createdAt = new Date(value);
    if (Number.isNaN(createdAt.getTime())) {
      return this.translate('favorites.savedRecently');
    }

    const diffInDays = Math.max(
      0,
      Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    );

    if (diffInDays === 0) return this.translate('favorites.addedToday');
    if (diffInDays === 1) return this.translate('favorites.addedOneDayAgo');
    if (diffInDays < 7) return this.translate('favorites.addedDaysAgo', { count: diffInDays });

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks === 1) return this.translate('favorites.addedOneWeekAgo');
    if (diffInWeeks < 5) {
      return this.translate('favorites.addedWeeksAgo', { count: diffInWeeks });
    }

    return createdAt.toLocaleDateString(this.translationService.currentLocale(), {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
