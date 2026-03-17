import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Kategorija {
  id: string;
  naziv: string;
  ikonica: string;
}

export interface Destinacija {
  id: string;
  naziv: string;
  opis: string;
  lokacija: string;
  zemlja: string;
  urlSlike: string;
  kategorijaId: string;
  prosecnaOcena: number;
  brojRecenzija: number;
  kategorija: Kategorija;
}

@Injectable({
  providedIn: 'root'
})
export class DestinacijeServis {
  private apiUrl = 'http://localhost:5185/api/destinacije';

  constructor(private http: HttpClient) {}

  vratiSve(): Observable<Destinacija[]> {
    return this.http.get<Destinacija[]>(this.apiUrl);
  }

  vratiPoId(id: string): Observable<Destinacija> {
    return this.http.get<Destinacija>(`${this.apiUrl}/${id}`);
  }

  vratiPoKategoriji(kategorijaId: string): Observable<Destinacija[]> {
    return this.http.get<Destinacija[]>(`${this.apiUrl}/kategorija/${kategorijaId}`);
  }
}