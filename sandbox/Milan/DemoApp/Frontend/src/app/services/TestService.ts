import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class TestService {

  api = 'http://localhost:5177/api/test';

  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<any>(this.api);
  }
}