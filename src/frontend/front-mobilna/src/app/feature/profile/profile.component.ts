import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { environment } from '../../../environment/environment';
import { AuthService, UserDto } from '../../services/auth';
import { FavoriteService } from '../../services/favorite';
import { ReviewDto, ReviewService } from '../../services/review';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface ProfileStat {
  labelKey: string;
  value: string | number;
  icon: string;
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
  private readonly authService = inject(AuthService);
  private readonly favoriteService = inject(FavoriteService);
  private readonly reviewService = inject(ReviewService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  protected user: UserDto | null = null;
  protected stats: ProfileStat[] = [
    { labelKey: 'profile.stats.favorites', value: 0, icon: 'heart' },
    { labelKey: 'profile.stats.reviews', value: 0, icon: 'star' },
  ];

  protected readonly sections: ProfileSection[] = [
    {
      titleKey: 'profile.section.trips',
      items: [
        { titleKey: 'profile.favorites', icon: 'heart', accent: 'teal', route: '/favorites' },
        { titleKey: 'profile.myReviews', icon: 'star', accent: 'blue', route: '/my-reviews' },
      ],
    },
    {
      titleKey: 'profile.section.settings',
      items: [
        { titleKey: 'profile.language', icon: 'language', accent: 'green', route: '/language' },
        { titleKey: 'profile.support', icon: 'help', accent: 'gray', route: '/support' },
      ],
    },
    {
      titleKey: 'profile.section.account',
      items: [
        { titleKey: 'profile.privacy', icon: 'shield', accent: 'blue', route: '/privacy-data' },
        { titleKey: 'profile.terms', icon: 'document', accent: 'gray', route: '/terms' },
        {
          titleKey: 'profile.moderator',
          icon: 'document',
          accent: 'gray',
          route: '/moderator-access',
        },
        { titleKey: 'profile.about', icon: 'document', accent: 'gray', route: '/about' },
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
    return section.titleKey;
  }

  protected trackItem(_: number, item: ProfileAction): string {
    return item.titleKey;
  }

  protected trackStat(_: number, stat: ProfileStat): string {
    return stat.labelKey;
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
        { labelKey: 'profile.stats.favorites', value: favorites, icon: 'heart' },
        { labelKey: 'profile.stats.reviews', value: reviews, icon: 'star' },
      ];
    });
  }

  private countOwnReviews(items: ReviewDto[], currentUserId: number): number {
    return items.filter((item) => Number(item.userId) === currentUserId).length;
  }
}
