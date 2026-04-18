import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { FavoriteDto, FavoriteService } from '../../services/favorite';

interface FavoriteCard {
  id: number;
  title: string;
  typeLabel: string;
  createdLabel: string;
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './favorites.component.html',
  styleUrl: './favorites.component.scss',
})
export class FavoritesComponent implements OnInit {
  private readonly favoriteService = inject(FavoriteService);

  protected readonly favorites = signal<FavoriteCard[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isRemoving = signal<number | null>(null);
  protected readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadFavorites();
  }

  protected removeFavorite(id: number): void {
    if (this.isRemoving()) return;

    this.isRemoving.set(id);
    this.errorMessage.set('');

    this.favoriteService
      .remove(id)
      .pipe(
        catchError(() => {
          this.errorMessage.set('Sacuvana stavka nije uklonjena. Pokusaj ponovo.');
          return of(null);
        }),
        finalize(() => this.isRemoving.set(null)),
      )
      .subscribe((result) => {
        if (result === null) return;

        this.favorites.update((items) => items.filter((item) => item.id !== id));
      });
  }

  protected trackFavorite(_: number, item: FavoriteCard): number {
    return item.id;
  }

  private loadFavorites(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.favoriteService
      .getMyFavorites()
      .pipe(
        catchError(() => {
          this.errorMessage.set('Sacuvane stavke trenutno nisu dostupne.');
          return of([] as FavoriteDto[]);
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe((items) => {
        this.favorites.set(items.map((item) => this.mapFavorite(item)));
      });
  }

  private mapFavorite(item: FavoriteDto): FavoriteCard {
    const title =
      item.destinationName
      || item.objectName
      || item.activityName
      || item.routeName
      || item.localityName
      || `Sacuvana stavka #${item.id}`;

    let typeLabel = 'Sacuvana stavka';

    if (item.destinationId) typeLabel = 'Destinacija';
    if (item.objectId) typeLabel = 'Objekat';
    if (item.activityId) typeLabel = 'Aktivnost';
    if (item.routeId) typeLabel = 'Ruta';
    if (item.localityId) typeLabel = 'Mesto';

    return {
      id: item.id,
      title,
      typeLabel,
      createdLabel: this.formatDate(item.createdAt),
    };
  }

  private formatDate(value: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Datum nije dostupan';
    }

    return date.toLocaleDateString('sr-RS', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}
