import {
  Component,
  ElementRef,
  forwardRef,
  HostListener,
  Input,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../../services/translation.service';

interface CalendarCell {
  key: string;
  label: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isToday: boolean;
}

@Component({
  selector: 'app-date-picker-input',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './date-picker-input.component.html',
  styleUrls: ['./date-picker-input.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerInputComponent),
      multi: true,
    },
  ],
})
export class DatePickerInputComponent implements ControlValueAccessor {
  private readonly translationService = inject(TranslationService);

  @ViewChild('root', { static: true }) private rootRef!: ElementRef<HTMLElement>;

  @Input() ariaLabel = '';
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() placeholder = '';

  isOpen = false;
  alignPanelEnd = false;
  useMobilePanel = false;
  weeks: CalendarCell[][] = [];
  monthCursor = new Date();

  private value = '';
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen) {
      return;
    }

    if (!this.rootRef.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    if (this.isOpen) {
      this.updatePanelMode();
    }
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  get displayValue(): string {
    if (!this.value) {
      return '';
    }

    const [year, month, day] = this.value.split('-').map(Number);
    if (!year || !month || !day) {
      return this.value;
    }

    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(year, month - 1, day));
  }

  get monthLabel(): string {
    return new Intl.DateTimeFormat(this.translationService.currentLocale(), {
      month: 'long',
      year: 'numeric',
    }).format(this.monthCursor);
  }

  get weekdayLabels(): string[] {
    const locale = this.translationService.currentLocale();
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(2024, 0, 7 + index);
      return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
    });
  }

  toggle(event: Event): void {
    event.stopPropagation();

    if (this.isOpen) {
      this.close();
      return;
    }

    this.open();
  }

  open(): void {
    this.syncMonthCursor();
    this.refreshWeeks();
    this.updatePanelMode();
    this.isOpen = true;
    this.onTouched();
  }

  close(): void {
    this.isOpen = false;
  }

  prevMonth(): void {
    const previous = new Date(this.monthCursor);
    previous.setMonth(previous.getMonth() - 1);
    this.monthCursor = new Date(previous.getFullYear(), previous.getMonth(), 1);
    this.refreshWeeks();
  }

  nextMonth(): void {
    const next = new Date(this.monthCursor);
    next.setMonth(next.getMonth() + 1);
    this.monthCursor = new Date(next.getFullYear(), next.getMonth(), 1);
    this.refreshWeeks();
  }

  selectDay(cell: CalendarCell): void {
    if (cell.isDisabled) {
      return;
    }

    this.setValue(cell.key);
    this.close();
  }

  selectToday(): void {
    const today = this.toDateKey(new Date());
    if (this.isDateDisabled(today)) {
      return;
    }

    this.setValue(today);
    this.close();
  }

  clear(): void {
    this.setValue('');
    this.close();
  }

  onBackdropClick(): void {
    this.close();
  }

  private setValue(value: string): void {
    this.value = value;
    this.onChange(value);
    this.refreshWeeks();
  }

  private openMonthForValue(value: string): void {
    const [year, month] = value.split('-').map(Number);
    if (year && month) {
      this.monthCursor = new Date(year, month - 1, 1);
      return;
    }

    this.monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }

  private syncMonthCursor(): void {
    if (this.value) {
      this.openMonthForValue(this.value);
      return;
    }

    this.monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }

  private updatePanelMode(): void {
    this.useMobilePanel = window.matchMedia('(max-width: 920px)').matches;

    if (this.useMobilePanel) {
      this.alignPanelEnd = false;
      return;
    }

    const rect = this.rootRef.nativeElement.getBoundingClientRect();
    const panelWidth = 288;
    const margin = 16;
    this.alignPanelEnd = rect.left + panelWidth > window.innerWidth - margin;
  }

  private refreshWeeks(): void {
    const monthStart = this.monthCursor;
    const firstGrid = new Date(monthStart);
    firstGrid.setDate(monthStart.getDate() - monthStart.getDay());

    const todayKey = this.toDateKey(new Date());
    const weeks: CalendarCell[][] = [];

    for (let weekIndex = 0; weekIndex < 6; weekIndex++) {
      const week: CalendarCell[] = [];

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const cellDate = new Date(firstGrid);
        cellDate.setDate(firstGrid.getDate() + weekIndex * 7 + dayIndex);
        const key = this.toDateKey(cellDate);

        week.push({
          key,
          label: cellDate.getDate(),
          isCurrentMonth: cellDate.getMonth() === monthStart.getMonth(),
          isDisabled: this.isDateDisabled(key),
          isSelected: key === this.value,
          isToday: key === todayKey,
        });
      }

      weeks.push(week);
    }

    this.weeks = weeks;
  }

  private isDateDisabled(key: string): boolean {
    if (this.min && key < this.min) {
      return true;
    }

    if (this.max && key > this.max) {
      return true;
    }

    return false;
  }

  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
