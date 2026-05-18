import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TimeoutError, of } from 'rxjs';
import {
  catchError,
  filter,
  finalize,
  map,
  startWith,
  switchMap,
  timeout
} from 'rxjs/operators';
import { UpdateUserDto, UserDto } from '../../../models/user.model';
import { AdminUsersService, BanUserDto } from '../../../services/admin-users.service';

/** Mirrors role cards on create page; includes Admin when API returns it. */
export type DisplayRole = 'manager' | 'content-creator' | 'tourist' | 'admin';

@Component({
  selector: 'app-edit-team-member',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './edit-team-member.component.html',
  styleUrls: ['./create-team-member.component.css']
})
export class EditTeamMemberComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly adminUsers = inject(AdminUsersService);
  private readonly cdr = inject(ChangeDetectorRef);

  userId!: number;

  isLoading = true;
  loadError = '';

  isSubmitting = false;
  submitError = '';

  firstName = '';
  lastName = '';
  workEmail = '';
  dateOfBirth = '';
  phoneNumber = '';

  password = '';
  confirmPassword = '';

  /** Role from API (updates after reload). */
  displayRole: DisplayRole = 'tourist';

  /** Snapshot of role when the form was loaded — used to decide if Save should call approve-creator. */
  roleAtLoad: DisplayRole = 'tourist';

  /** For tourists and content creators: chosen role before Save (Tourist vs Content Creator). */
  touristRoleSelection: 'tourist' | 'content-creator' = 'tourist';

  country = 'United States';
  preferredLanguage = 'English (US)';
  regionAssignment = '';

  isModerating = false;
  moderationError = '';
  moderationSuccess = '';
  isBanned = false;
  activeBanReason = '';
  activeBanExpiresLabel = '';
  activeBannedAtLabel = '';
  banReason = '';
  banDurationValue = 7;
  banDurationUnit: 'hours' | 'days' | 'weeks' | 'months' | 'permanent' = 'days';

  readonly countries = [
    'United States',
    'United Kingdom',
    'Canada',
    'Germany',
    'France',
    'Croatia',
    'Spain',
    'Italy'
  ];

  readonly languages = [
    'English (US)',
    'English (UK)',
    'German',
    'French',
    'Spanish',
    'Italian',
    'Croatian'
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
    'English (US)': 'en',
    'English (UK)': 'en-GB',
    German: 'de',
    French: 'fr',
    Spanish: 'es',
    Italian: 'it',
    Croatian: 'hr'
  };

  constructor() {
    this.route.paramMap
      .pipe(
        startWith(this.route.snapshot.paramMap),
        map((pm) => {
          const raw = pm.get('userId');
          const parsed = raw ? parseInt(raw, 10) : NaN;
          return Number.isFinite(parsed) && parsed >= 1 ? parsed : NaN;
        }),
        filter((userId) => {
          if (!Number.isNaN(userId)) {
            return true;
          }
          this.isLoading = false;
          this.cdr.markForCheck();
          void this.router.navigate(['/admin/users']);
          return false;
        }),
        switchMap((userId) => {
          this.userId = userId;
          this.isLoading = true;
          this.loadError = '';
          this.cdr.markForCheck();
          return this.adminUsers.getUserById(userId).pipe(
            timeout(15000),
            catchError((err: unknown) => {
              this.loadError = this.extractLoadError(err);
              this.cdr.markForCheck();
              return of(null);
            }),
            finalize(() => {
              this.isLoading = false;
              this.cdr.markForCheck();
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((user) => {
        if (user) {
          this.applyUser(user);
        }
        this.cdr.markForCheck();
      });
  }

  private applyUser(user: UserDto): void {
    this.firstName = user.firstName ?? '';
    this.lastName = user.lastName ?? '';
    this.workEmail = user.email ?? '';
    this.dateOfBirth = this.toDateInputValue(user.dateOfBirth);
    this.phoneNumber = user.phoneNumber ?? '';

    const c = (user.country ?? '').trim();
    this.country = c || 'United States';

    const langCode = (user.language ?? 'en').trim();
    this.preferredLanguage = this.languageLabelFromCode(langCode);

    this.displayRole = this.mapApiRole(user.roleName ?? '');
    this.roleAtLoad = this.displayRole;
    if (this.roleAtLoad === 'tourist') {
      this.touristRoleSelection = 'tourist';
    } else if (this.roleAtLoad === 'content-creator') {
      this.touristRoleSelection = 'content-creator';
    }

    this.syncBanState(user);
  }

  selectTouristRole(role: 'tourist' | 'content-creator'): void {
    if (this.displayRole !== 'tourist' && this.displayRole !== 'content-creator') {
      return;
    }
    this.touristRoleSelection = role;
    this.cdr.markForCheck();
  }

  /** Used in templates for role chip selection without strict-control-flow issues. */
  isRole(role: DisplayRole): boolean {
    return this.displayRole === role;
  }

  get showRolePairPicker(): boolean {
    return this.displayRole === 'tourist' || this.displayRole === 'content-creator';
  }

  get canModerateBan(): boolean {
    return this.displayRole === 'tourist' || this.displayRole === 'content-creator';
  }

  get isPermanentBanSelected(): boolean {
    return this.banDurationUnit === 'permanent';
  }

  get banDurationPreview(): string {
    if (this.isPermanentBanSelected) {
      return 'Permanent ban';
    }

    const value = Math.max(1, Math.floor(Number(this.banDurationValue) || 0));
    const unitMap: Record<'hours' | 'days' | 'weeks' | 'months', string> = {
      hours: value === 1 ? 'hour' : 'hours',
      days: value === 1 ? 'day' : 'days',
      weeks: value === 1 ? 'week' : 'weeks',
      months: value === 1 ? 'month' : 'months'
    };

    return `${value} ${unitMap[this.banDurationUnit as 'hours' | 'days' | 'weeks' | 'months']}`;
  }

  private extractLoadError(err: unknown): string {
    const isTimeout =
      err instanceof TimeoutError ||
      (typeof err === 'object' &&
        err !== null &&
        'name' in err &&
        (err as { name: string }).name === 'TimeoutError');
    if (isTimeout) {
      return 'Request timed out. Start the API (e.g. TuristickiVodic on https://localhost:7047), run ng serve with the proxy, and check the browser Network tab for /api/users/....';
    }
    if (err instanceof HttpErrorResponse) {
      if (err.status === 401) {
        return 'Your session expired or you are not signed in. Open the app again and sign in as Admin.';
      }
      if (err.status === 403) {
        return 'You are not allowed to view this user.';
      }
      if (err.status === 404) {
        return 'User not found.';
      }
      const body = err.error as { message?: string } | null;
      if (body && typeof body.message === 'string' && body.message.trim()) {
        return body.message;
      }
      if (err.status === 0) {
        return 'Cannot reach the API. Is the backend running and is the dev-server using proxy.conf.json for /api?';
      }
    }
    return 'Could not load this user. They may have been removed or you may not have access.';
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
      return 'WEAK';
    }
    if (score === 2) {
      return 'FAIR';
    }
    if (score === 3) {
      return 'GOOD';
    }
    return 'STRONG';
  }

  get passwordStrengthClass(): 'weak' | 'fair' | 'good' | 'strong' | '' {
    const label = this.passwordStrengthLabel;
    if (!label) {
      return '';
    }
    const map: Record<string, 'weak' | 'fair' | 'good' | 'strong'> = {
      WEAK: 'weak',
      FAIR: 'fair',
      GOOD: 'good',
      STRONG: 'strong'
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

  banUser(): void {
    this.moderationError = '';
    this.moderationSuccess = '';

    if (!this.canModerateBan) {
      this.moderationError = 'Only tourist and content creator accounts can be banned from this screen.';
      return;
    }

    const reason = this.banReason.trim();
    if (!reason) {
      this.moderationError = 'Please enter a ban reason.';
      return;
    }

    if (!this.isPermanentBanSelected) {
      const normalizedDuration = Math.floor(Number(this.banDurationValue) || 0);
      if (!Number.isFinite(normalizedDuration) || normalizedDuration < 1) {
        this.moderationError = 'Please enter a valid ban duration.';
        return;
      }
    }

    const dto: BanUserDto = {
      reason,
      banExpiresAtUtc: this.buildBanExpiryUtc()
    };

    this.isModerating = true;
    this.adminUsers
      .banUser(this.userId, dto)
      .pipe(
        finalize(() => {
          this.isModerating = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (user) => {
          this.applyUser(user);
          this.banReason = '';
          this.banDurationValue = 7;
          this.banDurationUnit = 'days';
          this.moderationSuccess = user.banExpiresAtUtc
            ? `User banned until ${this.activeBanExpiresLabel}.`
            : 'User permanently banned.';
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.moderationError = this.extractApiMessage(err);
          this.cdr.markForCheck();
        }
      });
  }

  unbanUser(): void {
    this.moderationError = '';
    this.moderationSuccess = '';

    if (!this.canModerateBan) {
      this.moderationError = 'This account type cannot be unbanned from this screen.';
      return;
    }

    this.isModerating = true;
    this.adminUsers
      .unbanUser(this.userId)
      .pipe(
        finalize(() => {
          this.isModerating = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (user) => {
          this.applyUser(user);
          this.moderationSuccess = 'User ban has been removed.';
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.moderationError = this.extractApiMessage(err);
          this.cdr.markForCheck();
        }
      });
  }

  onSave(): void {
    this.submitError = '';

    const first = this.firstName.trim();
    const last = this.lastName.trim();
    if (!first || !last || !this.dateOfBirth) {
      this.submitError = 'Please fill in first name, last name, and date of birth.';
      return;
    }

    const pwd = this.password.trim();
    const confirm = this.confirmPassword.trim();
    const changingPwd = !!(pwd || confirm);
    if (changingPwd) {
      if (pwd.length < 6) {
        this.submitError = 'New password must be at least 6 characters.';
        return;
      }
      if (pwd !== confirm) {
        this.submitError = 'Passwords do not match.';
        return;
      }
    }

    const updateDto = this.buildUpdatePayload();
    this.isSubmitting = true;

    const promoteTouristToCreator =
      this.roleAtLoad === 'tourist' && this.touristRoleSelection === 'content-creator';
    const demoteCreatorToTourist =
      this.roleAtLoad === 'content-creator' && this.touristRoleSelection === 'tourist';

    this.adminUsers
      .updateUser(this.userId, updateDto)
      .pipe(
        switchMap(() => {
          if (!pwd) {
            return of(null);
          }
          return this.adminUsers.changeUserPassword(this.userId, {
            currentPassword: '.',
            newPassword: pwd,
            confirmPassword: confirm
          });
        }),
        switchMap(() => {
          if (!promoteTouristToCreator) {
            return of(null);
          }
          return this.adminUsers.approveCreatorRole(this.userId);
        }),
        switchMap(() => {
          if (!demoteCreatorToTourist) {
            return of(null);
          }
          return this.adminUsers.demoteCreatorRole(this.userId);
        }),
        finalize(() => {
          this.isSubmitting = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => void this.router.navigate(['/admin/users']),
        error: (err: unknown) => {
          this.submitError = this.extractApiMessage(err);
          this.cdr.markForCheck();
        }
      });
  }

  private buildUpdatePayload(): UpdateUserDto {
    const language = this.languageCodes[this.preferredLanguage] ?? 'en';

    return {
      firstName: this.firstName.trim(),
      lastName: this.lastName.trim(),
      dateOfBirth: this.dateOfBirth,
      phoneNumber: this.phoneNumber.trim(),
      country: this.country.trim(),
      language
    };
  }

  private toDateInputValue(iso?: string): string {
    if (!iso) {
      return '';
    }
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return '';
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private languageLabelFromCode(code: string): string {
    const normalized = code.trim().toLowerCase();
    const hit = Object.entries(this.languageCodes).find(([, v]) => v.toLowerCase() === normalized);
    if (hit) {
      return hit[0];
    }
    return 'English (US)';
  }

  private mapApiRole(roleName: string): DisplayRole {
    const r = (roleName ?? '').toLowerCase().replace(/[\s_-]/g, '');
    if (r === 'admin') {
      return 'admin';
    }
    if (r === 'manager') {
      return 'manager';
    }
    if (r === 'tourist') {
      return 'tourist';
    }
    if (r === 'contentcreator') {
      return 'content-creator';
    }
    return 'tourist';
  }

  private syncBanState(user: UserDto): void {
    this.isBanned = !!user.isBanned;
    this.activeBanReason = (user.banReason ?? '').trim();
    this.activeBanExpiresLabel = this.formatDateTime(user.banExpiresAtUtc);
    this.activeBannedAtLabel = this.formatDateTime(user.bannedAtUtc);
  }

  private buildBanExpiryUtc(): string | null {
    if (this.isPermanentBanSelected) {
      return null;
    }

    const durationValue = Math.max(1, Math.floor(Number(this.banDurationValue) || 1));
    const expiresAt = new Date();

    switch (this.banDurationUnit) {
      case 'hours':
        expiresAt.setUTCHours(expiresAt.getUTCHours() + durationValue);
        break;
      case 'weeks':
        expiresAt.setUTCDate(expiresAt.getUTCDate() + durationValue * 7);
        break;
      case 'months':
        expiresAt.setUTCMonth(expiresAt.getUTCMonth() + durationValue);
        break;
      case 'days':
      default:
        expiresAt.setUTCDate(expiresAt.getUTCDate() + durationValue);
        break;
    }

    return expiresAt.toISOString();
  }

  private formatDateTime(value?: string | null): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(parsed);
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
        return 'Network error. Check that the API is running.';
      }
      if (err.status >= 500) {
        return 'Server error. Try again later.';
      }
    }
    return 'Could not save changes. Please try again.';
  }
}
