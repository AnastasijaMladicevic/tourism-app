import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
  private readonly route = inject(ActivatedRoute);

  protected readonly backLink = this.route.snapshot.queryParamMap.get('returnTo') || '/profile';
  protected readonly query = signal('');
  protected readonly openIndex = signal<number | null>(1);

  protected readonly faqs: FaqItem[] = [
    {
      question: 'Kako da azuriram podatke na profilu?',
      answer:
        'Na ekranu Izmeni profil mozes promeniti ime, prezime, telefon, drzavu i profilnu fotografiju koristeci postojece nalog opcije.',
    },
    {
      question: 'Gde vidim sacuvane stavke?',
      answer:
        'Favorites ekran prikazuje sve stavke sacuvane preko postojeceg API-ja i omogucava brzo uklanjanje onoga sto ti vise ne treba.',
    },
    {
      question: 'Kako radi planer putovanja?',
      answer:
        'Planer trenutno radi lokalno na uredjaju i ne trazi backend izmene. Mozes sacuvati destinaciju, datum, beleske i checklistu.',
    },
    {
      question: 'Kako da promenim jezik aplikacije?',
      answer:
        'Na ekranu Jezik mozes izabrati trenutno podrzanu varijantu i sacuvati promenu preko postojece korisnicke rute.',
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
