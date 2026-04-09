import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { CreateUserDto, LoginDto, AuthResponseDto } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'https://localhost:7047/api/users';

  constructor(private http: HttpClient) {}

  login(dto: LoginDto): Observable<AuthResponseDto> {
      return this.http.post<AuthResponseDto>(`${this.apiUrl}/login`, dto).pipe(
        tap((response) => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('refreshToken', response.refreshToken);
          localStorage.setItem('user', JSON.stringify(response.user));
        })
      );
    }

  register(data: CreateUserDto): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  saveToken(token: string): void {
    localStorage.setItem('token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  logout(): void {
    localStorage.removeItem('token');
  }
}