import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { RouterHistoryService } from '../../services/router-history';
import { AppTheme, ThemeService } from '../../services/theme';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-appearance',
  imports: [CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './appearance.component.html',
  styleUrls: ['./appearance.component.scss'],
})
export class AppearanceComponent {
  private readonly routerHistoryService = inject(RouterHistoryService);
  private readonly themeService = inject(ThemeService);

  protected readonly options: Array<{
    value: AppTheme;
    icon: string;
    titleKey: string;
    bodyKey: string;
  }> = [
    {
      value: 'light',
      icon: 'light_mode',
      titleKey: 'appearance.options.light.title',
      bodyKey: 'appearance.options.light.body',
    },
    {
      value: 'dark',
      icon: 'dark_mode',
      titleKey: 'appearance.options.dark.title',
      bodyKey: 'appearance.options.dark.body',
    },
  ];

  protected goBack(): void {
    this.routerHistoryService.goBack();
  }

  protected setTheme(theme: AppTheme): void {
    this.themeService.setTheme(theme);
  }

  protected isSelected(theme: AppTheme): boolean {
    return this.themeService.theme() === theme;
  }
}
