import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-location-required-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslatePipe],
  templateUrl: './location-required-modal.component.html',
  styleUrls: ['./location-required-modal.component.scss'],
})
export class LocationRequiredModalComponent {
  @Input() show = false;
  @Output() dismissed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();
}
