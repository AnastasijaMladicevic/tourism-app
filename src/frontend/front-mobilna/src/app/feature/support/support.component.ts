import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AiChatResponseDto, AiChatService } from '../../services/ai-chat';
import { LocationTrackingService } from '../../services/location-tracking';
import { SmartSearchResultDto } from '../../services/smart-search';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface FaqItem {
  questionKey: string;
  answerKey: string;
}

interface SupportChatMessage {
  role: 'user' | 'assistant';
  content: string;
  warning?: string;
  provider?: string;
  results?: SmartSearchResultDto[];
}

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss',
})
export class SupportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translationService = inject(TranslationService);
  private readonly aiChatService = inject(AiChatService);
  private readonly locationTrackingService = inject(LocationTrackingService);

  protected readonly backLink = this.route.snapshot.queryParamMap.get('returnTo') || '/settings';
  protected readonly query = signal('');
  protected readonly openIndex = signal<number | null>(1);
  protected readonly aiInput = signal('');
  protected readonly aiLoading = signal(false);
  protected readonly chatMessages = signal<SupportChatMessage[]>([]);

  protected readonly faqs: FaqItem[] = [
    { questionKey: 'support.faq.1.q', answerKey: 'support.faq.1.a' },
    { questionKey: 'support.faq.2.q', answerKey: 'support.faq.2.a' },
    { questionKey: 'support.faq.3.q', answerKey: 'support.faq.3.a' },
    { questionKey: 'support.faq.4.q', answerKey: 'support.faq.4.a' },
  ];

  protected get filteredFaqs(): Array<FaqItem & { originalIndex: number }> {
    const search = this.query().trim().toLowerCase();
    return this.faqs
      .map((item, index) => ({ ...item, originalIndex: index }))
      .filter((item) => {
        if (!search) {
          return true;
        }

        const question = this.translationService.translate(item.questionKey).toLowerCase();
        const answer = this.translationService.translate(item.answerKey).toLowerCase();
        return question.includes(search) || answer.includes(search);
      });
  }

  protected toggleFaq(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }

  protected onSearch(value: string): void {
    this.query.set(value);
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

    const userMessage: SupportChatMessage = { role: 'user', content: message };
    const nextHistory = [...this.chatMessages(), userMessage];

    this.chatMessages.set(nextHistory);
    this.aiInput.set('');
    this.aiLoading.set(true);

    this.aiChatService
      .chat({
        message,
        history: this.chatMessages().slice(0, -1).slice(-8).map((entry) => ({
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
      });
  }

  protected openResult(result: SmartSearchResultDto): void {
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

  protected isOpen(index: number): boolean {
    return this.openIndex() === index;
  }
}
