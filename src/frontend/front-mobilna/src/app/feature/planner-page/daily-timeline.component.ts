import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlannerDay } from './planner-page.data';

@Component({
  selector: 'app-daily-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './daily-timeline.component.html',
  styleUrl: './daily-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailyTimelineComponent {
  @Input({ required: true }) days: PlannerDay[] = [];
  @Output() daySelect = new EventEmitter<string>();

  protected selectDay(dayId: string): void {
    this.daySelect.emit(dayId);
  }
}
