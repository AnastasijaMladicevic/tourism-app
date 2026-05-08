import { CommonModule, Location } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { AuthService, UserPreferredRegionDto } from '../../services/auth';
import { ActiveRegionService } from '../../services/active-region';
import { RegionDto, RegionService } from '../../services/region';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';

type RegionOption = RegionDto;

@Component({
  selector: 'app-region',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './region.component.html',
  styleUrl: './region.component.scss',
})
export class RegionComponent implements OnInit {
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly regionService = inject(RegionService);
  private readonly activeRegionService = inject(ActiveRegionService);
  private readonly translationService = inject(TranslationService);

  protected readonly options = signal<RegionOption[]>([]);
  protected readonly selectedId = signal<number | null>(this.activeRegionService.getActiveRegionId());
  protected readonly appliedId = signal<number | null>(this.activeRegionService.getActiveRegionId());
  protected readonly feedback = signal('');
  protected readonly loadError = signal('');
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);

  ngOnInit(): void {
    this.loadRegions();
  }

  protected goBack(): void {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/home']);
  }

  protected retry(): void {
    this.loadRegions();
  }

  protected selectRegion(id: number): void {
    this.selectedId.set(id);
    this.feedback.set('');
  }

  protected applyRegion(): void {
    const selected = this.selectedId();
    if (!selected) {
      return;
    }

    if (selected === this.appliedId()) {
      this.feedback.set(this.translationService.translate('region.active'));
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.activeRegionService.setActiveRegionId(selected);
      this.appliedId.set(selected);
      this.feedback.set(this.translationService.translate('region.saved'));
      this.router.navigate(['/home']);
      return;
    }

    this.isSaving.set(true);
    this.feedback.set('');

    this.authService
      .updateMyPreferredRegion({ regionId: selected })
      .pipe(finalize(() => this.isSaving.set(false)))
      .subscribe({
        next: (response) => {
          const appliedRegionId = this.resolvePreferredRegionId(response, this.options()) ?? selected;
          this.activeRegionService.setActiveRegionId(appliedRegionId);
          this.selectedId.set(appliedRegionId);
          this.appliedId.set(appliedRegionId);
          this.feedback.set(this.translationService.translate('region.saved'));
          this.router.navigate(['/home']);
        },
        error: () => {
          this.feedback.set(this.translationService.translate('region.saveFailed'));
        },
      });
  }

  protected isSelected(id: number): boolean {
    return this.selectedId() === id;
  }

  protected canApply(): boolean {
    return (
      !this.isLoading() &&
      !this.isSaving() &&
      this.selectedId() != null &&
      this.selectedId() !== this.appliedId()
    );
  }

  protected getSelectedRegionLabel(): string {
    return this.options().find((option) => option.id === this.selectedId())?.name ?? '';
  }

  private loadRegions(): void {
    this.isLoading.set(true);
    this.loadError.set('');
    this.feedback.set('');

    this.regionService
      .getAll()
      .pipe(
        map((regions) =>
          regions.filter((region) => region.isActive !== false && region.code?.toUpperCase() !== 'GR'),
        ),
        switchMap((regions) => {
          this.options.set(regions);

          if (!regions.length) {
            return of({ regions, preferredRegion: null as UserPreferredRegionDto | null });
          }

          if (!this.authService.isLoggedIn()) {
            return of({ regions, preferredRegion: null as UserPreferredRegionDto | null });
          }

          return this.authService.getMyPreferredRegion().pipe(
            map((preferredRegion) => ({ regions, preferredRegion })),
            catchError(() => of({ regions, preferredRegion: null as UserPreferredRegionDto | null })),
          );
        }),
        finalize(() => this.isLoading.set(false)),
      )
      .subscribe({
        next: ({ regions, preferredRegion }) => {
          if (!regions.length) {
            this.selectedId.set(null);
            this.appliedId.set(null);
            this.loadError.set(this.translationService.translate('region.noneAvailable'));
            return;
          }

          const initialSelection =
            this.resolvePreferredRegionId(preferredRegion, regions) ??
            this.activeRegionService.getActiveRegionId() ??
            regions.find((region) => region.isDefault)?.id ??
            regions[0]?.id ??
            null;

          this.selectedId.set(initialSelection);
          this.appliedId.set(initialSelection);

          if (initialSelection != null) {
            this.activeRegionService.setActiveRegionId(initialSelection);
          }
        },
        error: () => {
          this.options.set([]);
          this.selectedId.set(null);
          this.appliedId.set(null);
          this.loadError.set(this.translationService.translate('region.loadFailed'));
        },
      });
  }

  private resolvePreferredRegionId(
    preferredRegion: UserPreferredRegionDto | null,
    regions: RegionOption[],
  ): number | null {
    if (!preferredRegion) {
      return null;
    }

    const candidates = [preferredRegion.preferredRegionId, preferredRegion.effectiveRegionId];

    for (const candidate of candidates) {
      if (candidate != null && regions.some((region) => region.id === candidate)) {
        return candidate;
      }
    }

    return null;
  }
}
