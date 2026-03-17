import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Recenzija {
  id: string;
  destinacijaId: string;
  autorNaziv: string;
  ocena: number;
  komentar: string;
  kreiran: string;
}

export interface NovaRecenzija {
  destinacijaId: string;
  autorNaziv: string;
  ocena: number;
  komentar: string;
}

@Injectable({
  providedIn: 'root'
})
export class RecenzijeServis {
  private apiUrl = 'http://localhost:5185/api/recenzije';

  constructor(private http: HttpClient) {}

  vratiPoDestinaciji(destinacijaId: string): Observable<Recenzija[]> {
    return this.http.get<Recenzija[]>(`${this.apiUrl}/destinacija/${destinacijaId}`);
  }

  dodaj(recenzija: NovaRecenzija): Observable<Recenzija> {
    return this.http.post<Recenzija>(this.apiUrl, recenzija);
  }

  obrisi(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}