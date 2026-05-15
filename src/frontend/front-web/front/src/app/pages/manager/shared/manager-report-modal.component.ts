import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ManagerReportsService } from '../../../services/manager-reports.service';
import { REPORT_CATEGORY_OPTIONS } from './concerning-reply.util';

export interface ReportableCreatorOption {
  id: number;
  name: string;
  contentSummary: string;
  hasPendingReport: boolean;
}

@Component({
  selector: 'app-manager-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manager-report-modal.component.html',
  styleUrls: ['./manager-report-modal.component.css'],
})
export class ManagerReportModalComponent implements OnChanges {
  private readonly managerReportsService = inject(ManagerReportsService);

  @Input() open = false;
  @Input() creators: ReportableCreatorOption[] = [];
  @Input() initialCreatorId: number | null = null;
  @Input() initialCategory = 'unprofessional_conduct';
  @Input() initialReason = '';

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  readonly reportCategoryOptions = REPORT_CATEGORY_OPTIONS;

  reportForm = {
    creatorId: null as number | null,
    category: 'unprofessional_conduct',
    reason: '',
  };

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  get availableCreators(): ReportableCreatorOption[] {
    return this.creators.filter((creator) => !creator.hasPendingReport);
  }

  ngOnChanges(): void {
    if (this.open) {
      this.resetForm();
    }
  }

  close(): void {
    if (this.isSubmitting) {
      return;
    }
    this.closed.emit();
  }

  submit(): void {
    const creatorId = this.reportForm.creatorId;
    const reason = this.reportForm.reason.trim();
    if (!creatorId || !reason || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.managerReportsService
      .createReport({ reportedUserId: creatorId, reason })
      .pipe(
        finalize(() => {
          this.isSubmitting = false;
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage = 'Report submitted. Admin will review your submission.';
          this.submitted.emit();
          setTimeout(() => this.close(), 600);
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage = error?.error?.message ?? 'Failed to submit report.';
        },
      });
  }

  private resetForm(): void {
    this.reportForm = {
      creatorId: this.initialCreatorId,
      category: this.initialCategory || 'unprofessional_conduct',
      reason: this.initialReason,
    };
    this.errorMessage = '';
    this.successMessage = '';
    this.isSubmitting = false;
  }
}
