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
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../services/translation.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, LogoComponent, TranslatePipe],
  templateUrl: './verify-email.html',
  styleUrls: ['./verify-email.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class VerifyEmailComponent implements OnInit, OnDestroy {
  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef<HTMLInputElement>>;

  otpValues: string[] = ['', '', '', '', '', ''];
  timeLeft = 600;
  timerDisplay = '10:00 mins';
  isExpired = false;
  isLoading = false;
  isResending = false;
  errorMessage = '';
  resendMessage = '';
  email = '';

  private timerInterval?: ReturnType<typeof setInterval>;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private translationService: TranslationService,
  ) {
    this.email = history.state?.email || '';
  }

  ngOnInit(): void {
    if (!this.email) {
      this.router.navigate(['/login']);
      return;
    }
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  // ── Timer ────────────────────────────────────────────────────────────────

  private startTimer(): void {
    this.isExpired = false;
    this.timeLeft = 600;
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
        this.cdr.detectChanges();
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
    this.otpInputs.toArray()[Math.min(digits.length, 5)]?.nativeElement.focus();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  get isOtpComplete(): boolean {
    return this.otpValues.every((v) => v !== '');
  }

  get otpCode(): string {
    return this.otpValues.join('');
  }

  verifyCode(): void {
    if (!this.isOtpComplete) {
      this.errorMessage = this.translationService.translate('auth.verifyEmail.codeRequired');
      return;
    }
    if (this.isExpired) {
      this.errorMessage = this.translationService.translate('auth.verifyEmail.codeExpired');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.resendMessage = '';

    this.authService.verifyEmail(this.email, this.otpCode.trim()).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/login'], {
          state: { verified: true, email: this.email },
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage =
          err?.error?.message ?? this.translationService.translate('auth.verifyEmail.invalidCode');
        this.cdr.detectChanges();
      },
    });
  }

  resendCode(): void {
    if (this.isResending) return;

    this.otpValues = ['', '', '', '', '', ''];
    this.otpInputs?.forEach((i) => (i.nativeElement.value = ''));
    this.errorMessage = '';
    this.resendMessage = '';
    this.isResending = true;

    this.authService.resendVerificationEmail(this.email).subscribe({
      next: () => {
        this.isResending = false;
        this.resendMessage = this.translationService.translate('auth.verifyEmail.resendSuccess');
        this.clearTimer();
        this.startTimer();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isResending = false;
        this.resendMessage =
          err?.error?.message ?? this.translationService.translate('auth.verifyEmail.resendFailed');
        this.cdr.detectChanges();
      },
    });

    this.otpInputs?.toArray()[0]?.nativeElement.focus();
  }

  goBack(): void {
    this.router.navigate(['/login']);
  }
}
