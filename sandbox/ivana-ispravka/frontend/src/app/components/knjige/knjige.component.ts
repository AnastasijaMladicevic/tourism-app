import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookService } from '../../services/knjiga.service';
import { Book } from '../../models/knjiga.model';
import { KnjigaFormComponent } from './knjiga-form/knjiga-form.component';
import { KnjigaListComponent } from './knjiga-list/knjiga-list.component';

@Component({
  selector: 'app-books',
  standalone: true,
  imports: [CommonModule, KnjigaFormComponent, KnjigaListComponent],
  templateUrl: './knjige.component.html',
  styleUrl: './knjige.component.css'
})
export class BooksComponent implements OnInit {
  books: Book[] = [];

  constructor(
    private bookService: BookService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks(): void {
    this.bookService.getAllBooks().subscribe(
      (data: Book[]) => {
        this.books = data;
        this.cdr.detectChanges();
      },
      (error: unknown) => {
        console.error('Error loading books:', error);
      }
    );
  }

  onBookAdded(): void {
    this.loadBooks();
  }

  onDeleteBook(id: number): void {
    this.bookService.deleteBook(id).subscribe(
      () => {
        this.loadBooks();
      },
      (error: unknown) => {
        console.error('Error deleting book:', error);
      }
    );
  }
}
