import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

interface FaqItem {
  questionKey: string;
  answerKey: string;
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
  private readonly translationService = inject(TranslationService);

  protected readonly backLink = this.route.snapshot.queryParamMap.get('returnTo') || '/settings';
  protected readonly query = signal('');
  protected readonly openIndex = signal<number | null>(1);

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

  protected isOpen(index: number): boolean {
    return this.openIndex() === index;
  }
}
