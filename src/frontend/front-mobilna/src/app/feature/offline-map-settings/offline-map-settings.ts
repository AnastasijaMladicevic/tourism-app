import { ChangeDetectorRef, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

import { OfflineMapService } from '../../services/offline-map';
import { RouterHistoryService } from '../../services/router-history';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-offline-map-settings',
  templateUrl: './offline-map-settings.html',
  styleUrls: ['./offline-map-settings.scss'],
  imports: [CommonModule, MatIconModule, TranslatePipe],
})
export class OfflineMapSettingsComponent {
  offlineMapsEnabled = false;
  offlineMapsSupported = false;
  offlineMapsBusy = false;
  offlineMapsError = '';

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly offlineMapService: OfflineMapService,
    private readonly routerHistoryService: RouterHistoryService,
  ) {
    this.offlineMapsSupported = this.offlineMapService.isSupported();
    this.offlineMapsEnabled = this.offlineMapService.isEnabled();
  }

  goBack(): void {
    this.routerHistoryService.goBack();
  }

  async toggleOfflineMaps(enabled: boolean): Promise<void> {
    if (!this.offlineMapsSupported || this.offlineMapsBusy) {
      return;
    }

    this.offlineMapsError = '';
    this.offlineMapsBusy = true;
    this.cdr.markForCheck();

    try {
      await this.offlineMapService.setEnabled(enabled);
      this.offlineMapsEnabled = enabled;
    } catch {
      this.offlineMapsEnabled = this.offlineMapService.isEnabled();
      this.offlineMapsError = 'settings.offlineMapsError';
    } finally {
      this.offlineMapsBusy = false;
      this.cdr.markForCheck();
    }
  }
}
