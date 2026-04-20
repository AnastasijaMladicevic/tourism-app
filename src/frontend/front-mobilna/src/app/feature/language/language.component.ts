import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService, UserDto } from '../../services/auth';

interface LanguageOption {
  code: string;
  label: string;
  subtitle?: string;
}

@Component({
  selector: 'app-language',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './language.component.html',
  styleUrl: './language.component.scss',
})
export class LanguageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly options: LanguageOption[] = [
    { code: 'en', label: 'English' },
    { code: 'sr', label: 'Crnogorski / Srpski' },
  ];

  protected readonly selectedCode = signal('sr');
  protected readonly savedCode = signal('sr');
  protected readonly isSaving = signal(false);
  protected readonly feedback = signal('');

  private user: UserDto | null = null;

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      this.router.navigate(['/profile']);
      return;
    }

    this.user = currentUser;
    const code = this.normalizeLanguage(currentUser.language);
    this.selectedCode.set(code);
    this.savedCode.set(code);

    this.authService
      .getById(currentUser.id)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        const latestCode = this.normalizeLanguage(user.language);
        this.selectedCode.set(latestCode);
        this.savedCode.set(latestCode);
      });
  }

  protected goBack(): void {
    this.router.navigate(['/profile']);
  }

  protected selectLanguage(code: string): void {
    this.selectedCode.set(code);
    this.feedback.set('');
  }

  protected applyLanguage(): void {
    if (!this.user?.id || this.isSaving()) return;

    const selected = this.selectedCode();
    if (selected === this.savedCode()) {
      this.feedback.set('Jezik je već aktivan.');
      return;
    }

    this.isSaving.set(true);
    this.feedback.set('');

    this.authService
      .update(this.user.id, { language: selected })
      .pipe(
        catchError((error) => {
          const message = (error as { error?: { message?: string } })?.error?.message;
          this.feedback.set(message || 'Promena jezika nije sačuvana.');
          return of(null);
        }),
        finalize(() => {
          this.isSaving.set(false);
        }),
      )
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        const saved = this.normalizeLanguage(user.language);
        this.selectedCode.set(saved);
        this.savedCode.set(saved);
        this.feedback.set('Jezik je uspešno ažuriran.');
      });
  }

  protected isSelected(code: string): boolean {
    return this.selectedCode() === code;
  }

  protected canApply(): boolean {
    return !this.isSaving() && this.selectedCode() !== this.savedCode();
  }

  private normalizeLanguage(language?: string | null): string {
    return language?.toLowerCase() === 'en' ? 'en' : 'sr';
  }
}
