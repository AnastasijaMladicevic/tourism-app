import { CommonModule } from '@angular/common';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BookService } from '../../services/book';
import { Book } from '../../models/book';
import { FormsModule } from '@angular/forms'

@Component({
  selector: 'app-book-list',
  standalone: true,
  templateUrl: './book-list.html',
  imports: [CommonModule, FormsModule]
})
export class BookListComponent implements OnInit {
  books: Book[] = [];

  newBook : Book = {
    id: 0, 
    title: '',
    author: '',
    year: new Date().getFullYear()
  };

  constructor(
    private bookService: BookService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBooks();
  }

  loadBooks() {
    this.bookService.getBooks().subscribe((data: any) => {
      this.books = data.$values ?? data; // obrađuje .NET List
      this.cd.detectChanges();
    });
  }

  addBook() {
    
    if (!this.newBook.title || !this.newBook.author) {
    return;
  }

    this.bookService.addBook(this.newBook).subscribe(() => {
      this.loadBooks();
      this.newBook = { 
        id: 0, 
        title: '', 
        author: '', 
        year: new Date().getFullYear() };
    });

    this.cd.detectChanges();
  }

  deleteBook(id: number) {
    this.bookService.deleteBook(id).subscribe(() => {
      this.loadBooks();
      this.cd.detectChanges();
    });
  }
}