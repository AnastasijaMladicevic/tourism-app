import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './support.component.html',
  styleUrl: './support.component.scss',
})
export class SupportComponent {
  protected readonly query = signal('');
  protected readonly openIndex = signal<number | null>(1);

  protected readonly faqs: FaqItem[] = [
    {
      question: 'Kako da platim turističku taksu?',
      answer:
        'Turističku taksu možete platiti na recepciji smeštaja, u turističkom centru ili prema instrukcijama lokalne samouprave za destinaciju u kojoj boravite.',
    },
    {
      question: 'Da li je aplikacija dostupna offline?',
      answer:
        'Osnovni pregled ranije učitanog sadržaja može biti dostupan i bez interneta, ali za ažurne informacije, mape i rezervacije preporučujemo aktivnu internet konekciju.',
    },
    {
      question: 'Kako da otkažem rezervaciju karte?',
      answer:
        'Otvaranjem detalja rezervacije možete proveriti uslove otkazivanja. Ako je otkazivanje dozvoljeno, pratite korake u potvrdi rezervacije ili kontaktirajte organizatora.',
    },
    {
      question: 'Gde mogu pronaći hitnu pomoć?',
      answer:
        'Za hitne situacije koristite lokalne brojeve službi pomoći ili se obratite najbližem turističkom centru, hotelu ili zdravstvenoj ustanovi u mestu boravka.',
    },
  ];

  protected get filteredFaqs(): Array<FaqItem & { originalIndex: number }> {
    const search = this.query().trim().toLowerCase();
    return this.faqs
      .map((item, index) => ({ ...item, originalIndex: index }))
      .filter(
        (item) =>
          !search
          || item.question.toLowerCase().includes(search)
          || item.answer.toLowerCase().includes(search),
      );
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
