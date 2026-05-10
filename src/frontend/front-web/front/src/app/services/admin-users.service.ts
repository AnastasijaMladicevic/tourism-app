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

  searchManagers(search: string, pageSize = 20): Observable<PagedUsersResultDto> {
    let params = new HttpParams().set('role', 'Manager').set('page', '1').set('pageSize', String(pageSize));
    const term = search.trim();
    if (term) {
      params = params.set('search', term);
    }
    return this.http.get<PagedUsersResultDto>(this.apiUrl, { params });
  }
}
