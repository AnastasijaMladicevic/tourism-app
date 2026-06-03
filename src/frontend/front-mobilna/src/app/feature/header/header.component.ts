import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="header">
      @if (backLink) {
        <a [routerLink]="backLink" class="back-btn" [attr.aria-label]="'common.back' | translate">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </a>
      } @else {
        <div class="spacer"></div>
      }
    </div>
  `,
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  @Input() backLink: string | null = null;
}
