import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService, SharedLocationDto } from '../../services/auth';
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

  protected isLoading = true;
  protected sharedLocation: SharedLocationDto | null = null;
  protected hasError = false;

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.hasError = true;
      this.isLoading = false;
      return;
    }

    this.authService
      .resolveLocationShare(token)
      .pipe(catchError(() => of(null)))
      .subscribe((location) => {
        this.sharedLocation = location;
        this.hasError = !location;
        this.isLoading = false;
      });
  }
}
