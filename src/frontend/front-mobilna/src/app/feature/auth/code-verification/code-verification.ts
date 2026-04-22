import {
  Component,
  OnInit,
  OnDestroy,
  ViewChildren,
  QueryList,
  ElementRef,
  NgZone,
  ChangeDetectorRef,
  ViewEncapsulation,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LogoComponent } from '../../../shared/components/logo/logo';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-code-verification',
  standalone: true,
  imports: [CommonModule, LogoComponent],
  templateUrl: './code-verification.html',
  styleUrls: ['./code-verification.scss'],
  encapsulation: ViewEncapsulation.None, // lets root CSS variables like --primary reach this component
})
export class CodeVerificationComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  otpValues: string[] = ['', '', '', '', '', ''];
  timeLeft = 300;
  timerDisplay = '5:00 mins';
  isExpired = false;
  isLoading = false;
  errorMessage = '';
  email = '';

  private timerInterval?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
  ) {
    this.email = history.state?.email || '';
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
    this.timeLeft = 300;
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
    if (input.value && index < 5) {
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
    const digits = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 6);
    digits.split('').forEach((char, i) => {
      this.otpValues[i] = char;
      const el = this.otpInputs.toArray()[i];
      if (el) el.nativeElement.value = char;
    });
    this.otpInputs.toArray()[Math.min(digits.length, 4)]?.nativeElement.focus();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  get isOtpComplete(): boolean {
    return this.otpValues.every((v) => v !== '');
  }
  get otpCode(): string {
    return this.otpValues.join('');
  }
  verifyCode(): void {
    console.log(this.otpValues);
    if (!this.isOtpComplete) {
      this.errorMessage = 'Please enter all 6 digits.';
      return;
    }
    if (this.isExpired) {
      this.errorMessage = 'Code expired. Please resend.';
      return;
    }
    const payload = {
      email: this.email,
      code: this.otpCode.trim()
    };
console.log('PAYLOAD:', payload);
    this.isLoading = true;
  this.errorMessage = '';   

  this.authService.verifyResetCode(payload).subscribe({
    next: (response: any) => {
    this.isLoading = false;
    this.router.navigate(['/new-credentials'], {
      queryParams: { email: this.email },
      state: { 
        code: this.otpCode,
        resetSessionToken: response.resetSessionToken ?? response.token ?? response 
      }
    });
  },
    error: (err) => {
      this.isLoading = false;
      this.errorMessage = err?.error?.message ?? 'Invalid code';
      console.log(err);
    }
  });
  }

  resendCode(): void {
    this.otpValues = ['', '', '', '', '', ''];
    this.otpInputs?.forEach((i) => (i.nativeElement.value = ''));
    this.errorMessage = '';
    this.clearTimer();
    this.startTimer();
    this.authService.forgotPassword(this.email).subscribe({
      error: err => this.errorMessage = err?.error?.message ?? 'Failed to resend code.'
    });
    this.otpInputs?.toArray()[0]?.nativeElement.focus();
  }

  goBack(): void {
    this.router.navigate(['/forgot-password']);
  }
}
