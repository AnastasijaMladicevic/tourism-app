import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentService } from '../../services/student.service';
import { Student } from '../../models/student.model';
import { StudentFormComponent } from './student-form/student-form.component';
import { StudentListComponent } from './student-list/student-list.component';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, StudentFormComponent, StudentListComponent],
  template: `
    <div class="container">
      <h1>Sistem za upravljanje studentima</h1>
      <div *ngIf="isLoading" class="loading">Učitavanje...</div>
      <div class="content-wrapper" *ngIf="!isLoading">
        <div class="form-section">
          <h2>Dodaj novog studenta</h2>
          <app-student-form (studentAdded)="onStudentAdded()"></app-student-form>
        </div>
        <div class="list-section">
          <h2>Lista studenata ({{students.length}})</h2>
          <app-student-list [students]="students" (deleteStudent)="onDeleteStudent($event)"></app-student-list>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      text-align: center;
      color: #333;
      margin-bottom: 30px;
    }
    .content-wrapper {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .form-section, .list-section {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
    }
    h2 {
      color: #555;
      margin-bottom: 20px;
    .loading {
      text-align: center;
      padding: 40px;
      font-size: 18px;
      color: #666;
    }
    }
    @media (max-width: 768px) {
      .content-wrapper {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class StudentsComponent implements OnInit {
  students: Student[] = [];
  isLoading = true;

  constructor(private studentService: StudentService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadStudents();
  }

  loadStudents() {
    this.isLoading = true;
    console.log('Ucitavam studente...');
    this.studentService.getAllStudents().subscribe({
      next: (data: Student[]) => {
        console.log('Studenti ucitani:', data);
        this.students = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('Greška pri učitavanju:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onStudentAdded() {
    this.loadStudents();
  }

  onDeleteStudent(id: number) {
    if (confirm('Da li si siguran da želiš da obrišeš ovog studenta?')) {
      this.studentService.deleteStudent(id).subscribe({
        next: () => {
          this.loadStudents();
        },
        error: (error: any) => {
          console.error('Error deleting student:', error);
          this.loadStudents();
        }
      });
    }
  }
}
