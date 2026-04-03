import { Component, OnInit, OnDestroy, ViewChildren, QueryList, ElementRef, NgZone, ChangeDetectorRef, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-code-verification',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './code-verification.html',
  styleUrls: ['./code-verification.scss'],
  encapsulation: ViewEncapsulation.None, // lets root CSS variables like --primary reach this component
})
export class CodeVerificationComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  otpValues: string[] = ['', '', '', '', ''];
  timeLeft = 120;
  timerDisplay = '2:00 mins';
  isExpired = false;
  isLoading = false;
  errorMessage = '';
  email = '';

  private timerInterval?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {
    // history.state is the standard way to read router state in Angular 17+
    this.email = history.state?.['email'] ?? '';
  }

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // ── Timer ────────────────────────────────────────────────────────────────

  private startTimer(): void {
    this.isExpired = false;
    this.timeLeft = 120;
    this.updateTimerDisplay();

    this.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        this.timeLeft--;
        this.updateTimerDisplay();
        if (this.timeLeft <= 0) {
          this.clearTimer();
          this.isExpired = true;
          this.timerDisplay = '0:00 mins';
        }
        this.cdr.detectChanges(); // force view update every tick
      });
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private updateTimerDisplay(): void {
    const m = Math.floor(this.timeLeft / 60);
    const s = this.timeLeft % 60;
    this.timerDisplay = `${m}:${s.toString().padStart(2, '0')} mins`;
  }

  // ── OTP input handlers ───────────────────────────────────────────────────

  onInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length > 1) input.value = input.value.slice(-1);
    this.otpValues[index] = input.value;
    this.errorMessage = '';
    if (input.value && index < 4) {
      this.otpInputs.toArray()[index + 1]?.nativeElement.focus();
    }
  }

  onKeyDown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace') {
      if (!input.value && index > 0) {
        this.otpInputs.toArray()[index - 1]?.nativeElement.focus();
        this.otpValues[index - 1] = '';
      } else {
        this.otpValues[index] = '';
      }
    }
    if (event.key === 'ArrowLeft' && index > 0)
      this.otpInputs.toArray()[index - 1]?.nativeElement.focus();
    if (event.key === 'ArrowRight' && index < 4)
      this.otpInputs.toArray()[index + 1]?.nativeElement.focus();
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 5);
    digits.split('').forEach((char, i) => {
      this.otpValues[i] = char;
      const el = this.otpInputs.toArray()[i];
      if (el) el.nativeElement.value = char;
    });
    this.otpInputs.toArray()[Math.min(digits.length, 4)]?.nativeElement.focus();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  get isOtpComplete(): boolean {
    return this.otpValues.every(v => v !== '');
  }

  verifyCode(): void {
    if (!this.isOtpComplete) { this.errorMessage = 'Please enter all 5 digits.'; return; }
    if (this.isExpired)      { this.errorMessage = 'Code expired. Please resend.'; return; }
    this.isLoading = true;
    this.errorMessage = '';
    // TODO: replace with real auth service call
    setTimeout(() => {
      this.isLoading = false;
      this.router.navigate(['/new-credentials']);
    }, 1000);
  }

  resendCode(): void {
    this.otpValues = ['', '', '', '', ''];
    this.otpInputs?.forEach(i => (i.nativeElement.value = ''));
    this.errorMessage = '';
    this.clearTimer();
    this.startTimer();
    // TODO: call authService.resendOtp(this.email)
    this.otpInputs?.toArray()[0]?.nativeElement.focus();
  }

  goBack(): void {
    this.router.navigate(['/forgot-password']);
  }
}
