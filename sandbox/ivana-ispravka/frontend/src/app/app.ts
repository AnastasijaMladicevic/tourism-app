import { Component } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BooksComponent } from './components/knjige/knjige.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule, BooksComponent],
  template: `<app-books></app-books>`,
  styleUrl: './app.css'
})
export class App {
}
