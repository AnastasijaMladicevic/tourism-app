import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environment/environment';
import { ActiveRegionService } from './active-region';

export interface LoginDto {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface GoogleLoginDto {
  idToken: string;
  rememberMe: boolean;
  language?: string | null;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  email: string;
  password: string;
  phoneNumber?: string | null;
  country?: string | null;
  language?: string;
}

export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  country?: string | null;
  language?: string;
  profileImageUrl?: string | null;
  roleName: string;
  isActive: boolean;
  isVerified: boolean;
  isTwoFactorEnabled?: boolean;
  favoritesCount?: number;
  plansCount?: number;
  reviewsCount?: number;
  hasRequestedCreatorRole: boolean;
  creatorRoleRequestStatus: 'None' | 'Pending' | 'Approved' | 'Rejected';
}

export interface AuthResponseDto {
  token?: string | null;
  refreshToken?: string | null;
  user?: UserDto | null;
  expiresAt?: string | null;
  requiresTwoFactor?: boolean;
  twoFactorChallengeToken?: string | null;
  twoFactorExpiresAt?: string | null;
  twoFactorDeliveryTarget?: string | null;
}

export interface PublicAuthSettingsDto {
  googleClientId?: string | null;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface UpdateUserDto {
  firstName?: string | null;
  lastName?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  language?: string | null;
}

export interface TwoFactorSettingsDto {
  isEnabled: boolean;
  deliveryMethod: string;
  maskedEmailAddress?: string | null;
}

export interface VerifyTwoFactorLoginDto {
  challengeToken: string;
  code: string;
}

export interface ResendTwoFactorLoginCodeDto {
  challengeToken: string;
}

export interface UserPreferredRegionDto {
  preferredRegionId?: number | null;
  effectiveRegionId?: number | null;
  effectiveRegionName?: string | null;
  effectiveRegionCode?: string | null;
  centerLongitude?: number | null;
  centerLatitude?: number | null;
  defaultMapZoom?: number | null;
  isDefaultFallback: boolean;
}

export interface UpdateUserPreferredRegionDto {
  regionId?: number | null;
}

export interface UpdateUserLocationPayload {
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  recordedAtUtc?: string | null;
}

export interface VisitedPlaceDto {
  id: number;
  kind: 'destination' | 'locality';
  name: string;
  destinationName?: string | null;
  regionName?: string | null;
  latitude: number;
  longitude: number;
  visitedAtUtc: string;
}

export interface LocationShareDto {
  shareUrl: string;
  expiresAtUtc: string;
}

export interface CreateLocationSharePayload {
  durationHours: number;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number | null;
  recordedAtUtc?: string | null;
}

export interface SharedLocationDto {
  displayName: string;
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
  updatedAtUtc: string;
  expiresAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private url = `${environment.apiUrl}/users`;

  constructor(
    private http: HttpClient,
    private activeRegionService: ActiveRegionService,
  ) {
    this.syncStoredUserWithAuthenticatedRole();
  }

  register(dto: CreateUserDto): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.url}/register`, dto);
  }

  login(dto: LoginDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.url}/login`, dto).pipe(
      tap((res) => this.persistSessionIfComplete(res)),
    );
  }

  loginWithGoogle(dto: GoogleLoginDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.url}/login/google`, dto).pipe(
      tap((res) => this.persistSessionIfComplete(res)),
    );
  }

  getPublicAuthSettings(): Observable<PublicAuthSettingsDto> {
    return this.http.get<PublicAuthSettingsDto>(`${this.url}/auth-settings`);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.url}/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        void this.activeRegionService.loadInitialRegion();
      }),
    );
  }

  refresh(): Observable<AuthResponseDto> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http
      .post<AuthResponseDto>(`${this.url}/refresh`, { refreshToken } as RefreshTokenDto)
      .pipe(tap((res) => this.persistSessionIfComplete(res)));
  }

  verifyTwoFactorLogin(dto: VerifyTwoFactorLoginDto): Observable<AuthResponseDto> {
    return this.http
      .post<AuthResponseDto>(`${this.url}/login/verify-2fa`, dto)
      .pipe(tap((res) => this.persistSessionIfComplete(res)));
  }

  resendTwoFactorLoginCode(dto: ResendTwoFactorLoginCodeDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.url}/login/resend-2fa`, dto);
  }

  getById(userId: number): Observable<UserDto> {
    return this.http
      .get<UserDto>(`${this.url}/${userId}`)
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  update(userId: number, dto: UpdateUserDto): Observable<UserDto> {
    return this.http
      .put<UserDto>(`${this.url}/${userId}`, dto)
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  updateProfileImage(userId: number, file: File): Observable<UserDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .put<UserDto>(`${this.url}/${userId}/profile-image`, formData)
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  removeProfileImage(userId: number): Observable<UserDto> {
    return this.http
      .delete<UserDto>(`${this.url}/${userId}/profile-image`)
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  changePassword(userId: number, dto: ChangePasswordDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.url}/${userId}/change-password`, dto);
  }

  requestCreatorRole(userId: number, creatorType: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.url}/${userId}/request-creator`,
      JSON.stringify(creatorType),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): UserDto | null {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return null;
    }

    try {
      return this.normalizeUser(JSON.parse(raw) as UserDto);
    } catch {
      return null;
    }
  }

  setCurrentUser(user: UserDto): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getAuthenticatedRole(): string | null {
    return this.normalizeRawRole(this.getRoleFromToken());
  }

  isAdmin(): boolean {
    return this.getAuthenticatedRole() === 'admin';
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.url}/forgot-password`, { email });
  }

  verifyResetCode(data: any): Observable<any> {
    return this.http.post(`${this.url}/verify-reset-code`, data);
  }
  resetPassword(email: string, code: string, newPassword: string, confirmPassword: string, resetSessionToken: string): Observable<any> {
    return this.http.post(`${this.url}/reset-password`, {
      email,
      code,
      newPassword,
      confirmPassword,
      resetSessionToken
    });
  }

  updateMyLocation(payload: UpdateUserLocationPayload): Observable<any> {
    return this.http.put(`${this.url}/me/location`, payload);
  }

  getMyPreferredRegion(): Observable<UserPreferredRegionDto> {
    return this.http.get<UserPreferredRegionDto>(`${this.url}/me/preferred-region`);
  }

  getMyTwoFactorSettings(): Observable<TwoFactorSettingsDto> {
    return this.http.get<TwoFactorSettingsDto>(`${this.url}/me/two-factor-settings`);
  }

  updateMyTwoFactorSettings(isEnabled: boolean): Observable<TwoFactorSettingsDto> {
    return this.http
      .put<TwoFactorSettingsDto>(`${this.url}/me/two-factor-settings`, { isEnabled })
      .pipe(
        tap((settings) => {
          const currentUser = this.getCurrentUser();
          if (!currentUser) {
            return;
          }

          this.setCurrentUser({
            ...currentUser,
            isTwoFactorEnabled: settings.isEnabled,
          });
        }),
      );
  }

  updateMyPreferredRegion(dto: UpdateUserPreferredRegionDto): Observable<UserPreferredRegionDto> {
    return this.http.put<UserPreferredRegionDto>(`${this.url}/me/preferred-region`, dto);
  }

  getVisitedPlaces(limit = 12): Observable<VisitedPlaceDto[]> {
    return this.http.get<VisitedPlaceDto[]>(`${this.url}/me/visited-places`, {
      params: { limit },
    });
  }

  createLocationShare(
    durationHours: number,
    location?: UpdateUserLocationPayload | null,
  ): Observable<LocationShareDto> {
    const payload: CreateLocationSharePayload = {
      durationHours,
      latitude: location?.latitude ?? undefined,
      longitude: location?.longitude ?? undefined,
      accuracyMeters: location?.accuracyMeters ?? undefined,
      recordedAtUtc: location?.recordedAtUtc ?? undefined,
    };

    return this.http.post<LocationShareDto>(`${this.url}/me/location-share`, payload);
  }

  resolveLocationShare(token: string): Observable<SharedLocationDto> {
    return this.http.get<SharedLocationDto>(`${this.url}/location-share`, {
      params: { token },
    });
  }

  private syncStoredUserWithAuthenticatedRole(): void {
    const storedUser = this.readStoredUser();
    if (!storedUser) {
      return;
    }

    try {
      this.normalizeUser(storedUser);
    } catch {
      localStorage.removeItem('user');
    }
  }

  private normalizeUser(user: UserDto): UserDto {
    const authenticatedRole = this.getAuthenticatedRole();

    if (!authenticatedRole) {
      return user;
    }

    const normalizedUser = {
      ...user,
      roleName: this.mapNormalizedRoleToBackendRole(authenticatedRole),
    };

    if (normalizedUser.roleName !== user.roleName) {
      this.setCurrentUser(normalizedUser);
    }

    return normalizedUser;
  }

  private persistSessionIfComplete(response: AuthResponseDto): void {
    if (!response.token || !response.refreshToken || !response.user) {
      return;
    }

    localStorage.setItem('token', response.token);
    localStorage.setItem('refreshToken', response.refreshToken);
    this.setCurrentUser(response.user);
    void this.activeRegionService.loadInitialRegion();
  }

  private readStoredUser(): UserDto | null {
    const raw = localStorage.getItem('user');
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserDto;
    } catch {
      return null;
    }
  }

  private getRoleFromToken(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64Payload = base64Payload.padEnd(
        base64Payload.length + ((4 - (base64Payload.length % 4)) % 4),
        '=',
      );
      const decodedPayload = decodeURIComponent(
        atob(paddedBase64Payload)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );

      const payload = JSON.parse(decodedPayload) as Record<string, unknown>;
      const directRole = payload['role'];
      const claimRole = payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
      const roles = payload['roles'];

      if (typeof directRole === 'string') {
        return directRole;
      }

      if (typeof claimRole === 'string') {
        return claimRole;
      }

      if (Array.isArray(roles)) {
        const firstRole = roles.find((value): value is string => typeof value === 'string');
        if (firstRole) {
          return firstRole;
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  private normalizeRawRole(rawRole: string | null | undefined): string | null {
    if (!rawRole) {
      return null;
    }

    const role = rawRole.toLowerCase().replace(/[_\s]+/g, '-');

    if (role.includes('admin')) {
      return 'admin';
    }

    if (role.includes('manager')) {
      return 'manager';
    }

    if (
      role.includes('content-creator') ||
      role.includes('contentcreator') ||
      role.includes('creator')
    ) {
      return 'content-creator';
    }

    if (role.includes('tourist')) {
      return 'tourist';
    }

    return role;
  }

  private mapNormalizedRoleToBackendRole(role: string): UserDto['roleName'] {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Manager';
      case 'content-creator':
        return 'ContentCreator';
      case 'tourist':
        return 'Tourist';
      default:
        return role;
    }
  }
}
