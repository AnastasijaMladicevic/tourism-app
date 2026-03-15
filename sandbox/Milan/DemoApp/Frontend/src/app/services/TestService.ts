import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class TestService {

  constructor(private http: HttpClient) {}

  getMessage(){
    return this.http.get('http://localhost:5177/api/test');
  }
}