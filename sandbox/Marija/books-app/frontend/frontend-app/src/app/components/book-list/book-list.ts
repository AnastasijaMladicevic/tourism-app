import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BookService } from '../../services/book';
import { Book } from '../../models/book';

@Component({
  selector: 'app-book-list',
  standalone: true,
  templateUrl: './book-list.html',
  imports: [CommonModule]
})
export class BookListComponent implements OnInit {
  books: Book[] = [];

  constructor(private bookService: BookService) {}

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks() {
    this.bookService.getBooks().subscribe((data: any) => {
      this.books = data.$values ?? data; // obrađuje .NET List
    });
  }

  deleteBook(id: number) {
    this.bookService.deleteBook(id).subscribe(() => {
      this.loadBooks(); // osveži listu
    });
  }
}