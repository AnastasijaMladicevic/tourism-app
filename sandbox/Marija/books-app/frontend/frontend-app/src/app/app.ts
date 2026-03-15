import { Component } from '@angular/core';
import { BookListComponent } from './components/book-list/book-list';

@Component({
  selector: 'app-root',
  standalone: true,
  template: `
    <h1>Moje pročitane knjige</h1>
    <app-book-list></app-book-list>
  `,
  imports: [BookListComponent]
})
export class AppComponent {}