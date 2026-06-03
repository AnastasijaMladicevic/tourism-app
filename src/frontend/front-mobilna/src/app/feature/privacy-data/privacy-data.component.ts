import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { RouterHistoryService } from '../../services/router-history';

@Component({
  selector: 'app-privacy-data',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './privacy-data.component.html',
  styleUrl: './privacy-data.component.scss',
})
export class PrivacyDataComponent {
  private readonly routerHistory = inject(RouterHistoryService);

  goBack(): void {
    this.routerHistory.goBack('/settings');
  }
  protected readonly sections = [
    { titleKey: 'privacy.section.1.title', bodyKey: 'privacy.section.1.body' },
    { titleKey: 'privacy.section.2.title', bodyKey: 'privacy.section.2.body' },
    { titleKey: 'privacy.section.3.title', bodyKey: 'privacy.section.3.body' },
  ];

  protected readonly noteKeys = ['privacy.note.1', 'privacy.note.2', 'privacy.note.3'];
}
