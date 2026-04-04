import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './logo.html',
  styleUrls: ['./logo.scss'],
})
export class LogoComponent {
  // Kontroliše veličinu — 'sm' za navbar, 'md' default, 'lg' za auth ekrane
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
}
