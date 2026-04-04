import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environment/environment';

export interface LoginDto {
  email: string;
  password: string;
}

export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface UserDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
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
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('refreshToken', res.refreshToken);
        localStorage.setItem('user', JSON.stringify(res.user));
      })
    );
  }

  // POST /api/users/logout
  logout(): Observable<any> {
    return this.http.post(`${this.url}/logout`, {}).pipe(
      tap(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      })
    );
  }

  // POST /api/users/refresh
  refresh(): Observable<AuthResponseDto> {
    const refreshToken = localStorage.getItem('refreshToken');
    return this.http.post<AuthResponseDto>(`${this.url}/refresh`, { refreshToken } as RefreshTokenDto).pipe(
      tap(res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('refreshToken', res.refreshToken);
      })
    );
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): UserDto | null {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
}
