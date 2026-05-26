import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TimeoutError, forkJoin, of } from 'rxjs';
import {
  catchError,
  filter,
  finalize,
  map,
  startWith,
  switchMap,
  timeout
} from 'rxjs/operators';
import { ChangePasswordDto, UpdateUserDto, UserDto, UserEditLockDto } from '../../../models/user.model';
import { AdminUsersService, BanUserDto } from '../../../services/admin-users.service';

/** Mirrors role cards on create page; includes Admin when API returns it. */
export type DisplayRole = 'manager' | 'content-creator' | 'tourist' | 'admin';

type BanDurationOption = '30-days' | 'permanent' | 'custom';

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

  currentPassword = '';
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
  hasActiveSession = false;
  activeSessionExpiresLabel = '';
  banReason = '';
  banDuration: BanDurationOption = 'permanent';
  banCustomEndDate = '';
  editLockState: UserEditLockDto | null = null;
  isEditBlocked = false;
  private editLockHeartbeatId: number | null = null;

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
          return forkJoin({
            user: this.adminUsers.getUserById(userId).pipe(timeout(15000)),
            editLock: this.adminUsers.acquireEditLock(userId).pipe(
              catchError((err: unknown) =>
                of(
                  this.extractLockState(err) ?? {
                    userId,
                    isLocked: true,
                    isOwnedByCurrentUser: false,
                    message: this.extractApiMessage(err) || 'Could not start an edit session for this user.'
                  }
                )
              )
            )
          }).pipe(
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
      .subscribe((result) => {
        if (result) {
          this.applyUser(result.user);
          this.applyEditLockState(result.editLock);
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

    this.hasActiveSession = !!user.hasActiveSession;
    this.activeSessionExpiresLabel = this.formatDateTime(user.activeSessionExpiresAtUtc);
    this.syncBanState(user);
  }

  get isEditMode(): boolean {
    return Number.isFinite(this.userId) && this.userId >= 1;
  }

  get wantsPasswordChange(): boolean {
    return !!(this.password.trim() || this.confirmPassword.trim());
  }

  get currentPasswordRequired(): boolean {
    return this.wantsPasswordChange;
  }

  get passwordChangeBlockedByActiveSession(): boolean {
    return this.hasActiveSession;
  }

  get editLockDisplayMessage(): string {
    if (!this.editLockState || !this.isEditBlocked) {
      return '';
    }

    const lockedBy = this.editLockState.lockedByDisplayName?.trim() || 'Another admin';
    const expiresAt = this.editLockState.expiresAtUtc
      ? this.formatDateTime(this.editLockState.expiresAtUtc)
      : 'the current edit session ends';

    return `${lockedBy} is currently editing this user. Editing is temporarily disabled until ${expiresAt}.`;
  }

  get activeSessionBlockMessage(): string {
    if (!this.hasActiveSession) {
      return '';
    }

    if (this.activeSessionExpiresLabel) {
      return `This user is currently logged in. Ask them to log out before changing the password. Current session expires at ${this.activeSessionExpiresLabel}.`;
    }

    return 'This user is currently logged in. Ask them to log out before changing the password.';
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

  selectBanDuration(option: BanDurationOption): void {
    this.banDuration = option;
    if (option !== 'custom') {
      this.banCustomEndDate = '';
    }
    this.moderationError = '';
    this.cdr.markForCheck();
  }

  get banCustomDateMin(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return this.toDateInputValue(today);
  }

  get isBanDurationValid(): boolean {
    if (this.banDuration !== 'custom') {
      return true;
    }
    return !!this.resolveBanExpiresAtUtc();
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

  ngOnDestroy(): void {
    this.stopEditLockHeartbeat();
    this.releaseOwnedEditLock();
  }

  onCancel(): void {
    void this.router.navigate(['/admin/users']);
  }

  banUser(): void {
    this.moderationError = '';
    this.moderationSuccess = '';

    if (this.isEditBlocked) {
      this.moderationError = this.editLockDisplayMessage;
      return;
    }

    if (!this.canModerateBan) {
      this.moderationError = 'Only tourist and content creator accounts can be banned from this screen.';
      return;
    }

    const reason = this.banReason.trim();
    if (!reason) {
      this.moderationError = 'Please enter a ban reason.';
      return;
    }

    if (!this.isBanDurationValid) {
      this.moderationError = 'Choose an end date for a custom ban duration.';
      return;
    }

    const dto: BanUserDto = {
      reason,
      banExpiresAtUtc: this.resolveBanExpiresAtUtc()
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
          this.resetBanDurationForm();
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

    if (this.isEditBlocked) {
      this.moderationError = this.editLockDisplayMessage;
      return;
    }

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

    if (this.isEditBlocked) {
      this.submitError = this.editLockDisplayMessage;
      return;
    }

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
      if (this.passwordChangeBlockedByActiveSession) {
        this.submitError = this.activeSessionBlockMessage;
        return;
      }
      if (!this.currentPassword.trim()) {
        this.submitError = 'Current password is required before replacing this password.';
        return;
      }
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
          const dto: ChangePasswordDto = {
            currentPassword: this.currentPassword.trim(),
            newPassword: pwd,
            confirmPassword: confirm
          };
          return this.adminUsers.changeUserPassword(this.userId, dto);
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

  private toDateInputValue(value?: string | Date): string {
    if (!value) {
      return '';
    }
    const d = value instanceof Date ? value : new Date(value);
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

  private resetBanDurationForm(): void {
    this.banDuration = 'permanent';
    this.banCustomEndDate = '';
  }

  /** ISO UTC expiry for `POST /users/{id}/ban`; `null` = permanent. */
  private resolveBanExpiresAtUtc(): string | null {
    if (this.banDuration === 'permanent') {
      return null;
    }

    if (this.banDuration === '30-days') {
      const end = new Date();
      end.setUTCDate(end.getUTCDate() + 30);
      return end.toISOString();
    }

    const raw = this.banCustomEndDate.trim();
    if (!raw) {
      return null;
    }

    const parts = raw.split('-').map((part) => parseInt(part, 10));
    if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) {
      return null;
    }

    const end = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
    if (Number.isNaN(end.getTime()) || end.getTime() <= Date.now()) {
      return null;
    }

    return end.toISOString();
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

  private applyEditLockState(lockState: UserEditLockDto | null): void {
    this.editLockState = lockState;
    this.isEditBlocked = Boolean(lockState?.isLocked && !lockState.isOwnedByCurrentUser);

    if (lockState?.isOwnedByCurrentUser) {
      this.startEditLockHeartbeat();
    } else {
      this.stopEditLockHeartbeat();
    }
  }

  private startEditLockHeartbeat(): void {
    if (this.editLockHeartbeatId != null || !this.isEditMode) {
      return;
    }

    this.editLockHeartbeatId = window.setInterval(() => {
      this.adminUsers.refreshEditLock(this.userId).subscribe({
        next: (lockState) => {
          this.applyEditLockState(lockState);
          this.cdr.detectChanges();
        },
        error: (err: unknown) => {
          this.applyEditLockState(
            this.extractLockState(err) ?? {
              userId: this.userId,
              isLocked: true,
              isOwnedByCurrentUser: false,
              message: this.extractApiMessage(err) || 'Could not keep the edit session active.'
            }
          );
          this.cdr.detectChanges();
        }
      });
    }, 60000);
  }

  private stopEditLockHeartbeat(): void {
    if (this.editLockHeartbeatId == null) {
      return;
    }

    window.clearInterval(this.editLockHeartbeatId);
    this.editLockHeartbeatId = null;
  }

  private releaseOwnedEditLock(): void {
    if (!this.isEditMode || !this.editLockState?.isOwnedByCurrentUser) {
      return;
    }

    this.adminUsers.releaseEditLock(this.userId).subscribe({
      error: () => {
        // Best effort release on page exit.
      }
    });
  }

  private extractLockState(err: unknown): UserEditLockDto | null {
    const maybeError = err as {
      status?: number;
      error?: Partial<UserEditLockDto> & { message?: string };
    };

    if (maybeError?.status !== 409 || !maybeError.error) {
      return null;
    }

    const userId = Number(maybeError.error.userId ?? this.userId ?? 0);
    return {
      userId,
      isLocked: Boolean(maybeError.error.isLocked ?? true),
      isOwnedByCurrentUser: Boolean(maybeError.error.isOwnedByCurrentUser ?? false),
      lockedByUserId: maybeError.error.lockedByUserId,
      lockedByDisplayName: maybeError.error.lockedByDisplayName,
      acquiredAtUtc: maybeError.error.acquiredAtUtc,
      expiresAtUtc: maybeError.error.expiresAtUtc,
      message:
        typeof maybeError.error.message === 'string' && maybeError.error.message.trim().length > 0
          ? maybeError.error.message
          : 'Another admin is currently editing this user.'
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
        return 'Network error. Check that the API is running.';
      }
      if (err.status >= 500) {
        return 'Server error. Try again later.';
      }
    }
    return 'Could not save changes. Please try again.';
  }
}
