import { CommonModule, Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

interface RegionOption {
  code: string;
  labelKey: string;
}

@Component({
  selector: 'app-region',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './region.component.html',
  styleUrl: './region.component.scss',
})
export class RegionComponent {
  private readonly storageKey = 'spirego-region';
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);

  protected readonly options: RegionOption[] = [
    { code: 'montenegro', labelKey: 'region.montenegro' },
    { code: 'spain', labelKey: 'region.spain' },
  ];

  protected readonly selectedCode = signal(this.readStoredRegion());
  protected readonly appliedCode = signal(this.readStoredRegion());
  protected readonly feedback = signal('');

  protected goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/home']);
  }

  protected selectRegion(code: string): void {
    this.selectedCode.set(code);
    this.feedback.set('');
  }

  protected applyRegion(): void {
    const selected = this.selectedCode();
    if (selected === this.appliedCode()) {
      this.feedback.set(this.translationService.translate('region.active'));
      return;
    }

    try {
      localStorage.setItem(this.storageKey, selected);
      this.appliedCode.set(selected);
      this.feedback.set(this.translationService.translate('region.saved'));
    } catch {
      this.feedback.set(this.translationService.translate('region.saveFailed'));
    }
  }

  protected isSelected(code: string): boolean {
    return this.selectedCode() === code;
  }

  protected canApply(): boolean {
    return this.selectedCode() !== this.appliedCode();
  }

  protected getSelectedRegionLabel(): string {
    return this.translationService.translate(
      this.selectedCode() === 'spain' ? 'region.spain' : 'region.montenegro',
    );
  }

  private readStoredRegion(): string {
    if (typeof localStorage === 'undefined') {
      return 'montenegro';
    }

    return localStorage.getItem(this.storageKey) === 'spain' ? 'spain' : 'montenegro';
  }
}
