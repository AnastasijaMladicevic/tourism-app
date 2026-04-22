import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environment/environment';

export interface LoginDto {
  email: string;
  password: string;
  rememberMe: boolean;
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
}

export interface AuthResponseDto {
  token: string;
  refreshToken: string;
  user: UserDto;
  expiresAt: string;
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

@Injectable({ providedIn: 'root' })
export class AuthService {
  private url = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  // POST /api/users/register
  register(dto: CreateUserDto): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.url}/register`, dto);
  }

  // POST /api/users/login
  login(dto: LoginDto): Observable<AuthResponseDto> {
    return this.http.post<AuthResponseDto>(`${this.url}/login`, dto).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('user', JSON.stringify(res.user));
      }),
    );
  }

  // POST /api/users/logout
  logout(): Observable<any> {
    return this.http.post(`${this.url}/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }),
    );
  }

  // POST /api/users/refresh
  refresh(): Observable<AuthResponseDto> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http
      .post<AuthResponseDto>(`${this.url}/refresh`, { refreshToken } as RefreshTokenDto)
      .pipe(
        tap((res) => {
          localStorage.setItem('token', res.token);
          localStorage.setItem('refreshToken', res.refreshToken);
          localStorage.setItem('user', JSON.stringify(res.user));
        }),
      );
  }

  getById(userId: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.url}/${userId}`).pipe(tap((user) => this.setCurrentUser(user)));
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
    return this.http.post<{ message: string }>(`${this.url}/${userId}/request-creator`, creatorType);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): UserDto | null {
    const u = localStorage.getItem('user');
    if (!u) {
      return null;
    }

    try {
      const user = JSON.parse(u) as UserDto;
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
  updateMyLocation(latitude: number, longitude: number): Observable<any> {
    return this.http.put(`${this.url}/me/location`, { latitude, longitude });
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

    if (role.includes('content-creator') || role.includes('contentcreator') || role.includes('creator')) {
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
