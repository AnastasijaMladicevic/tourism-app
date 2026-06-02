import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-paginator',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './paginator.html',
  styleUrls: ['./paginator.css']
})
export class PaginatorComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() pageStart = 1;
  @Input() pageEnd = 0;
  @Input() totalCount = 0;
  @Input() pageSize = 10;
  @Input() pageSizeOptions: number[] = [5, 10, 20, 50];
  @Input() itemLabel = 'items';

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  jumpValue = '';

  prev(): void {
    if (this.currentPage > 1) {
      this.pageChange.emit(this.currentPage - 1);
    }
  }

  next(): void {
    if (this.currentPage < this.totalPages) {
      this.pageChange.emit(this.currentPage + 1);
    }
  }

  onJump(): void {
    const page = parseInt(this.jumpValue, 10);
    if (Number.isFinite(page) && page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
    this.jumpValue = '';
  }

  onSizeChange(value: number): void {
    this.pageSizeChange.emit(Number(value));
  }
}
