import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { DestinacijeServis, Destinacija } from '../../services/destinacije';

@Component({
  selector: 'app-lista-destinacija',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './lista-destinacija.html',
  styleUrl: './lista-destinacija.css'
})
export class ListaDestinacija implements OnInit {
  destinacije = signal<Destinacija[]>([]);
  ucitavanje = signal(true);
  greska = signal('');

  constructor(private servis: DestinacijeServis) {}

  ngOnInit(): void {
    this.servis.vratiSve().subscribe({
      next: (podaci) => {
        this.destinacije.set(podaci);
        this.ucitavanje.set(false);
      },
      error: (err) => {
        this.greska.set('Greška pri učitavanju.');
        this.ucitavanje.set(false);
        console.error(err);
      }
    });
  }

  ocenaUZvezdice(ocena: number): string {
    return '★'.repeat(Math.round(ocena)) + '☆'.repeat(5 - Math.round(ocena));
  }
}