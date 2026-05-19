import { ChangeDetectionStrategy, Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-add-event-card',
  standalone: true,
  templateUrl: './add-event-card.component.html',
  styleUrl: './add-event-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddEventCardComponent {
  @Output() addEvent = new EventEmitter<void>();

  protected triggerAddEvent(): void {
    this.addEvent.emit();
  }
}
