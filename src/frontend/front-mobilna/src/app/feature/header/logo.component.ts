import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="logo">
      <img
        ngSrc="assets/minilogo.svg"
        width="42"
        height="42"
        alt="SpireGO logo"
      />
      <span class="name">Spire<span class="go">GO</span></span>
    </div>
  `,
  styles: [`
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      justify-content: center;
    }
    .name {
      font-size: 26px;
      font-weight: 800;
      color: #067DE7;
      letter-spacing: -0.5px;
    }
    .go {
      color: #38DFF6;
    }
  `]
})
export class LogoComponent {}
