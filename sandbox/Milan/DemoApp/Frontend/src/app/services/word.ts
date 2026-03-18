import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class WordService {

  api = 'http://localhost:5177/api/words';

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any[]>(this.api);
  }

  add(word: string) {
    return this.http.post(this.api, { text: word });
  }

  delete(id: number) {
    return this.http.delete(`${this.api}/${id}`);
  }

  update(id: number, text: string) {
    return this.http.put(`${this.api}/${id}`, { text });
  }
}