import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

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
  private readonly apiUrl = `${environment.apiUrl}/Users`;

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
}
