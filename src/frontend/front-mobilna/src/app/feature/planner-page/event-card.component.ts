import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerEvent } from './planner-page.data';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-card.component.html',
  styleUrl: './event-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCardComponent {
  @Input({ required: true }) event!: PlannerEvent;
  @Input() deleteDisabled = false;
  @Input() editDisabled = false;
  @Input() detailsDisabled = false;

  @Output() details = new EventEmitter<number>();
  @Output() edit = new EventEmitter<number>();
  @Output() delete = new EventEmitter<number>();

  protected onDetails(): void {
    this.details.emit(this.event.eventId);
  }

  protected onEdit(): void {
    this.edit.emit(this.event.id);
  }

  protected onDelete(): void {
    this.delete.emit(this.event.id);
  }
}
