import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss',
})
export class TermsComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly backLink = this.route.snapshot.queryParamMap.get('returnTo') || '/profile';
  protected readonly sections = [
    {
      title: 'Koriscenje aplikacije',
      body:
        'Mobilni frontend omogucava pregled destinacija, objekata, sacuvanih stavki i licnih podesavanja. Korisnik je odgovoran za tacnost podataka koje unosi na svom nalogu.',
    },
    {
      title: 'Sadrzaj i informacije',
      body:
        'Prikazani podaci zavise od dostupnih API odgovora. Frontend prikazuje ono sto backend trenutno vraca i ne garantuje dodatne funkcionalnosti koje nisu podrzane rutama sistema.',
    },
    {
      title: 'Nalog i bezbednost',
      body:
        'Odjava, izmena osnovnih podataka i promena fotografije koriste postojece nalog mehanizme. Za dodatne nalog akcije potrebna je posebna backend podrska.',
    },
  ];

  protected readonly notes = [
    'Sacuvane stavke, recenzije i profilni podaci vezani su za trenutno ulogovan nalog.',
    'Lokalno sacuvani planer radi samo na uredjaju na kom je kreiran.',
    'Za pravne i produkcione verzije uslova potrebno je uskladjivanje sa timom i backend specifikacijom.',
  ];
}
