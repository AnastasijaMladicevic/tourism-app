import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Book } from '../../../models/knjiga.model';

@Component({
  selector: 'app-knjiga-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './knjiga-list.component.html',
  styleUrl: './knjiga-list.component.css'
})
export class KnjigaListComponent {
  @Input() students: Book[] = [];
  @Output() deleteStudent = new EventEmitter<number>();

  onDelete(id: number | undefined): void {
    if (id && confirm('Da li ste sigurni da želite da obrišete ovu knjigu?')) {
      this.deleteStudent.emit(id);
    }
  }

  getRatingColor(rating: number): string {
    if (rating >= 9) return 'excellent';
    if (rating >= 7) return 'good';
    if (rating >= 5) return 'satisfactory';
    return 'low';
  }
}
