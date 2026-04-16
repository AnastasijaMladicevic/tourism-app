import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

interface InterestOption {
  label: string;
  selected: boolean;
}

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-profile.component.html',
  styleUrl: './edit-profile.component.scss',
})
export class EditProfileComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  private readonly user = this.authService.getCurrentUser();

  protected readonly name = signal(this.user?.firstName ?? 'Marko');
  protected readonly lastName = signal(this.user?.lastName ?? 'Marković');
  protected readonly country = signal(this.user?.country ?? 'Crna Gora');
  protected readonly email = signal(this.user?.email ?? 'marko.m@example.com');
  protected readonly phone = signal(this.user?.phoneNumber ?? '+382 67 123 456');
  protected readonly appLanguage = signal(this.mapLanguage(this.user?.language));
  protected readonly imageUrl = computed(() => {
    const raw = this.user?.profileImageUrl?.trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return `https://localhost:7047${raw.startsWith('/') ? raw : `/${raw}`}`;
  });

  protected readonly interests = signal<InterestOption[]>([
    { label: 'Plaže', selected: true },
    { label: 'Planinarenje', selected: false },
    { label: 'Istorija', selected: true },
    { label: 'Gastronomija', selected: false },
    { label: 'Noćni život', selected: false },
    { label: 'Kultura', selected: true },
    { label: 'Nacionalni parkovi', selected: false },
  ]);

  protected readonly selectedCount = computed(
    () => this.interests().filter((interest) => interest.selected).length,
  );

  protected goBack(): void {
    this.router.navigate(['/profile']);
  }

  protected saveChanges(): void {
    this.router.navigate(['/profile']);
  }

  protected cancelChanges(): void {
    this.router.navigate(['/profile']);
  }

  protected removePhoto(): void {}

  protected changePhoto(): void {}

  protected toggleInterest(label: string): void {
    this.interests.update((items) =>
      items.map((item) =>
        item.label === label ? { ...item, selected: !item.selected } : item,
      ),
    );
  }

  private mapLanguage(language?: string | null): string {
    return language?.toLowerCase() === 'en' ? 'Engleski' : 'Crnogorski';
  }
}
