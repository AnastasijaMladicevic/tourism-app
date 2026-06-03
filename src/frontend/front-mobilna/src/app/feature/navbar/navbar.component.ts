import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LogoComponent } from '../../shared/components/logo/logo';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [LogoComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {}
