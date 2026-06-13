import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CreateUserDto, LoginDto, AuthResponseDto, UserDto } from '../models/user.model';
import { environment } from '../../environment/environment';
import { TranslationService } from './translation.service';
@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = `${environment.apiUrl}/users`;
  private tokenKey = 'token';
  private refreshTokenKey = 'refreshToken';
  private userKey = 'user';

  constructor(private http: HttpClient, private translationService: TranslationService) {
    this.syncStoredUserWithAuthenticatedRole();
  }


  getById(userId: number): Observable<UserDto> {
    return this.http
      .get<UserDto>(`${this.apiUrl}/${userId}`)
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  update(userId: number, dto: UpdateUserDto): Observable<UserDto> {
    return this.http
      .put<UserDto>(`${this.apiUrl}/${userId}`, dto)
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  updateProfileImage(userId: number, file: File): Observable<UserDto> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .put<UserDto>(`${this.apiUrl}/${userId}/profile-image`, formData)
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  removeProfileImage(userId: number): Observable<UserDto> {
    return this.http
      .delete<UserDto>(`${this.apiUrl}/${userId}/profile-image`)
      .pipe(tap((user) => this.setCurrentUser(user)));
  }

  changePassword(userId: number, dto: ChangePasswordDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${userId}/change-password`, dto);
  }

  requestCreatorRole(userId: number, creatorType: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/${userId}/request-creator`,
      JSON.stringify(creatorType),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
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
    if (!user.isBanned) {
      sessionStorage.removeItem('spirego-admin-ban-message');
    }
    window.dispatchEvent(new CustomEvent('auth-user-changed'));
  }
  isAdmin(): boolean {
    return this.getAuthenticatedRole() === 'admin';
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  verifyResetCode(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-reset-code`, data);
  }
  resetPassword(email: string, code: string, newPassword: string, confirmPassword: string, resetSessionToken: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { 
      email, 
      code, 
      newPassword,
      confirmPassword,
      resetSessionToken
    });
  }

  updateMyLocation(latitude: number, longitude: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/me/location`, { latitude, longitude });
  }

  getMyPreferredRegion(): Observable<UserPreferredRegionDto> {
    return this.http.get<UserPreferredRegionDto>(`${this.apiUrl}/me/preferred-region`);
  }

  updateMyPreferredRegion(dto: UpdateUserPreferredRegionDto): Observable<UserPreferredRegionDto> {
    return this.http.put<UserPreferredRegionDto>(`${this.apiUrl}/me/preferred-region`, dto);
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

  login(dto: LoginDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, dto).pipe(
      tap((response) => this.persistSession(response))
    );
  }

  register(data: CreateUserDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  saveToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  refresh(): Observable<AuthResponseDto> {
    return this.http
      .post<AuthResponseDto>(`${this.apiUrl}/refresh`, {
        refreshToken: this.getRefreshToken(),
      })
      .pipe(tap((response) => this.persistSession(response)));
  }

  logout(): void {
    const token = this.getToken();

    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    sessionStorage.removeItem('spirego-admin-ban-message');
    window.dispatchEvent(new CustomEvent('auth-user-changed'));

    if (token) {
      this.http
        .post(`${this.apiUrl}/logout`, {}, { headers: { Authorization: `Bearer ${token}` } })
        .subscribe({ error: () => {} });
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getUser(): UserDto | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) {
      return null;
    }

    try {
      const user = JSON.parse(raw) as UserDto;
      const authenticatedRole = this.getAuthenticatedRole();

      if (!authenticatedRole) {
        return user;
      }

      const normalizedUser: UserDto = {
        ...user,
        roleName: this.mapNormalizedRoleToBackendRole(authenticatedRole),
      };

      if (normalizedUser.roleName !== user.roleName) {
        localStorage.setItem(this.userKey, JSON.stringify(normalizedUser));
      }

      return normalizedUser;
    } catch {
      return null;
    }
  }

  getNormalizedRole(user?: UserDto | null): string | null {
    const source = user ?? this.getUser();
    const normalizedTokenRole = this.getAuthenticatedRole();

    // Always trust the signed JWT claim over mutable local storage user data.
    if (normalizedTokenRole) {
      return normalizedTokenRole;
    }

    if (!source) {
      return null;
    }

    const rawRole = source.roleName || source.role || source.userType || source.roles?.[0] || null;
    return this.normalizeRawRole(rawRole);
  }

  getAuthenticatedRole(): string | null {
    return this.normalizeRawRole(this.getRoleFromToken());
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
      const paddedBase64Payload = base64Payload.padEnd(base64Payload.length + ((4 - (base64Payload.length % 4)) % 4), '=');
      const decodedPayload = decodeURIComponent(
        atob(paddedBase64Payload)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
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

    if (role.includes('content-creator') || role.includes('contentcreator') || role.includes('creator')) {
      return 'content-creator';
    }

    return role;
  }

  private mapNormalizedRoleToBackendRole(role: string): string {
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

  isBannedContentCreator(user?: UserDto | null): boolean {
    const role = this.getNormalizedRole(user ?? this.getUser());
    if (role !== 'content-creator') {
      return false;
    }

    return this.hasActiveBan(user ?? this.getUser());
  }

  hasActiveBan(user?: UserDto | null): boolean {
    const snapshot = user ?? this.getUser();
    return !!snapshot?.isBanned;
  }

  getBanSnapshot(user?: UserDto | null): {
    reason: string;
    expiresAtUtc: string | null;
    isPermanent: boolean;
  } {
    const snapshot = user ?? this.getUser();
    const expiresAtUtc = snapshot?.banExpiresAtUtc?.trim() || null;

    return {
      reason: snapshot?.banReason?.trim() || 'Krsenje pravila platforme.',
      expiresAtUtc,
      isPermanent: !!snapshot?.isBanned && !expiresAtUtc,
    };
  }

  getAccountBannedRoute(): string {
    return '/account-banned';
  }

  private persistSession(response: AuthResponseDto): void {
    const user: UserDto = {
      ...response.user,
      isBanned: response.isBanned ?? response.user?.isBanned ?? false,
      banReason: response.banReason ?? response.user?.banReason ?? null,
      banExpiresAtUtc: response.banExpiresAtUtc ?? response.user?.banExpiresAtUtc ?? null,
    };

    localStorage.setItem(this.tokenKey, response.token);
    localStorage.setItem(this.refreshTokenKey, response.refreshToken);
    localStorage.setItem(this.userKey, JSON.stringify(user));

    if (user.language) {
      this.translationService.setLanguage(user.language);
    }

    if (response.isBanned && response.banMessage?.trim()) {
      sessionStorage.setItem('spirego-admin-ban-message', response.banMessage.trim());
    } else {
      sessionStorage.removeItem('spirego-admin-ban-message');
    }
    window.dispatchEvent(new CustomEvent('auth-user-changed'));
  }

  getDashboardRouteForRole(role: string | null): string {
    if (role === 'content-creator' && this.isBannedContentCreator()) {
      return this.getAccountBannedRoute();
    }

    switch (role) {
      case 'admin':
        return '/admin/dashboard';
      case 'content-creator':
        return '/content-creator/dashboard';
      case 'manager':
        return '/manager/dashboard';
      case 'tourist':
        return '/login';
      default:
        return '/login';
    }
  }

  getDashboardRouteFromStoredUser(): string {
    return this.getDashboardRouteForRole(this.getAuthenticatedRole() ?? this.getNormalizedRole());
  }

  hasAnyRole(allowedRoles: string[]): boolean {
    const normalizedCurrentRole = this.getAuthenticatedRole();
    if (!normalizedCurrentRole) {
      return false;
    }

    const normalizedAllowedRoles = allowedRoles
      .map((role) => this.normalizeRawRole(role))
      .filter((role): role is string => !!role);

    return normalizedAllowedRoles.includes(normalizedCurrentRole);
  }
}


export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface UpdateUserDto {
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  country?: string | null;
  language?: string | null;
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

