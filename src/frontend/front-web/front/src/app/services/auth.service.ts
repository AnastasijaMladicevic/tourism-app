import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CreateUserDto, LoginDto, AuthResponseDto, UserDto } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'https://localhost:7047/api/users';
  private tokenKey = 'token';
  private refreshTokenKey = 'refreshToken';
  private userKey = 'user';

  constructor(private http: HttpClient) {}

  login(dto: LoginDto): Observable<AuthResponseDto> {
      return this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, dto).pipe(
        tap((response) => {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.refreshTokenKey, response.refreshToken);
          localStorage.setItem(this.userKey, JSON.stringify(response.user));
        })
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

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
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

  getDashboardRouteForRole(role: string | null): string {
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
