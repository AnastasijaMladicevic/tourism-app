import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { ManagerReportsService } from '../../../services/manager-reports.service';
import { REPORT_CATEGORY_OPTIONS } from './concerning-reply.util';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../services/translation.service';

export interface ReportableCreatorOption {
  id: number;
  name: string;
  contentSummary: string;
  hasPendingReport: boolean;
}

@Component({
  selector: 'app-manager-report-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './manager-report-modal.component.html',
  styleUrls: ['./manager-report-modal.component.css'],
})
export class ManagerReportModalComponent implements OnChanges {
  private readonly managerReportsService = inject(ManagerReportsService);
  readonly translationService = inject(TranslationService);

  @Input() open = false;
  @Input() creators: ReportableCreatorOption[] = [];
  @Input() initialCreatorId: number | null = null;
  @Input() initialCategory = 'unprofessional_conduct';
  @Input() initialReason = '';
  @Input() subjectType: 'creator' | 'tourist' = 'creator';

  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

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

  get titleKey(): string {
    return this.subjectType === 'tourist' ? 'manager.reportModal.titleTourist' : 'manager.reportModal.title';
  }

  get subtitleKey(): string {
    return this.subjectType === 'tourist' ? 'manager.reportModal.subtitleTourist' : 'manager.reportModal.subtitle';
  }

  get fieldLabelKey(): string {
    return this.subjectType === 'tourist' ? 'manager.reportModal.tourist' : 'manager.reportModal.creator';
  }

  get selectPlaceholderKey(): string {
    return this.subjectType === 'tourist' ? 'manager.reportModal.selectTourist' : 'manager.reportModal.selectCreator';
  }

  get noOptionsKey(): string {
    return this.subjectType === 'tourist' ? 'manager.reportModal.noTourists' : 'manager.reportModal.noCreators';
  }

  get warningKey(): string {
    return this.subjectType === 'tourist' ? 'manager.reportModal.warningTourist' : 'manager.reportModal.warning';
  }

  get reportCategoryOptions(): Array<{ value: string; label: string }> {
    return REPORT_CATEGORY_OPTIONS.map((option) => ({
      value: option.value,
      label: this.translationService.translate(
        `manager.reportModal.categories.${option.value || 'placeholder'}`,
      ),
    }));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.open && changes['open']) {
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
          this.successMessage = this.translationService.translate(
            'manager.reportModal.successSubmittedReview',
          );
          this.submitted.emit();
          setTimeout(() => this.close(), 600);
        },
        error: (error: { error?: { message?: string } }) => {
          this.errorMessage =
            error?.error?.message ??
            this.translationService.translate('manager.reportModal.errorSubmit');
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
