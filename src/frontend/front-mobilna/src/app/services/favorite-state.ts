import { Injectable } from '@angular/core';
import { map, Observable, of, tap } from 'rxjs';
import { CreateFavoriteDto, FavoriteDto, FavoriteService } from './favorite';

export type FavoriteEntityType = 'destination' | 'object' | 'activity' | 'locality';

export interface FavoriteTarget {
  type: FavoriteEntityType;
  entityId: number;
}

export interface FavoriteStatefulItem {
  isFavorite: boolean;
  favoriteId?: number;
}

@Injectable({ providedIn: 'root' })
export class FavoriteStateService {
  private favoriteMap = new Map<string, number>();
  private hasLoaded = false;

  constructor(private readonly favoriteService: FavoriteService) { }

  loadFavorites(force = false): Observable<Map<string, number>> {
    if (this.hasLoaded && !force) {
      return of(new Map(this.favoriteMap));
    }

    return this.favoriteService.getMyFavorites().pipe(
      map((items) => this.toFavoriteMap(items)),
      tap((favoriteMap) => {
        this.favoriteMap = favoriteMap;
        this.hasLoaded = true;
      }),
      map((favoriteMap) => new Map(favoriteMap)),
    );
  }

  applyToItem<T extends FavoriteStatefulItem>(item: T, target: FavoriteTarget | null | undefined): T {
    if (!target || !target.entityId) {
      item.isFavorite = false;
      item.favoriteId = undefined;
      return item;
    }

    const favoriteId = this.favoriteMap.get(this.key(target.type, target.entityId));
    item.isFavorite = favoriteId != null;
    item.favoriteId = favoriteId;
    return item;
  }

  applyToList<T extends FavoriteStatefulItem>(
    items: T[],
    resolveTarget: (item: T) => FavoriteTarget | null | undefined,
  ): T[] {
    items.forEach((item) => this.applyToItem(item, resolveTarget(item)));
    return items;
  }

  toggle(
    target: FavoriteTarget,
    currentFavoriteId?: number | null,
  ): Observable<{ isFavorite: boolean; favoriteId?: number }> {
    if (currentFavoriteId) {
      return this.favoriteService.remove(currentFavoriteId).pipe(
        map(() => {
          this.favoriteMap.delete(this.key(target.type, target.entityId));
          return { isFavorite: false, favoriteId: undefined };
        }),
      );
    }

    return this.favoriteService.add(this.toPayload(target)).pipe(
      map((favorite) => {
        this.favoriteMap.set(this.key(target.type, target.entityId), favorite.id);
        return { isFavorite: true, favoriteId: favorite.id };
      }),
    );
  }

  private toFavoriteMap(items: FavoriteDto[]): Map<string, number> {
    const mapResult = new Map<string, number>();

    for (const favorite of items) {
      if (favorite.destinationId) {
        mapResult.set(this.key('destination', favorite.destinationId), favorite.id);
      }

      if (favorite.objectId) {
        mapResult.set(this.key('object', favorite.objectId), favorite.id);
      }

      if (favorite.activityId) {
        mapResult.set(this.key('activity', favorite.activityId), favorite.id);
      }

      if (favorite.localityId) {
        mapResult.set(this.key('locality', favorite.localityId), favorite.id);
      }
    }

    return mapResult;
  }

  private toPayload(target: FavoriteTarget): CreateFavoriteDto {
    switch (target.type) {
      case 'destination':
        return { destinationId: target.entityId };
      case 'object':
        return { objectId: target.entityId };
      case 'activity':
        return { activityId: target.entityId };
      case 'locality':
        return { localityId: target.entityId };
    }
  }

  private key(type: FavoriteEntityType, entityId: number): string {
    return `${type}:${entityId}`;
  }
}