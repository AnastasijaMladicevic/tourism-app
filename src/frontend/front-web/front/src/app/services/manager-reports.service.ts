import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface ManagerReportDto {
  id: number;
  managerId: number;
  managerName: string;
  destinationName: string;
  reportedUserId: number;
  reportedUserName: string;
  reason: string;
  status: string;
  resolvedByUserId?: number | null;
  resolvedByName?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface CreateManagerReportDto {
  reportedUserId: number;
  reason: string;
}

export interface ManagerReportQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface PagedManagerReports {
  items: ManagerReportDto[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

@Injectable({ providedIn: 'root' })
export class ManagerReportsService {
  private readonly baseUrl = `${environment.apiUrl}/manager-reports`;

  constructor(private readonly http: HttpClient) {}

  getMyReports(query?: ManagerReportQueryParams): Observable<PagedManagerReports> {
    let params = new HttpParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get<PagedManagerReports>(`${this.baseUrl}/my`, { params });
  }

  createReport(dto: CreateManagerReportDto): Observable<ManagerReportDto> {
    return this.http.post<ManagerReportDto>(this.baseUrl, dto);
  }

  withdrawReport(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /** Admin: all manager escalations (`GET /api/manager-reports`). */
  getAllReports(query?: ManagerReportQueryParams): Observable<PagedManagerReports> {
    let params = new HttpParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value != null && value !== '') {
          params = params.set(key, String(value));
        }
      });
    }
    return this.http.get<PagedManagerReports>(this.baseUrl, { params });
  }
}
