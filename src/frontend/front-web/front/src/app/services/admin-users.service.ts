import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { ChangePasswordDto, CreateUserDto, UpdateUserDto, UserDto } from '../models/user.model';

export interface AdminUserListItemDto {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roleName: string;
  profileImageUrl?: string | null;
  country?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export interface PagedUsersResultDto {
  items: AdminUserListItemDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  getUsers(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    role?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Observable<PagedUsersResultDto> {
    let params = new HttpParams()
      .set('page', String(options?.page ?? 1))
      .set('pageSize', String(options?.pageSize ?? 50))
      .set('sortBy', options?.sortBy ?? 'createdAt')
      .set('sortOrder', options?.sortOrder ?? 'desc');

    const search = options?.search?.trim();
    if (search) {
      params = params.set('search', search);
    }

    const role = options?.role?.trim();
    if (role) {
      params = params.set('role', role);
    }

    return this.http.get<PagedUsersResultDto>(this.apiUrl, { params });
  }

  searchManagers(search: string, pageSize = 20): Observable<PagedUsersResultDto> {
    return this.getUsers({
      page: 1,
      pageSize,
      role: 'Manager',
      search,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  }

  /** Admin-only: creates a user with Manager role (`POST .../users/register-manager`). */
  createManager(dto: CreateUserDto): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.apiUrl}/register-manager`, dto);
  }

  /** Creates a tourist account (`POST .../users/register`). Typically used from signup; admins may use it to add tourists. */
  createTourist(dto: CreateUserDto): Observable<UserDto> {
    return this.http.post<UserDto>(`${this.apiUrl}/register`, dto);
  }

  getUserById(id: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/${id}`);
  }

  updateUser(id: number, dto: UpdateUserDto): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.apiUrl}/${id}`, dto);
  }

  changeUserPassword(id: number, dto: ChangePasswordDto): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/change-password`, dto);
  }
}
