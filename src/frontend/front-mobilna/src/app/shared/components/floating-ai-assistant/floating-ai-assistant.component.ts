import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import { catchError, filter, of } from 'rxjs';
import { AiChatResponseDto, AiChatService } from '../../../services/ai-chat';
import { LocationTrackingService } from '../../../services/location-tracking';
import { SmartSearchResultDto } from '../../../services/smart-search';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../../services/translation.service';

interface FloatingAiMessage {
  role: 'user' | 'assistant';
  content: string;
  warning?: string;
  provider?: string;
  results?: SmartSearchResultDto[];
}

@Component({
  selector: 'app-floating-ai-assistant',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './floating-ai-assistant.component.html',
  styleUrl: './floating-ai-assistant.component.scss',
})
export class FloatingAiAssistantComponent {
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);
  private readonly aiChatService = inject(AiChatService);
  private readonly locationTrackingService = inject(LocationTrackingService);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('threadContainer')
  private threadContainer?: ElementRef<HTMLDivElement>;

  protected readonly isOpen = signal(false);
  protected readonly aiInput = signal('');
  protected readonly aiLoading = signal(false);
  protected readonly chatMessages = signal<FloatingAiMessage[]>([]);

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.isOpen.set(false);
      });
  }

  protected togglePanel(): void {
    const nextState = !this.isOpen();
    this.isOpen.set(nextState);

    if (nextState) {
      this.scrollThreadToEnd();
    }
  }

  protected closePanel(): void {
    this.isOpen.set(false);
  }

  protected onAiInput(value: string): void {
    this.aiInput.set(value);
  }

  protected onAiKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendAiMessage();
    }
  }

  protected usePrompt(prompt: string): void {
    this.aiInput.set(prompt);
    this.sendAiMessage();
  }

  protected sendAiMessage(): void {
    const message = this.aiInput().trim();
    if (!message || this.aiLoading()) {
      return;
    }

    const currentLocation = this.locationTrackingService.getCurrentLocation();
    const includeLocation =
      this.locationTrackingService.isTrackingEnabled() && currentLocation != null;

    const userMessage: FloatingAiMessage = { role: 'user', content: message };
    const previousMessages = this.chatMessages();
    const nextMessages = [...previousMessages, userMessage];

    this.chatMessages.set(nextMessages);
    this.aiInput.set('');
    this.aiLoading.set(true);
    this.scrollThreadToEnd();

    this.aiChatService
      .chat({
        message,
        history: previousMessages.slice(-8).map((entry) => ({
          role: entry.role,
          content: entry.content,
        })),
        latitude: includeLocation ? currentLocation?.latitude : undefined,
        longitude: includeLocation ? currentLocation?.longitude : undefined,
      })
      .pipe(
        catchError(() =>
          of({
            answer: this.translationService.translate('support.aiError'),
            provider: 'fallback',
            usedTool: false,
            usedFallback: true,
            warning: undefined,
            results: [],
          } satisfies AiChatResponseDto),
        ),
      )
      .subscribe((response) => {
        this.chatMessages.update((messages) => [
          ...messages,
          {
            role: 'assistant',
            content: response.answer,
            warning: response.warning,
            provider: response.provider,
            results: response.results,
          },
        ]);
        this.aiLoading.set(false);
        this.scrollThreadToEnd();
      });
  }

  protected openResult(result: SmartSearchResultDto): void {
    this.closePanel();

    switch (result.category) {
      case 'destination':
      case 'locality':
      case 'activity':
        this.router.navigate(['/map'], {
          state: {
            lat: result.latitude,
            lng: result.longitude,
            zoom: 14,
            selectedItem: { id: result.id },
            selectedType: result.category,
          },
        });
        break;
      case 'object':
        this.router.navigate(['/object', result.id]);
        break;
      case 'event':
        this.router.navigate(['/event', result.id]);
        break;
    }
  }

  protected trackResult(_: number, result: SmartSearchResultDto): string {
    return `${result.category}-${result.id}`;
  }

  private scrollThreadToEnd(): void {
    requestAnimationFrame(() => {
      const container = this.threadContainer?.nativeElement;
      if (!container) {
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });
  }
}
