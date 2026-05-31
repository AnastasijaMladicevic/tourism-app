import { CommonModule } from '@angular/common';
import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';
import { EventPlannerDto, EventPlannerService } from '../../services/event-planner';
import { PlannerLocalPreferencesService } from '../../services/planner-local-preferences';
import { TranslationService } from '../../services/translation.service';
import { RouterHistoryService } from '../../services/router-history';

interface PlannerCalendarDay {
  id: string;
  label: string;
  date: number;
  isoDate: string;
}

interface AddPlannerCalendarCell {
  key: string;
  label: number;
  date: Date;
  isCurrentMonth: boolean;
  isDisabled: boolean;
  isSelected: boolean;
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
  plannedDate?: string;
  plannedDates?: string[];
  returnUrl?: string;
}

interface PlannerPreviewViewModel {
  title: string;
  location: string;
  type: string;
  rating: string;
  imageUrl: string;
  description: string;
}

interface SelectedPlannerInterval {
  plannedDate: string;
  startDate: Date;
  endDate: Date;
}

@Component({
  selector: 'app-add-to-planner',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-to-planner.component.html',
  styleUrl: './add-to-planner.component.scss',
})
export class AddToPlannerComponent implements OnInit {
  private readonly dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  private readonly router = inject(Router);
  private readonly plannerService = inject(EventPlannerService);
  private readonly plannerLocalPreferences = inject(PlannerLocalPreferencesService);
  private readonly translationService = inject(TranslationService);
  private readonly routerHistory = inject(RouterHistoryService);
  protected readonly selectedDayId = signal('');
  protected readonly selectedDayIds = signal<string[]>([]);
  protected readonly travelDate = signal('');
  protected readonly startTime = signal('19:00');
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
  private readonly returnUrl: string | null;
  protected readonly isEditMode = signal(false);
  protected readonly editingPlannerId = signal<number | null>(null);
  protected readonly calendarOpen = signal(false);
  protected readonly calendarMonthCursor = signal(this.getCalendarStartOfMonth(new Date()));
  protected readonly selectedStartDateTime = computed(() => this.buildSelectedStartDate());
  protected readonly selectedEndDateTime = computed(() => this.buildSelectedEndDate());
  protected readonly canSelectMultipleDays = computed(() =>
    this.isEventScheduleLocked && this.days().length > 1
  );
  protected readonly selectedPlannedDates = computed(() => this.resolveSelectedPlannedDates());
  protected readonly estimatedEndLabel = computed(() =>
    this.formatTimeLabel(this.selectedEndDateTime()),
  );
  protected readonly durationLabel = computed(() => this.formatDuration(this.fixedDurationMinutes));
  protected readonly selectedDateLabel = computed(() => {
    const selectedDates = this.selectedPlannedDates();

    if (this.canSelectMultipleDays() && selectedDates.length > 1) {
      return this.translate('addToPlanner.selectedDaysCount', { count: selectedDates.length });
    }

    return this.formatFriendlyDate(selectedDates[0] ?? this.travelDate());
  });
  protected readonly conflictMessage = computed(() => this.buildConflictMessage());

  protected readonly calendarMonthLabel = computed(() =>
    new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      month: 'long',
      year: 'numeric',
    }).format(this.calendarMonthCursor()),
  );

  protected readonly canGoToPreviousCalendarMonth = computed(() => {
    const today = this.getCalendarStartOfMonth(new Date());
    return this.calendarMonthCursor().getTime() > today.getTime();
  });

  protected readonly calendarWeeks = computed<AddPlannerCalendarCell[][]>(() => {
    const monthStart = this.calendarMonthCursor();
    const firstGridDate = new Date(monthStart);
    firstGridDate.setDate(monthStart.getDate() - monthStart.getDay());
    const selectedSet = new Set(this.selectedDayIds());
    const minDate = this.eventStartDate ? this.startOfDay(this.eventStartDate) : null;
    const maxDate = this.eventEndDate ? this.startOfDay(this.eventEndDate) : null;
    const weeks: AddPlannerCalendarCell[][] = [];

    for (let w = 0; w < 6; w++) {
      const week: AddPlannerCalendarCell[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(firstGridDate);
        cellDate.setDate(firstGridDate.getDate() + w * 7 + d);
        const normalizedCell = this.startOfDay(cellDate);
        const key = this.toDateInputValue(cellDate);
        const isDisabled =
          (minDate !== null && normalizedCell < minDate) ||
          (maxDate !== null && normalizedCell > maxDate);

        week.push({
          key,
          label: cellDate.getDate(),
          date: cellDate,
          isCurrentMonth: cellDate.getMonth() === monthStart.getMonth(),
          isDisabled,
          isSelected: selectedSet.has(key),
        });
      }
      weeks.push(week);
    }

    return weeks;
  });
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
  protected readonly eventStartLabel = computed(() =>
    this.eventStartDate ? this.formatTimeLabel(this.eventStartDate) : '--:--'
  );

  protected readonly eventEndLabel = computed(() =>
    this.eventEndDate ? this.formatTimeLabel(this.eventEndDate) : '--:--'
  );
  constructor() {
    const state = (window.history.state ?? {}) as PlannerPreviewState;
    this.eventId = this.parsePositiveNumber(state.eventId);
    this.eventStartDate = this.parseDate(state.startDate);
    const parsedEndDate = this.parseDate(state.endDate);
    const fallbackEndDate = this.eventStartDate ? this.addMinutes(this.eventStartDate, 90) : null;
    this.eventEndDate = parsedEndDate ?? fallbackEndDate;
    this.fixedDurationMinutes = this.computeDurationMinutes(this.eventStartDate, this.eventEndDate);
    this.isEventScheduleLocked = !!(this.eventId && this.eventStartDate && this.eventEndDate);
    this.minSelectableDate = this.eventStartDate ? this.toDateInputValue(this.eventStartDate) : null;
    this.maxSelectableDate = this.eventEndDate ? this.toDateInputValue(this.eventEndDate) : null;
    this.returnUrl =
      typeof state.returnUrl === 'string' && state.returnUrl.startsWith('/') ? state.returnUrl : null;

    const initialDate = this.eventStartDate ?? new Date();
    const initialDateValue = this.toDateInputValue(initialDate);
    this.travelDate.set(initialDateValue);
    this.selectedDayId.set(initialDateValue);
    this.selectedDayIds.set([initialDateValue]);
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
    const state = (window.history.state ?? {}) as any;

    if (state?.plannerId) {
      this.isEditMode.set(true);
      this.editingPlannerId.set(state.plannerId);

      const existingPreference = this.plannerLocalPreferences.findByPlannerId(state.plannerId);
      const preferredDates = this.normalizePlannedDates(
        existingPreference?.plannedDates?.length
          ? existingPreference.plannedDates
          : typeof state.plannedDate === 'string' && state.plannedDate
            ? [state.plannedDate]
            : [],
      );

      if (preferredDates.length) {
        this.selectedDayIds.set(preferredDates);
        this.travelDate.set(preferredDates[0]);
        this.selectedDayId.set(preferredDates[0]);
      }

      if (typeof state.startTime === 'string' && state.startTime) {
        this.startTime.set(state.startTime);
      }
    }
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

  @HostListener('document:keydown.escape')
  protected handleEscapeKey(): void {
    this.calendarOpen.set(false);
  }

  protected toggleCalendar(): void {
    this.calendarOpen.update((open) => {
      if (!open) {
        const anchor = this.parseDate(this.travelDate()) ?? this.eventStartDate ?? new Date();
        this.calendarMonthCursor.set(this.getCalendarStartOfMonth(anchor));
      }
      return !open;
    });
  }

  protected closeCalendar(): void {
    this.calendarOpen.set(false);
  }

  protected previousCalendarMonth(): void {
    if (!this.canGoToPreviousCalendarMonth()) return;
    const prev = new Date(this.calendarMonthCursor());
    prev.setMonth(prev.getMonth() - 1);
    this.calendarMonthCursor.set(this.getCalendarStartOfMonth(prev));
  }

  protected nextCalendarMonth(): void {
    const next = new Date(this.calendarMonthCursor());
    next.setMonth(next.getMonth() + 1);
    this.calendarMonthCursor.set(this.getCalendarStartOfMonth(next));
  }

  protected selectCalendarDate(cell: AddPlannerCalendarCell): void {
    if (cell.isDisabled) return;
    this.onTravelDateChange(cell.key);
    if (!this.canSelectMultipleDays()) {
      this.calendarOpen.set(false);
    }
  }

  private getCalendarStartOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  protected goBack(): void {
    this.routerHistory.goBack();
  }

  protected translate(key: string, params?: Record<string, string | number>): string {
    return this.translationService.translate(key, params);
  }

  protected selectDay(day: PlannerCalendarDay): void {
    this.travelDate.set(day.isoDate);
    this.selectedDayId.set(day.id);

    if (!this.canSelectMultipleDays()) {
      this.selectedDayIds.set([day.id]);
      return;
    }

    this.selectedDayIds.update((current) => {
      const exists = current.includes(day.id);
      if (exists) {
        return current.length > 1 ? current.filter((value) => value !== day.id) : current;
      }

      return this.normalizePlannedDates([...current, day.id]);
    });
  }

  protected onTravelDateChange(value: string): void {
    const nextValue = this.clampSelectableDate(value);
    this.travelDate.set(nextValue);
    const parsedDate = this.parseDate(nextValue);
    if (parsedDate) {
      const dayId = this.toDateInputValue(parsedDate);
      this.selectedDayId.set(dayId);

      if (this.canSelectMultipleDays()) {
        this.selectedDayIds.update((current) =>
          current.includes(dayId) ? current : this.normalizePlannedDates([...current, dayId]),
        );
      } else {
        this.selectedDayIds.set([dayId]);
      }
    }
  }

  protected isDaySelected(dayId: string): boolean {
    return this.selectedDayIds().includes(dayId);
  }

  protected openDatePicker(input: HTMLInputElement): void {
    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };

    if (typeof pickerInput.showPicker === 'function') {
      pickerInput.showPicker();
      return;
    }

    pickerInput.click();
  }

  protected save(): void {
    if (!this.eventId || this.isSaving()) {
      this.feedback.set(this.translate('addToPlanner.feedbackOnlyEvents'));
      return;
    }

    if (this.conflictMessage()) {
      return;
    }

    const selectedDates = this.selectedPlannedDates();
    if (!selectedDates.length) {
      this.feedback.set(this.translate('addToPlanner.selectAtLeastOneDay'));
      return;
    }

    this.isSaving.set(true);
    this.feedback.set('');

    if (this.isEditMode() && this.editingPlannerId()) {
      this.plannerLocalPreferences.upsert({
        plannerId: this.editingPlannerId()!,
        eventId: this.eventId,
        plannedDate: selectedDates[0],
        plannedDates: selectedDates,
        startTime: this.startTime(),
        durationMinutes: this.fixedDurationMinutes,
        notes: '',
        isPriority: false,
      });

      this.isSaving.set(false);
      void this.navigateAfterSave();
      return;
    }

    const existingPlannerItem = this.findCurrentEventPlannerItem();
    if (existingPlannerItem) {
      const existingPreference = this.plannerLocalPreferences.findByPlannerId(existingPlannerItem.id);
      const mergedDates = this.normalizePlannedDates([
        ...(existingPreference?.plannedDates ?? (existingPreference?.plannedDate ? [existingPreference.plannedDate] : [])),
        ...selectedDates,
      ]);

      this.plannerLocalPreferences.upsert({
        plannerId: existingPlannerItem.id,
        eventId: this.eventId,
        plannedDate: mergedDates[0],
        plannedDates: mergedDates,
        startTime: this.startTime(),
        durationMinutes: this.fixedDurationMinutes,
        notes: existingPreference?.notes ?? '',
        isPriority: existingPreference?.isPriority ?? false,
      });

      this.isSaving.set(false);
      this.feedback.set('');
      void this.navigateAfterSave();
      return;
    }

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
        if (!result) return;

        this.plannerLocalPreferences.upsert({
          plannerId: result.id,
          eventId: result.eventId,
          plannedDate: selectedDates[0],
          plannedDates: selectedDates,
          startTime: this.startTime(),
          durationMinutes: this.fixedDurationMinutes,
          notes: '',
          isPriority: false,
        });

        void this.navigateAfterSave();
      });
  }

  private navigateAfterSave(): Promise<boolean> {
    if (this.returnUrl) {
      return this.router.navigateByUrl(this.returnUrl);
    }

    return this.router.navigate(['/planner']);
  }

  private buildConflictMessage(): string {
    if (!this.eventId) {
      return '';
    }

    const selectedIntervals = this.buildSelectedIntervals();
    if (!selectedIntervals.length) {
      return '';
    }

    const currentPlannerId = this.editingPlannerId() ?? this.findCurrentEventPlannerItem()?.id ?? null;
    const existingIntervals = this.existingPlannerItems()
      .filter((item) => item.id !== currentPlannerId)
      .flatMap((item) => this.resolvePlannerItemIntervals(item));

    for (const selectedInterval of selectedIntervals) {
      const conflict = existingIntervals.find((item) =>
        selectedInterval.startDate < item.endDate && selectedInterval.endDate > item.startDate,
      );

      if (conflict) {
        if (selectedIntervals.length > 1) {
          return this.translate('addToPlanner.conflictMessageWithDay', {
            day: this.formatFriendlyDate(selectedInterval.plannedDate),
            title: conflict.title,
            time: this.formatTimeLabel(conflict.startDate),
          });
        }

        return this.translate('addToPlanner.conflictMessage', {
          title: conflict.title,
          time: this.formatTimeLabel(conflict.startDate),
        });
      }
    }

    return '';
  }

  private buildSelectedStartDate(): Date {
    const selectedDate = this.selectedPlannedDates()[0] ?? this.travelDate();
    if (!selectedDate) {
      return this.eventStartDate ?? new Date();
    }

    const merged = this.mergeDateAndTime(selectedDate, this.startTime());
    if (merged) {
      return merged;
    }

    return this.eventStartDate ?? new Date();
  }

  private buildSelectedEndDate(): Date {
    const selectedStart = this.buildSelectedStartDate();
    return this.buildEndDateFor(selectedStart);
  }

  private buildEndDateFor(selectedStart: Date): Date {
    const endTimeSource = this.eventEndDate ?? this.addMinutes(selectedStart, this.fixedDurationMinutes);
    const endDate = new Date(selectedStart);
    endDate.setHours(endTimeSource.getHours(), endTimeSource.getMinutes(), 0, 0);

    if (endDate <= selectedStart) {
      endDate.setDate(endDate.getDate() + 1);
    }

    return endDate;
  }

  private buildSelectedIntervals(): SelectedPlannerInterval[] {
    return this.selectedPlannedDates().map((plannedDate) => {
      const startDate = this.mergeDateAndTime(plannedDate, this.startTime()) ?? this.eventStartDate ?? new Date();

      return {
        plannedDate,
        startDate,
        endDate: this.buildEndDateFor(startDate),
      };
    });
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

  private parsePositiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
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

  private mergeDateAndTime(dateValue: string, timeValue: string): Date | null {
    const parsedDate = this.parseDate(dateValue);
    if (!parsedDate) {
      return null;
    }

    const [hoursRaw, minutesRaw] = timeValue.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return parsedDate;
    }

    const merged = new Date(parsedDate);
    merged.setHours(hours, minutes, 0, 0);
    return merged;
  }

  private resolvePlannerItemIntervals(item: EventPlannerDto): Array<{
    title: string;
    startDate: Date;
    endDate: Date;
  }> {
    const preference = this.plannerLocalPreferences.findByPlannerId(item.id);
    const fallbackStartDate = this.parseDate(item.startDate) ?? new Date();
    const durationMinutes = this.resolveIntervalDurationMinutes(
      item.startDate,
      item.endDate,
      preference?.durationMinutes,
    );
    const plannedDates = this.normalizePlannedDates(
      preference?.plannedDates?.length
        ? preference.plannedDates
        : preference?.plannedDate
          ? [preference.plannedDate]
          : [this.toDateInputValue(fallbackStartDate)],
    );

    return plannedDates.map((plannedDate) => {
      const intervalStart =
        (preference
          ? this.mergeDateAndTime(plannedDate, preference.startTime)
          : null) ?? fallbackStartDate;

      return {
        title: item.eventName,
        startDate: intervalStart,
        endDate: this.addMinutes(intervalStart, durationMinutes),
      };
    });
  }

  private resolveSelectedPlannedDates(): string[] {
    if (this.canSelectMultipleDays()) {
      return this.normalizePlannedDates(this.selectedDayIds());
    }

    const singleDate = this.selectedDayId() || this.travelDate();
    return singleDate ? [singleDate] : [];
  }

  private normalizePlannedDates(values: string[]): string[] {
    return [...new Set(values.filter((value) => this.dateOnlyPattern.test(value)))]
      .sort((left, right) => left.localeCompare(right));
  }

  private findCurrentEventPlannerItem(): EventPlannerDto | null {
    if (!this.eventId) {
      return null;
    }

    return this.existingPlannerItems().find((item) => item.eventId === this.eventId) ?? null;
  }

  private resolveIntervalDurationMinutes(
    startValue?: string | null,
    endValue?: string | null,
    fallbackMinutes?: number,
  ): number {
    const startDate = this.parseDate(startValue ?? undefined);
    const endDate = this.parseDate(endValue ?? undefined);

    if (startDate && endDate) {
      return this.computeDurationMinutes(startDate, endDate);
    }

    if (typeof fallbackMinutes === 'number' && fallbackMinutes > 0) {
      return fallbackMinutes;
    }

    return 90;
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

    const normalizedEndDate = new Date(startDate);
    normalizedEndDate.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);

    if (normalizedEndDate <= startDate) {
      normalizedEndDate.setDate(normalizedEndDate.getDate() + 1);
    }

    const minutes = Math.round((normalizedEndDate.getTime() - startDate.getTime()) / 60000);
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
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
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
