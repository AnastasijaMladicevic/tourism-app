import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerHighlight } from './planner-page.data';

@Component({
  selector: 'app-upcoming-highlight',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upcoming-highlight.component.html',
  styleUrl: './upcoming-highlight.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingHighlightComponent {
  @Input({ required: true }) highlights: PlannerHighlight[] = [];
  @Output() details = new EventEmitter<number>();

  protected openDetails(eventId: number): void {
    this.details.emit(eventId);
  }
}
