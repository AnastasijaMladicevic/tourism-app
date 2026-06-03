import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { CreateUserDto, UserDto } from '../../../models/user.model';
import { AdminUsersService } from '../../../services/admin-users.service';
import { TranslationService } from '../../../services/translation.service';

export type TeamMemberRole = 'manager' | 'admin';

@Component({
  selector: 'app-create-team-member',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-team-member.component.html',
  styleUrls: ['./create-team-member.component.css', '../shared/admin-page-title.css']
})
export class CreateTeamMemberComponent {
  private readonly router = inject(Router);
  private readonly adminUsers = inject(AdminUsersService);
  private readonly translationService = inject(TranslationService);

  isSubmitting = false;
  submitError = '';

  firstName = '';
  lastName = '';
  workEmail = '';
  dateOfBirth = '';
  phoneNumber = '';

  password = '';
  confirmPassword = '';

  selectedRole: TeamMemberRole = 'manager';

  country = 'United States';
  preferredLanguage = 'English (US)';
  regionAssignment = '';

  readonly countries = [
    'Albania', 'Argentina', 'Australia', 'Austria', 'Belgium',
    'Bosnia and Herzegovina', 'Brazil', 'Bulgaria', 'Canada', 'China',
    'Croatia', 'Czech Republic', 'Denmark', 'Finland', 'France',
    'Germany', 'Greece', 'Hungary', 'India', 'Italy',
    'Japan', 'Kosovo', 'Mexico', 'Montenegro', 'Netherlands',
    'North Macedonia', 'Norway', 'Poland', 'Portugal', 'Romania',
    'Russia', 'Serbia', 'Slovakia', 'Slovenia', 'Spain',
    'Sweden', 'Switzerland', 'Turkey', 'Ukraine', 'United Kingdom',
    'United States',
  ];

  readonly languages = [
    'Serbian',
    'English (US)',
    'English (UK)',
    'Spanish',
    'Italian'
  ];

  readonly regionOptions = [
    'North America — East',
    'North America — West',
    'European Union — Central',
    'European Union — Mediterranean',
    'Asia-Pacific'
  ];

  /** Maps UI labels to API `language` codes (max 5 chars per backend). */
  private readonly languageCodes: Record<string, string> = {
    Serbian: 'sr',
    'English (US)': 'en',
    'English (UK)': 'en',
    Spanish: 'es',
    Italian: 'it'
  };

  selectRole(role: TeamMemberRole): void {
    this.selectedRole = role;
    this.submitError = '';
  }

  get passwordStrengthLabel(): string {
    const p = this.password;
    if (!p) {
      return '';
    }
    let score = 0;
    if (p.length >= 8) {
      score++;
    }
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) {
      score++;
    }
    if (/\d/.test(p)) {
      score++;
    }
    if (/[^a-zA-Z0-9]/.test(p)) {
      score++;
    }
    if (score <= 1) {
      return this.t('adminTeamMemberCreate.passwordStrength.weak');
    }
    if (score === 2) {
      return this.t('adminTeamMemberCreate.passwordStrength.fair');
    }
    if (score === 3) {
      return this.t('adminTeamMemberCreate.passwordStrength.good');
    }
    return this.t('adminTeamMemberCreate.passwordStrength.strong');
  }

  get passwordStrengthClass(): 'weak' | 'fair' | 'good' | 'strong' | '' {
    const label = this.passwordStrengthLabel;
    if (!label) {
      return '';
    }
    const map: Record<string, 'weak' | 'fair' | 'good' | 'strong'> = {
      [this.t('adminTeamMemberCreate.passwordStrength.weak')]: 'weak',
      [this.t('adminTeamMemberCreate.passwordStrength.fair')]: 'fair',
      [this.t('adminTeamMemberCreate.passwordStrength.good')]: 'good',
      [this.t('adminTeamMemberCreate.passwordStrength.strong')]: 'strong'
    };
    return map[label] ?? '';
  }

  get passwordsMismatch(): boolean {
    if (!this.confirmPassword) {
      return false;
    }
    return this.password !== this.confirmPassword;
  }

  onCancel(): void {
    void this.router.navigate(['/admin/users']);
  }

  onCreate(): void {
    this.submitError = '';

    const first = this.firstName.trim();
    const last = this.lastName.trim();
    const email = this.workEmail.trim();
    if (!first || !last || !email || !this.dateOfBirth) {
      this.submitError = this.t('adminTeamMemberCreate.errors.requiredFields');
      return;
    }
    if (!this.password || this.password.length < 6) {
      this.submitError = this.t('adminTeamMemberCreate.errors.passwordMinLength');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.submitError = this.t('adminTeamMemberCreate.errors.passwordsMismatch');
      return;
    }

    const dto = this.buildCreatePayload();
    this.isSubmitting = true;

    const request$: Observable<UserDto> =
      this.selectedRole === 'admin' ? this.adminUsers.createAdmin(dto) : this.adminUsers.createManager(dto);

    request$
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => void this.router.navigate(['/admin/users']),
        error: (err: unknown) => {
          this.submitError = this.extractApiMessage(err);
        }
      });
  }

  private buildCreatePayload(): CreateUserDto {
    const language = this.languageCodes[this.preferredLanguage] ?? 'en';

    return {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      dateOfBirth: this.dateOfBirth,
      email: this.workEmail.trim(),
      password: this.password,
      phoneNumber: this.phoneNumber.trim(),
      country: this.country.trim(),
      language
    };
  }

  private extractApiMessage(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string; errors?: Record<string, string[] | string> } | null;
      if (body && typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }
      if (body?.errors && typeof body.errors === 'object') {
        for (const val of Object.values(body.errors)) {
          if (Array.isArray(val) && val[0]) {
            return String(val[0]);
          }
          if (typeof val === 'string') {
            return val;
          }
        }
      }
      if (err.status === 0) {
        return this.t('adminTeamMemberCreate.errors.network');
      }
      if (err.status >= 500) {
        return this.t('adminTeamMemberCreate.errors.server');
      }
    }
    return this.t('adminTeamMemberCreate.errors.createFailed');
  }

  t(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  countryLabel(country: string): string {
    const key = country
      .replace(/[()]/g, '')
      .replace(/\s+/g, '')
      .replace(/[^A-Za-z]/g, '');
    return this.t(`adminTeamMemberCreate.countries.${key}`);
  }

  languageLabel(language: string): string {
    const key = language
      .replace(/[()]/g, '')
      .replace(/\s+/g, '')
      .replace(/[^A-Za-z]/g, '');
    return this.t(`adminTeamMemberCreate.languages.${key}`);
  }

  regionLabel(region: string): string {
    const key = region
      .replace(/\s+/g, '')
      .replace(/[^A-Za-z]/g, '');
    return this.t(`adminTeamMemberCreate.regions.${key}`);
  }
}
