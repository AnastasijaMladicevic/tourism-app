import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { AuthService, UserDto } from '../../services/auth';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface LanguageOption {
  code: string;
  labelKey: string;
}

@Component({
  selector: 'app-language',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './language.component.html',
  styleUrl: './language.component.scss',
})
export class LanguageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  protected readonly options: LanguageOption[] = [
    { code: 'en', labelKey: 'language.english' },
    { code: 'sr', labelKey: 'language.serbian' },
  ];

  protected readonly selectedCode = signal('sr');
  protected readonly appliedCode = signal('sr');
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
    this.appliedCode.set(code);

    this.authService
      .getById(currentUser.id)
      .pipe(catchError(() => of(null)))
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        const latestCode = this.normalizeLanguage(user.language);
        this.selectedCode.set(latestCode);
        this.appliedCode.set(latestCode);
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
    if (selected === this.appliedCode()) {
      this.feedback.set(this.translationService.translate('language.active'));
      return;
    }

    this.isSaving.set(true);
    this.feedback.set('');

    this.authService
      .update(this.user.id, { language: selected })
      .pipe(
        catchError((error) => {
          const message = (error as { error?: { message?: string } })?.error?.message;
          this.feedback.set(message || this.translationService.translate('language.saveFailed'));
          return of(null);
        }),
        finalize(() => {
          this.isSaving.set(false);
        }),
      )
      .subscribe((user) => {
        if (!user) return;
        this.user = user;
        const applied = this.normalizeLanguage(user.language);
        this.translationService.setLanguage(applied);
        this.selectedCode.set(applied);
        this.appliedCode.set(applied);
        this.feedback.set(this.translationService.translate('language.saved'));
      });
  }

  protected isSelected(code: string): boolean {
    return this.selectedCode() === code;
  }

  protected canApply(): boolean {
    return !this.isSaving() && this.selectedCode() !== this.appliedCode();
  }

  protected getSelectedLanguageLabel(): string {
    return this.translationService.translate(
      this.selectedCode() === 'en' ? 'language.english' : 'language.serbian',
    );
  }

  private normalizeLanguage(language?: string | null): string {
    return language?.toLowerCase() === 'en' ? 'en' : 'sr';
  }
}
