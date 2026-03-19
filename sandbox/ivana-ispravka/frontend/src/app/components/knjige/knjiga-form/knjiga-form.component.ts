import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookService } from '../../../services/knjiga.service';
import { Book } from '../../../models/knjiga.model';

@Component({
  selector: 'app-knjiga-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './knjiga-form.component.html',
  styleUrl: './knjiga-form.component.css'
})
export class KnjigaFormComponent {
  @Output() studentAdded = new EventEmitter<void>();

  book: Book = {
    title: '',
    author: '',
    isbn: '',
    yearPublished: new Date().getFullYear(),
    genre: '',
    publisher: '',
    rating: 5.0,
    addedDate: new Date()
  };

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';

  constructor(private bookService: BookService) {}

  onSubmit(): void {
    if (!this.book.title.trim() || !this.book.author.trim()) {
      this.errorMessage = 'Naslov i autor su obavezni!';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.bookService.createBook(this.book).subscribe(
      () => {
        this.successMessage = 'Knjiga je uspešno dodata!';
        this.resetForm();
        this.studentAdded.emit();
        this.isSubmitting = false;
        setTimeout(() => this.successMessage = '', 3000);
      },
      (error: unknown) => {
        this.errorMessage = 'Greška pri dodavanju knjige!';
        this.isSubmitting = false;
        console.error('Error:', error);
      }
    );
  }

  resetForm(): void {
    this.book = {
      title: '',
      author: '',
      isbn: '',
      yearPublished: new Date().getFullYear(),
      genre: '',
      publisher: '',
      rating: 5.0,
      addedDate: new Date()
    };
  }
}
