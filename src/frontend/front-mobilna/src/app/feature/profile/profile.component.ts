import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService, UserDto } from '../../services/auth';
import { FavoriteService } from '../../services/favorite';
import { ReviewDto, ReviewService } from '../../services/review';

interface ProfileStat {
  label: string;
  value: string | number;
  icon: string;
}

interface ProfileAction {
  title: string;
  icon: string;
  accent: 'teal' | 'blue' | 'green' | 'gray' | 'red';
  route?: string;
  action?: 'logout';
}

interface ProfileSection {
  title: string;
  items: ProfileAction[];
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);

  protected readonly editLabel = 'Uredi';
  protected readonly activityLabel = 'Aktivan nalog';

  protected user: UserDto | null = null;
  protected stats: ProfileStat[] = [
    { label: 'FAVORITES', value: 0, icon: 'heart' },
    { label: 'RECENZIJE', value: 0, icon: 'star' },
  ];

  protected readonly sections: ProfileSection[] = [
    {
      title: 'MOJA PUTOVANJA',
      items: [
        { title: 'Favorites', icon: 'heart', accent: 'teal', route: '/favorites' },
        { title: 'Moje recenzije', icon: 'star', accent: 'blue', route: '/my-reviews' },
      ],
    },
    {
      title: 'PODESAVANJA',
      items: [
        { title: 'Jezik', icon: 'language', accent: 'green', route: '/language' },
        { title: 'Pomoc i podrska', icon: 'help', accent: 'gray', route: '/support' },
      ],
    },
    {
      title: 'NALOG',
      items: [
        { title: 'Privatnost i podaci', icon: 'shield', accent: 'blue', route: '/privacy-data' },
        { title: 'Uslovi koriscenja', icon: 'document', accent: 'gray', route: '/terms' },
        {
          title: 'Zatrazi dozvolu za moderatora',
          icon: 'document',
          accent: 'gray',
          route: '/moderator-access',
        },
        { title: 'O nama', icon: 'document', accent: 'gray', route: '/about' },
        { title: 'Odjavi se', icon: 'logout', accent: 'red', action: 'logout' },
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
    this.loadStats(currentUser.id);

    this.authService
      .getById(currentUser.id)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
      });
  }

  protected get fullName(): string {
    const first = this.user?.firstName?.trim() ?? '';
    const last = this.user?.lastName?.trim() ?? '';
    const fullName = `${first} ${last}`.trim();
    return fullName || 'SpireGO korisnik';
  }

  protected get email(): string {
    return this.user?.email?.trim() || 'Email nije dostupan';
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
          this.router.navigate(['/login']);
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

  protected trackSection(_: number, section: ProfileSection): string {
    return section.title;
  }

  protected trackItem(_: number, item: ProfileAction): string {
    return item.title;
  }

  protected trackStat(_: number, stat: ProfileStat): string {
    return stat.label;
  }

  private loadStats(currentUserId: number): void {
    if (!this.authService.isLoggedIn()) {
      return;
    }

    forkJoin({
      favorites: this.favoriteService.getMyFavorites().pipe(
        map((items) => items.length),
        catchError(() => of(0)),
      ),
      reviews: this.reviewService.getAll().pipe(
        map((items) => this.countOwnReviews(items, currentUserId)),
        catchError(() => of(0)),
      ),
    }).subscribe(({ favorites, reviews }) => {
      this.stats = [
        { label: 'FAVORITES', value: favorites, icon: 'heart' },
        { label: 'RECENZIJE', value: reviews, icon: 'star' },
      ];
    });
  }

  private countOwnReviews(items: ReviewDto[], currentUserId: number): number {
    return items.filter((item) => Number(item.userId) === currentUserId).length;
  }
}
