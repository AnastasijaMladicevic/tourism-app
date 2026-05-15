import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

export type ReportStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ManagerReportRow {
  id: number;
  reportedUserName: string;
  reportedUserEmail: string;
  reason: string;
  status: ReportStatus;
  destinationName: string;
  createdAt: string;
  resolvedAt?: string;
  rejectionReason?: string;
}

export interface ReportableCreator {
  id: number;
  name: string;
  email: string;
  contentSummary: string;
  hasPendingReport: boolean;
}

@Component({
  selector: 'app-manager-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manager-reports.component.html',
  styleUrls: ['./manager-reports.component.css'],
})
export class ManagerReportsComponent {
  readonly managedDestination = 'Kotor Bay';

  readonly reportCategoryOptions = [
    { value: '', label: 'Select a category (optional)' },
    { value: 'inappropriate_content', label: 'Inappropriate or misleading content' },
    { value: 'repeated_violations', label: 'Repeated policy violations' },
    { value: 'unprofessional_conduct', label: 'Unprofessional conduct' },
    { value: 'spam_abuse', label: 'Spam or platform abuse' },
    { value: 'other', label: 'Other (describe below)' },
  ];

  /** Mock data — replace with API when wiring backend. */
  readonly allReports: ManagerReportRow[] = [
    {
      id: 1042,
      reportedUserName: 'Marko Petrović',
      reportedUserEmail: 'marko.p@example.com',
      reason:
        'Repeated submissions with misleading descriptions after two rejections. Content does not match destination guidelines.',
      status: 'Pending',
      destinationName: 'Kotor Bay',
      createdAt: '2026-05-14T09:22:00Z',
    },
    {
      id: 1031,
      reportedUserName: 'Ana Jović',
      reportedUserEmail: 'ana.jovic@example.com',
      reason: 'Offensive language in review replies to tourists on multiple objects.',
      status: 'Approved',
      destinationName: 'Kotor Bay',
      createdAt: '2026-05-02T14:10:00Z',
      resolvedAt: '2026-05-04T11:30:00Z',
    },
    {
      id: 1018,
      reportedUserName: 'Luka Mirić',
      reportedUserEmail: 'luka.m@example.com',
      reason: 'Uploaded duplicate events with incorrect dates; ignored manager feedback.',
      status: 'Rejected',
      destinationName: 'Kotor Bay',
      createdAt: '2026-04-20T08:45:00Z',
      resolvedAt: '2026-04-22T16:00:00Z',
      rejectionReason: 'Insufficient evidence — content issues were resolved through standard review.',
    },
  ];

  readonly reportableCreators: ReportableCreator[] = [
    {
      id: 201,
      name: 'Marko Petrović',
      email: 'marko.p@example.com',
      contentSummary: '3 objects · 2 events · 1 activity',
      hasPendingReport: true,
    },
    {
      id: 202,
      name: 'Jelena Vuković',
      email: 'jelena.v@example.com',
      contentSummary: '1 object · 4 activities',
      hasPendingReport: false,
    },
    {
      id: 203,
      name: 'Stefan Nikolić',
      email: 'stefan.n@example.com',
      contentSummary: '2 events in your destination',
      hasPendingReport: false,
    },
  ];

  draftSearchQuery = '';
  searchQuery = '';
  statusFilter: 'all' | ReportStatus = 'all';
  filterPanelOpen = false;

  reportModalOpen = false;
  reportForm = {
    creatorId: null as number | null,
    category: '',
    reason: '',
  };

  selectedReport: ManagerReportRow | null = this.allReports[0];

  get pendingCount(): number {
    return this.allReports.filter((r) => r.status === 'Pending').length;
  }

  get filteredReports(): ManagerReportRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    return this.allReports.filter((report) => {
      if (this.statusFilter !== 'all' && report.status !== this.statusFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        report.reportedUserName.toLowerCase().includes(q) ||
        report.reason.toLowerCase().includes(q) ||
        String(report.id).includes(q)
      );
    });
  }

  get availableCreators(): ReportableCreator[] {
    return this.reportableCreators.filter((c) => !c.hasPendingReport);
  }

  onSearchEnter(event: Event): void {
    event.preventDefault();
    this.searchQuery = this.draftSearchQuery.trim();
  }

  onApplyFilters(): void {
    this.filterPanelOpen = false;
  }

  onResetFilters(): void {
    this.statusFilter = 'all';
    this.draftSearchQuery = '';
    this.searchQuery = '';
    this.filterPanelOpen = false;
  }

  toggleFilters(): void {
    this.filterPanelOpen = !this.filterPanelOpen;
  }

  selectReport(report: ManagerReportRow): void {
    this.selectedReport = report;
  }

  openReportModal(creator?: ReportableCreator): void {
    this.reportForm = {
      creatorId: creator?.id ?? null,
      category: '',
      reason: '',
    };
    this.reportModalOpen = true;
  }

  closeReportModal(): void {
    this.reportModalOpen = false;
  }

  submitReport(): void {
    this.closeReportModal();
  }

  withdrawReport(report: ManagerReportRow, event: Event): void {
    event.stopPropagation();
    if (report.status !== 'Pending') {
      return;
    }
  }

  formatStatus(status: ReportStatus): string {
    return status;
  }

  getStatusClass(status: ReportStatus): string {
    if (status === 'Approved') return 'published';
    if (status === 'Rejected') return 'rejected';
    return 'draft';
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  trackByReportId(_: number, report: ManagerReportRow): number {
    return report.id;
  }
}
