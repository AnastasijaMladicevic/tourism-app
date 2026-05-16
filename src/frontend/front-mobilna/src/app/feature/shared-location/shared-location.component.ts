import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService, SharedLocationDto } from '../../services/auth';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { MapComponent as MiniMapComponent } from '../../shared/components/map/map';

@Component({
  selector: 'app-shared-location',
  standalone: true,
  imports: [CommonModule, TranslatePipe, MiniMapComponent],
  templateUrl: './shared-location.component.html',
  styleUrl: './shared-location.component.scss',
})
export class SharedLocationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly translationService = inject(TranslationService);

  protected readonly isLoading = signal(true);
  protected readonly sharedLocation = signal<SharedLocationDto | null>(null);
  protected readonly hasError = signal(false);

  ngOnInit(): void {
    const requestedLanguage = this.route.snapshot.queryParamMap.get('lang');
    if (requestedLanguage) {
      this.translationService.setLanguage(requestedLanguage);
    }

    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.hasError.set(true);
      this.isLoading.set(false);
      return;
    }

    this.authService
      .resolveLocationShare(token)
      .pipe(catchError(() => of(null)))
      .subscribe((location) => {
        this.sharedLocation.set(location);
        this.hasError.set(!location);
        this.isLoading.set(false);
      });
  }
}
