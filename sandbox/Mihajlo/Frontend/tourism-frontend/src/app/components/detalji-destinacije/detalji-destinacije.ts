import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DestinacijeServis, Destinacija } from '../../services/destinacije';
import { RecenzijeServis, Recenzija, NovaRecenzija } from '../../services/recenzije';

@Component({
  selector: 'app-detalji-destinacije',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './detalji-destinacije.html',
  styleUrl: './detalji-destinacije.css'
})
export class DetaljiDestinacije implements OnInit {
  destinacija = signal<Destinacija | null>(null);
  recenzije = signal<Recenzija[]>([]);
  ucitavanje = signal(true);
  greska = signal('');
  slanjePodataka = signal(false);
  uspesnoDodata = signal(false);

  novaRecenzija = signal<NovaRecenzija>({
    destinacijaId: '',
    autorNaziv: '',
    ocena: 5,
    komentar: ''
  });

  constructor(
    private route: ActivatedRoute,
    private destServis: DestinacijeServis,
    private recServis: RecenzijeServis
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.novaRecenzija.update(r => ({ ...r, destinacijaId: id }));

    this.destServis.vratiPoId(id).subscribe({
      next: (podaci) => {
        this.destinacija.set(podaci);
        this.ucitavanje.set(false);
      },
      error: () => {
        this.greska.set('Destinacija nije pronađena.');
        this.ucitavanje.set(false);
      }
    });

    this.ucitajRecenzije(id);
  }

  ucitajRecenzije(id: string): void {
    this.recServis.vratiPoDestinaciji(id).subscribe({
      next: (podaci) => this.recenzije.set(podaci),
      error: () => console.error('Greška pri učitavanju recenzija.')
    });
  }

  ocenaUZvezdice(ocena: number): string {
    return '★'.repeat(Math.round(ocena)) + '☆'.repeat(5 - Math.round(ocena));
  }

  posaljiRecenziju(): void {
    const rec = this.novaRecenzija();
    if (!rec.autorNaziv.trim() || !rec.komentar.trim()) return;

    this.slanjePodataka.set(true);
    this.recServis.dodaj(rec).subscribe({
      next: () => {
        this.uspesnoDodata.set(true);
        this.slanjePodataka.set(false);
        this.novaRecenzija.set({
          destinacijaId: this.destinacija()!.id,
          autorNaziv: '',
          ocena: 5,
          komentar: ''
        });
        this.ucitajRecenzije(this.destinacija()!.id);
        setTimeout(() => this.uspesnoDodata.set(false), 3000);
      },
      error: () => {
        this.slanjePodataka.set(false);
        console.error('Greška pri dodavanju recenzije.');
      }
    });
  }
}