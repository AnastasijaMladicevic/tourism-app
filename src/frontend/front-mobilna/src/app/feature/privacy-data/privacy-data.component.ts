import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-privacy-data',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './privacy-data.component.html',
  styleUrl: './privacy-data.component.scss',
})
export class PrivacyDataComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly backLink = this.route.snapshot.queryParamMap.get('returnTo') || '/profile';
  protected readonly sections = [
    {
      title: 'Podaci naloga',
      body:
        'Na mobilnom frontendu trenutno prikazujemo osnovne podatke naloga kao sto su ime, prezime, email, telefon, drzava i fotografija profila.',
    },
    {
      title: 'Lokalno sacuvani podaci',
      body:
        'Planer putovanja i interesovanja mogu biti sacuvani lokalno na uredjaju, bez slanja novih podataka na backend.',
    },
    {
      title: 'Kako prijaviti izmenu',
      body:
        'Ako zelis ispravku podataka ili dodatna objasnjenja, koristi ekran Pomoc i podrska ili kontakt adresu navedenu u aplikaciji.',
    },
  ];

  protected readonly notes = [
    'Frontend deo ne upravlja brisanjem naloga ni eksportom podataka bez backend podrske.',
    'Profilna fotografija i izmene osnovnih podataka koriste postojece API rute koje su vec dostupne.',
    'Za osetljive nalog akcije potrebno je dodatno backend resenje i dozvole.',
  ];
}
