import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BottomNavComponent {}
