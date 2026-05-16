import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type ModerationRuleSection = {
  number: number;
  icon: string;
  titleKey: string;
  bodyKey: string;
};

@Component({
  selector: 'app-moderation-rules',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './moderation-rules.component.html',
  styleUrl: './moderation-rules.component.scss',
})
export class ModerationRulesComponent {
  protected readonly sections: ModerationRuleSection[] = [
    {
      number: 1,
      icon: 'shield',
      titleKey: 'moderationRules.sections.role.title',
      bodyKey: 'moderationRules.sections.role.body',
    },
    {
      number: 2,
      icon: 'file',
      titleKey: 'moderationRules.sections.obligations.title',
      bodyKey: 'moderationRules.sections.obligations.body',
    },
    {
      number: 3,
      icon: 'check',
      titleKey: 'moderationRules.sections.allowed.title',
      bodyKey: 'moderationRules.sections.allowed.body',
    },
    {
      number: 4,
      icon: 'ban',
      titleKey: 'moderationRules.sections.forbidden.title',
      bodyKey: 'moderationRules.sections.forbidden.body',
    },
    {
      number: 5,
      icon: 'info',
      titleKey: 'moderationRules.sections.standards.title',
      bodyKey: 'moderationRules.sections.standards.body',
    },
    {
      number: 6,
      icon: 'balance',
      titleKey: 'moderationRules.sections.fairness.title',
      bodyKey: 'moderationRules.sections.fairness.body',
    },
    {
      number: 7,
      icon: 'alert',
      titleKey: 'moderationRules.sections.penalties.title',
      bodyKey: 'moderationRules.sections.penalties.body',
    },
    {
      number: 8,
      icon: 'bolt',
      titleKey: 'moderationRules.sections.acceptance.title',
      bodyKey: 'moderationRules.sections.acceptance.body',
    },
  ];

  protected iconPath(icon: string): string {
    switch (icon) {
      case 'shield':
        return 'M12 3.75 18 6.2v5.15c0 3.52-2.37 6.77-6 8.05-3.63-1.28-6-4.53-6-8.05V6.2l6-2.45Z';
      case 'file':
        return 'M8 4.75h5.4l3.85 3.85v9.9A1.75 1.75 0 0 1 15.5 20.25h-7A1.75 1.75 0 0 1 6.75 18.5v-12A1.75 1.75 0 0 1 8.5 4.75Zm5 .75v3.25h3.25';
      case 'check':
        return 'M7.75 12.25 10.4 14.9l5.85-5.8M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z';
      case 'ban':
        return 'M8.45 8.45 15.55 15.55M15.55 8.45 8.45 15.55M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z';
      case 'info':
        return 'M12 10.25v4.5M12 7.9h.01M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z';
      case 'balance':
        return 'M12 5v13.5M8.75 5h6.5M6.75 8.5 4.5 12h4.5l-2.25-3.5Zm12.75 0L17.25 12h4.5L19.5 8.5ZM6 18.5h12';
      case 'alert':
        return 'M12 7.75v4.5M12 15.75h.01M4.75 17.25 10.8 6.4a1.37 1.37 0 0 1 2.4 0l6.05 10.85a1.38 1.38 0 0 1-1.2 2.05H5.95a1.38 1.38 0 0 1-1.2-2.05Z';
      case 'bolt':
        return 'm12.65 4.75-4.3 6.15h3.15l-.8 8.35 4.95-7.15h-3.25l.25-7.35Z';
      default:
        return '';
    }
  }
}
