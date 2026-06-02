import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environment/environment';
import { ActivityDto, ActivityService } from '../../services/activity';
import { DestinationDto, DestinationService } from '../../services/destination';
import { FavoriteDto, FavoriteService } from '../../services/favorite';
import { LocalityDto, LocalityService } from '../../services/locality';
import { ObjectDto, ObjectService } from '../../services/object';
import { ProfileStatsCacheService } from '../../services/profile-stats-cache';
import { TranslationService } from '../../services/translation.service';
import { MatIcon } from "@angular/material/icon";

type FavoriteKind = 'destination' | 'activity' | 'object' | 'locality' | 'route' | 'other';
type FavoriteSortOption = 'newest' | 'title';

interface FavoriteCard {
  id: number;
  title: string;
  categoryKey: string;
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
  value: string;
  count: number;
}

interface FavoriteBreakdownItem {
  key: FavoriteKind;
  label: string;
  count: number;
  icon: string;
}

interface FavoriteCollectionItem {
  value: string;
  label: string;
  count: number;
  icon: string;
  tone: 'blue' | 'amber' | 'green' | 'violet';
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIcon],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent implements OnInit {
  private readonly defaultImages = {
    standard: '/assets/izlet-boko-kotorski-zaliv-1.jpg',
    activity: '/assets/lovcen7.jpg',
    object: '/assets/sveti-stefan-4.jpg',
  } as const;
  private readonly mobilePageSizeOptions = [4, 8, 16, 24, 32] as const;
  private readonly desktopPageSizeOptions = [4, 8, 16, 24, 32] as const;
  private readonly favoriteService = inject(FavoriteService);
  private readonly translationService = inject(TranslationService);
  private readonly destinationService = inject(DestinationService);
  private readonly objectService = inject(ObjectService);
  private readonly activityService = inject(ActivityService);
  private readonly localityService = inject(LocalityService);
  private readonly profileStatsCache = inject(ProfileStatsCacheService);
  private readonly router = inject(Router);

  protected readonly favorites = signal<FavoriteCard[]>([]);
  protected readonly errorMessage = signal('');
  protected readonly isLoading = signal(true);
  protected readonly removingFavoriteId = signal<number | null>(null);
  protected readonly pendingRemovalFavorite = signal<FavoriteCard | null>(null);
  protected readonly searchTerm = signal('');
  protected readonly sortOption = signal<FavoriteSortOption>('newest');
  protected readonly activeFilter = signal('all');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(4);
  protected readonly isDesktopViewport = signal(this.readIsDesktopViewport());
  protected readonly showAllCollections = signal(false);
  protected readonly isPageSizeMenuOpen = signal(false);
  protected readonly pageSizeOptions = computed(() =>
    this.isDesktopViewport() ? this.desktopPageSizeOptions : this.mobilePageSizeOptions,
  );

  protected readonly displayedFavorites = computed(() => {
    const normalizedSearch = this.searchTerm().trim().toLowerCase();
    const activeFilter = this.activeFilter();
    const sorted = [...this.favorites()].sort((left, right) => {
      if (this.sortOption() === 'title') {
        return left.title.localeCompare(right.title);
      }

      return right.createdAtTimestamp - left.createdAtTimestamp;
    });

    return sorted.filter((item) => {
      const matchesSearch = !normalizedSearch || item.searchText.includes(normalizedSearch);
      const matchesFilter = this.matchesActiveFilter(item, activeFilter);
      return matchesSearch && matchesFilter;
    });
  });

  protected readonly locationCount = computed(() => this.displayedFavorites().length);

  protected readonly filterChips = computed<FavoriteChip[]>(() => {
    const counts = new Map<string, FavoriteChip>();

    for (const favorite of this.favorites()) {
      const existing = counts.get(favorite.categoryKey);

      if (existing) {
        existing.count += 1;
        continue;
      }

      counts.set(favorite.categoryKey, {
        label: favorite.categoryLabel,
        value: favorite.categoryKey,
        count: 1,
      });
    }

    return [
      {
        label: this.translate('common.all'),
        value: 'all',
        count: this.favorites().length,
      },
      ...[...counts.values()].sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.label.localeCompare(right.label);
      }),
    ];
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

    const rows: FavoriteBreakdownItem[] = [
      {
        key: 'destination',
        label: this.translate('favorites.breakdown.destination'),
        count: counts.destination,
        icon: 'travel_explore',
      },
      {
        key: 'object',
        label: this.translate('favorites.breakdown.object'),
        count: counts.object,
        icon: 'apartment',
      },
      {
        key: 'locality',
        label: this.translate('favorites.breakdown.locality'),
        count: counts.locality,
        icon: 'place',
      },
      {
        key: 'activity',
        label: this.translate('favorites.breakdown.activity'),
        count: counts.activity,
        icon: 'directions_run',
      },
    ];

    return rows;
  });

  protected readonly collectionItems = computed<FavoriteCollectionItem[]>(() =>
    this.savedBreakdown().map((item, index) => ({
        value: `kind:${item.key}`,
        label: item.label,
        count: item.count,
        icon: item.icon,
        tone: this.resolveCollectionTone(index),
      })),
  );

  protected readonly visibleCollectionItems = computed<FavoriteCollectionItem[]>(() => {
    return this.collectionItems();
  });

  protected readonly hasMoreCollectionItems = computed(
    () => false,
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.displayedFavorites().length / this.pageSize())),
  );

  protected readonly visibleFavorites = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const currentPageSize = this.pageSize();
    const startIndex = (page - 1) * currentPageSize;
    return this.displayedFavorites().slice(startIndex, startIndex + currentPageSize);
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
    this.syncViewportPageSize();
    this.loadFavorites();
  }

  protected translate(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  protected trackFavorite(_: number, item: FavoriteCard): number {
    return item.id;
  }

  protected trackBreakdown(_: number, item: FavoriteBreakdownItem): string {
    return item.key;
  }

  protected trackCollection(_: number, item: FavoriteCollectionItem): string {
    return item.value;
  }

  protected trackChip(_: number, item: FavoriteChip): string {
    return item.value;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('.favorites-page-size')) {
      this.isPageSizeMenuOpen.set(false);
    }
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    this.syncViewportPageSize();
  }

  protected updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
    this.resetPagination();
  }

  protected setActiveFilter(value: string, event?: Event): void {
    const target = event?.currentTarget as HTMLElement | null;
    const shouldPreserveScroll =
      target?.classList.contains('favorites-mobile-collection-card') ||
      target?.classList.contains('collection-row');
    const scrollY =
      shouldPreserveScroll && typeof window !== 'undefined' ? window.scrollY : null;

    event?.preventDefault();
    event?.stopPropagation();
    target?.blur();
    this.activeFilter.set(value);
    this.resetPagination();

    if (scrollY != null && typeof window !== 'undefined') {
      queueMicrotask(() => {
        window.scrollTo({ top: scrollY, behavior: 'auto' });
      });
    }
  }

  protected toggleSort(): void {
    this.sortOption.update((current) => (current === 'newest' ? 'title' : 'newest'));
    this.resetPagination();
  }

  protected previousPage(): void {
    this.currentPage.update((page) => Math.max(1, page - 1));
  }

  protected nextPage(): void {
    this.currentPage.update((page) => Math.min(this.totalPages(), page + 1));
  }

  protected togglePageSizeMenu(event: Event): void {
    event.stopPropagation();
    this.isPageSizeMenuOpen.update((current) => !current);
  }

  protected updatePageSize(size: number): void {
    this.pageSize.set(size);
    this.resetPagination();
    this.isPageSizeMenuOpen.set(false);
  }

  protected collectionCountLabel(count: number): string {
    return count === 1
      ? this.translate('favorites.collectionItemCountOne')
      : this.translate('favorites.collectionItemCountMany', { count });
  }

  protected pageSizeLabel(size: number): string {
    const key = this.usesSerbianCardPlural(size)
      ? 'favorites.pageSizeLabelFew'
      : 'favorites.pageSizeLabelMany';

    return this.translate(key, { count: size });
  }

  protected toggleCollectionsExpanded(): void {
    if (!this.hasMoreCollectionItems()) {
      return;
    }

    this.showAllCollections.update((current) => !current);
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
    this.ensureActiveFilterIsValid(nextFavorites);
    this.ensureCurrentPageIsValid(nextFavorites);
    this.profileStatsCache.write({ favorites: nextFavorites.length });
    this.removingFavoriteId.set(favoriteId);
    this.errorMessage.set('');
    this.pendingRemovalFavorite.set(null);

    this.favoriteService
      .remove(favoriteId)
      .pipe(
        catchError(() => {
          this.favorites.set(previousFavorites);
          this.ensureActiveFilterIsValid(previousFavorites);
          this.ensureCurrentPageIsValid(previousFavorites);
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
        const nextItems = items.filter(Boolean);
        this.favorites.set(nextItems);
        this.ensureActiveFilterIsValid(nextItems);
        this.ensureCurrentPageIsValid(nextItems);
        this.profileStatsCache.write({ favorites: nextItems.length });
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
      destination?.name?.trim() ||
      destination?.displayTitle?.trim() ||
      item.destinationName ||
      this.translationService.translate('favorites.fallbackTitle', { id: item.id });
    const displaySubtitle = destination?.displayTitle?.trim();
    const location = this.buildLocation(destination?.name, destination?.regionName);
    const categoryLabel =
      destination?.destinationTypeName || this.translate('favorites.type.destination');

    return this.createCard({
      id: item.id,
      title,
      categoryKey: this.buildCategoryKey(categoryLabel, 'destination'),
      categoryLabel,
      location,
      quote: this.resolveDescriptionQuote(
        title,
        displaySubtitle,
        destination?.description,
      ),
      note: this.buildRelativeNote(item.createdAt),
      imageUrl: this.resolveDestinationImage(destination),
      canOpenDetails: Boolean(destination?.id),
      routeCommands: destination?.id ? ['/destination', destination.id] : undefined,
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
      categoryKey: this.buildCategoryKey(categoryLabel, 'activity'),
      categoryLabel,
      location,
      quote:
        this.pickDescriptionQuote(title, activity?.description) ||
        (activity?.durationMinutes
          ? this.translate('favorites.activityDurationQuote', { count: activity.durationMinutes })
          : this.translate('favorites.fallbackQuote')),
      note: this.buildRelativeNote(item.createdAt),
      imageUrl: this.resolveMediaUrl(activity?.mainImageUrl) || this.defaultImages.activity,
      canOpenDetails: Boolean(activity?.id),
      routeCommands: activity?.id ? ['/activity', activity.id] : undefined,
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
      categoryKey: this.buildCategoryKey(categoryLabel, 'object'),
      categoryLabel,
      location,
      quote:
        this.pickDescriptionQuote(title, objectItem?.description) ||
        objectItem?.cuisineType?.trim() ||
        this.translate('favorites.fallbackQuote'),
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
      categoryKey: this.buildCategoryKey(categoryLabel, 'locality'),
      categoryLabel,
      location,
      quote: this.resolveDescriptionQuote(title, locality?.description),
      note: this.buildRelativeNote(item.createdAt),
      imageUrl: this.resolveMediaUrl(locality?.mainImageUrl) || this.defaultImages.standard,
      canOpenDetails: Boolean(locality?.id),
      routeCommands: locality?.id ? ['/locality', locality.id] : undefined,
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
      categoryKey: this.buildCategoryKey(this.translate('favorites.routeLabel'), 'route'),
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
      categoryKey: this.buildCategoryKey(this.translate('favorites.savedItemLabel'), 'other'),
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
    categoryKey: string;
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

  private resolveDescriptionQuote(
    title: string,
    ...candidates: Array<string | undefined>
  ): string {
    return this.pickDescriptionQuote(title, ...candidates) || this.translate('favorites.fallbackQuote');
  }

  private pickDescriptionQuote(
    title: string,
    ...candidates: Array<string | undefined>
  ): string | undefined {
    for (const candidate of candidates) {
      const normalized = candidate?.trim();
      if (!normalized) {
        continue;
      }

      if (normalized !== title) {
        return normalized;
      }
    }

    return undefined;
  }

  private buildCategoryKey(label: string, kind: FavoriteKind): string {
    const normalized = label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || kind;
  }

  private ensureActiveFilterIsValid(items: FavoriteCard[]): void {
    const currentFilter = this.activeFilter();

    if (currentFilter === 'all') {
      return;
    }

    const hasActiveFilter = items.some((item) => this.matchesActiveFilter(item, currentFilter));

    if (!hasActiveFilter) {
      this.activeFilter.set('all');
    }

    if (items.length <= 4 && this.showAllCollections()) {
      this.showAllCollections.set(false);
    }
  }

  private ensureCurrentPageIsValid(items: FavoriteCard[]): void {
    const normalizedSearch = this.searchTerm().trim().toLowerCase();
    const activeFilter = this.activeFilter();
    const sorted = [...items].sort((left, right) => {
      if (this.sortOption() === 'title') {
        return left.title.localeCompare(right.title);
      }

      return right.createdAtTimestamp - left.createdAtTimestamp;
    });

    const filtered = sorted.filter((item) => {
      const matchesSearch = !normalizedSearch || item.searchText.includes(normalizedSearch);
      const matchesFilter = this.matchesActiveFilter(item, activeFilter);
      return matchesSearch && matchesFilter;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize()));
    if (this.currentPage() > totalPages) {
      this.currentPage.set(totalPages);
    }
  }

  private resetPagination(): void {
    this.currentPage.set(1);
  }

  private readIsDesktopViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth >= 768;
  }

  private syncViewportPageSize(): void {
    const isDesktopViewport = this.readIsDesktopViewport();
    const validOptions = isDesktopViewport ? this.desktopPageSizeOptions : this.mobilePageSizeOptions;

    this.isDesktopViewport.set(isDesktopViewport);
    this.isPageSizeMenuOpen.set(false);

    if (!(validOptions as readonly number[]).includes(this.pageSize())) {
      this.pageSize.set(validOptions[0]);
      this.resetPagination();
    }
  }

  private matchesActiveFilter(item: FavoriteCard, activeFilter: string): boolean {
    if (activeFilter === 'all') {
      return true;
    }

    if (activeFilter.startsWith('kind:')) {
      return item.kind === activeFilter.slice(5);
    }

    return item.categoryKey === activeFilter;
  }

  private resolveCollectionIcon(label: string): string {
    const normalized = label.trim().toLowerCase();

    if (normalized.includes('hotel')) return 'hotel';
    if (normalized.includes('restoran')) return 'restaurant';
    if (normalized.includes('bar')) return 'local_bar';
    if (normalized.includes('grad')) return 'location_city';
    if (normalized.includes('destin')) return 'travel_explore';
    if (normalized.includes('objek')) return 'apartment';
    if (normalized.includes('aktiv')) return 'hiking';
    if (normalized.includes('rout') || normalized.includes('ruta')) return 'route';

    return 'bookmark';
  }

  private resolveCollectionTone(index: number): FavoriteCollectionItem['tone'] {
    const tones: FavoriteCollectionItem['tone'][] = ['blue', 'amber', 'green', 'violet'];
    return tones[index % tones.length];
  }

  private usesSerbianCardPlural(count: number): boolean {
    if (this.translationService.language() !== 'sr') {
      return false;
    }

    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    return lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14);
  }
}
