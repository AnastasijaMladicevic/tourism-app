import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { EventPlannerDto, EventPlannerService } from '../../services/event-planner';
import { PlannerLocalPreferencesService } from '../../services/planner-local-preferences';
import { TranslationService } from '../../services/translation.service';

interface PlannerCalendarDay {
  id: string;
  label: string;
  date: number;
  isoDate: string;
}

interface PlannerPreviewState {
  eventId?: number;
  title?: string;
  location?: string;
  type?: string;
  rating?: string;
  imageUrl?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

interface PlannerPreviewViewModel {
  title: string;
  location: string;
  type: string;
  rating: string;
  imageUrl: string;
  description: string;
}

@Component({
  selector: 'app-add-to-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './add-to-planner.component.html',
  styleUrl: './add-to-planner.component.scss',
})
export class AddToPlannerComponent implements OnInit {
  private readonly dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  private readonly router = inject(Router);
  private readonly plannerService = inject(EventPlannerService);
  private readonly plannerLocalPreferences = inject(PlannerLocalPreferencesService);
  private readonly translationService = inject(TranslationService);

  protected readonly selectedDayId = signal('');
  protected readonly travelDate = signal('');
  protected readonly startTime = signal('19:00');
  protected readonly notes = signal('');
  protected readonly isPriority = signal(false);
  protected readonly isSaving = signal(false);
  protected readonly feedback = signal('');
  protected readonly existingPlannerItems = signal<EventPlannerDto[]>([]);
  protected readonly eventId: number | null;
  protected readonly preview: PlannerPreviewViewModel;
  protected readonly eventStartDate: Date | null;
  protected readonly eventEndDate: Date | null;
  protected readonly minSelectableDate: string | null;
  protected readonly maxSelectableDate: string | null;
  protected readonly isEventScheduleLocked: boolean;
  protected readonly fixedDurationMinutes: number;
  protected readonly estimatedEndLabel = computed(() =>
    this.formatTimeLabel(this.addMinutes(this.buildSelectedStartDate(), this.fixedDurationMinutes)),
  );
  protected readonly durationLabel = computed(() => this.formatDuration(this.fixedDurationMinutes));
  protected readonly selectedDateLabel = computed(() => this.formatFriendlyDate(this.travelDate()));
  protected readonly conflictMessage = computed(() => this.buildConflictMessage());
  protected readonly days = computed<PlannerCalendarDay[]>(() => {
    if (this.isEventScheduleLocked && this.eventStartDate && this.eventEndDate) {
      return this.buildEventDays(this.eventStartDate, this.eventEndDate);
    }

    const anchorDate = this.parseDate(this.travelDate()) ?? new Date();
    return Array.from({ length: 5 }, (_, index) => {
      const nextDate = new Date(anchorDate);
      nextDate.setDate(anchorDate.getDate() + index - 2);
      return this.toCalendarDay(nextDate);
    });
  });

  constructor() {
    const state = (window.history.state ?? {}) as PlannerPreviewState;
    this.eventId = typeof state.eventId === 'number' && state.eventId > 0 ? state.eventId : null;
    this.eventStartDate = this.parseDate(state.startDate);
    const parsedEndDate = this.parseDate(state.endDate);
    const fallbackEndDate = this.eventStartDate ? this.addMinutes(this.eventStartDate, 90) : null;
    this.eventEndDate = parsedEndDate ?? fallbackEndDate;
    this.fixedDurationMinutes = this.computeDurationMinutes(this.eventStartDate, this.eventEndDate);
    this.isEventScheduleLocked = !!(this.eventId && this.eventStartDate && this.eventEndDate);
    this.minSelectableDate = this.eventStartDate ? this.toDateInputValue(this.eventStartDate) : null;
    this.maxSelectableDate = this.eventEndDate ? this.toDateInputValue(this.eventEndDate) : null;

    const initialDate = this.eventStartDate ?? new Date();
    this.travelDate.set(this.toDateInputValue(initialDate));
    this.selectedDayId.set(this.toDateInputValue(initialDate));
    this.startTime.set(this.eventStartDate ? this.toTimeInputValue(this.eventStartDate) : '19:00');

    this.preview = {
      title: state.title || this.translate('addToPlanner.previewFallbackTitle'),
      location: state.location || this.translate('addToPlanner.previewFallbackLocation'),
      type: state.type || this.translate('addToPlanner.previewFallbackType'),
      rating: state.rating || '4.9',
      imageUrl: state.imageUrl || '/assets/izlet-boko-kotorski-zaliv-1.jpg',
      description: state.description || this.translate('addToPlanner.previewFallbackDescription'),
    };
  }

  ngOnInit(): void {
    if (!this.eventId) {
      return;
    }

    this.plannerService
      .getMyPlanner({
        page: 1,
        pageSize: 100,
        sortBy: 'startDate',
        sortOrder: 'asc',
      })
      .pipe(catchError(() => of({ items: [] } as { items: EventPlannerDto[] })))
      .subscribe((result) => {
        this.existingPlannerItems.set(result.items ?? []);
      });
  }

  protected goBack(): void {
    this.router.navigate(['/planner']);
  }

  protected translate(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  protected selectDay(day: PlannerCalendarDay): void {
    this.selectedDayId.set(day.id);
    this.travelDate.set(day.isoDate);
  }

  protected togglePriority(): void {
    this.isPriority.update((value) => !value);
  }

  protected onTravelDateChange(value: string): void {
    const nextValue = this.clampSelectableDate(value);
    this.travelDate.set(nextValue);
    const parsedDate = this.parseDate(nextValue);
    if (parsedDate) {
      this.selectedDayId.set(this.toDateInputValue(parsedDate));
    }
  }

  protected save(): void {
    if (!this.eventId || this.isSaving()) {
      this.feedback.set(this.translate('addToPlanner.feedbackOnlyEvents'));
      return;
    }

    if (this.existingPlannerItems().some((item) => item.eventId === this.eventId)) {
      this.feedback.set(this.translate('addToPlanner.feedbackAlreadyAdded'));
      return;
    }

    this.isSaving.set(true);
    this.feedback.set('');

    this.plannerService
      .add({ eventId: this.eventId })
      .pipe(
        catchError((error) => {
          const message =
            (error as { error?: { message?: string } })?.error?.message ||
            this.translate('addToPlanner.feedbackCannotAdd');
          this.feedback.set(message);
          return of(null);
        }),
        finalize(() => this.isSaving.set(false)),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }

        this.plannerLocalPreferences.upsert({
          plannerId: result.id,
          eventId: result.eventId,
          plannedDate: this.travelDate(),
          startTime: this.startTime(),
          durationMinutes: this.fixedDurationMinutes,
          notes: this.notes().trim(),
          isPriority: this.isPriority(),
        });

        void this.router.navigate(['/planner']);
      });
  }

  private buildConflictMessage(): string {
    if (!this.eventId) {
      return '';
    }

    const selectedStart = this.buildSelectedStartDate();
    const selectedEnd = this.addMinutes(selectedStart, this.fixedDurationMinutes);

    const conflict = this.existingPlannerItems()
      .map((item) => {
        const resolved = this.plannerLocalPreferences.resolveSchedule(item.id, item.startDate, item.endDate);
        return {
          title: item.eventName,
          startDate: resolved.startDate,
          endDate: resolved.endDate,
        };
      })
      .find((item) => selectedStart < item.endDate && selectedEnd > item.startDate);

    if (!conflict) {
      return '';
    }

    return this.translate('addToPlanner.conflictMessage', {
      title: conflict.title,
      time: this.formatTimeLabel(conflict.startDate),
    });
  }

  private buildSelectedStartDate(): Date {
    const parsedDate = this.parseDate(this.travelDate()) ?? new Date();
    const [hoursRaw, minutesRaw] = this.startTime().split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    const nextDate = new Date(parsedDate);

    nextDate.setHours(Number.isNaN(hours) ? 19 : hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
    return nextDate;
  }

  private parseDate(value?: string): Date | null {
    if (!value) {
      return null;
    }

    if (this.dateOnlyPattern.test(value)) {
      const [yearRaw, monthRaw, dayRaw] = value.split('-');
      const year = Number(yearRaw);
      const month = Number(monthRaw);
      const day = Number(dayRaw);

      if ([year, month, day].some((part) => Number.isNaN(part))) {
        return null;
      }

      const localDate = new Date(year, month - 1, day);
      return Number.isNaN(localDate.getTime()) ? null : localDate;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  private clampSelectableDate(value: string): string {
    if (!this.isEventScheduleLocked || !this.eventStartDate || !this.eventEndDate) {
      return value;
    }

    const parsed = this.parseDate(value);
    if (!parsed) {
      return this.toDateInputValue(this.eventStartDate);
    }

    if (parsed < this.startOfDay(this.eventStartDate)) {
      return this.toDateInputValue(this.eventStartDate);
    }

    if (parsed > this.startOfDay(this.eventEndDate)) {
      return this.toDateInputValue(this.eventEndDate);
    }

    return this.toDateInputValue(parsed);
  }

  private buildEventDays(startDate: Date, endDate: Date): PlannerCalendarDay[] {
    const days: PlannerCalendarDay[] = [];
    const cursor = this.startOfDay(startDate);
    const lastDay = this.startOfDay(endDate);

    while (cursor <= lastDay) {
      days.push(this.toCalendarDay(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }

  private toCalendarDay(date: Date): PlannerCalendarDay {
    return {
      id: this.toDateInputValue(date),
      isoDate: this.toDateInputValue(date),
      label: new Intl.DateTimeFormat(this.translationService.currentLocale(), { weekday: 'short' })
        .format(date)
        .replace('.', '')
        .slice(0, 3)
        .toUpperCase(),
      date: date.getDate(),
    };
  }

  private computeDurationMinutes(startDate: Date | null, endDate: Date | null): number {
    if (!startDate || !endDate) {
      return 90;
    }

    const minutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
    return Math.max(30, minutes || 90);
  }

  private startOfDay(date: Date): Date {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000);
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toTimeInputValue(date: Date): string {
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private formatFriendlyDate(value: string): string {
    const date = this.parseDate(value) ?? new Date();
    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  }

  private formatTimeLabel(date: Date): string {
    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  protected formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
  }
}
