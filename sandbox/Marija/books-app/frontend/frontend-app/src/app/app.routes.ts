import { Routes } from '@angular/router';
import { BookListComponent } from './components/book-list/book-list';
import { BookDetailsComponent } from './components/book-details/book-details';
import { AddBookComponent } from './components/add-book/add-book';

export const routes: Routes = [
  { path: '', redirectTo: 'books', pathMatch: 'full' },

  { path: 'books', component: BookListComponent },
  { path: 'books/:id', component: BookDetailsComponent },

  { path: 'add-book', component: AddBookComponent },

  { path: '**', redirectTo: 'books' }
];