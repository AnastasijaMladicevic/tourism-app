import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VaultCategory, VaultStat } from './planner-page.data';

@Component({
  selector: 'app-vault-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vault-summary.component.html',
  styleUrl: './vault-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultSummaryComponent {
  @Input({ required: true }) stats: VaultStat[] = [];
  @Input({ required: true }) categories: VaultCategory[] = [];
}
