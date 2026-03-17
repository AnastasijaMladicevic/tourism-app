import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Student } from '../../../models/student.model';

@Component({
  selector: 'app-student-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="students.length > 0; else noStudents" class="table-wrapper">
      <table class="students-table">
        <thead>
          <tr>
            <th>Ime</th>
            <th>Email</th>
            <th>Program</th>
            <th>Ocena</th>
            <th>Datum upisa</th>
            <th>Akcije</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let student of students">
            <td>{{ student.name }}</td>
            <td>{{ student.email }}</td>
            <td>{{ student.major }}</td>
            <td>{{ student.gpa.toFixed(2) }}</td>
            <td>{{ student.enrollmentDate | date: 'shortDate' }}</td>
            <td>
              <button class="btn-delete" (click)="onDelete(student.id)">Obriši</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <ng-template #noStudents>
      <p class="no-data">Nema studenata. Dodaj novog studenta da bi počeo!</p>
    </ng-template>
  `,
  styles: [`
    .table-wrapper {
      overflow-x: auto;
    }
    .students-table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 8px;
      overflow: hidden;
    }
    thead {
      background-color: #f8f9fa;
      border-bottom: 2px solid #dee2e6;
    }
    th {
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #333;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #dee2e6;
      color: #555;
    }
    tbody tr:hover {
      background-color: #f8f9fa;
    }
    .btn-delete {
      padding: 6px 12px;
      background-color: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }
    .btn-delete:hover {
      background-color: #c82333;
    }
    .no-data {
      text-align: center;
      color: #999;
      padding: 20px;
    }
  `]
})
export class StudentListComponent {
  @Input() students: Student[] = [];
  @Output() deleteStudent = new EventEmitter<number>();

  onDelete(id: number | undefined) {
    if (id) {
      this.deleteStudent.emit(id);
    }
  }
}
