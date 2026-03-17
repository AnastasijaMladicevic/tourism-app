import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { StudentService } from '../../../services/student.service';
import { Student } from '../../../models/student.model';

@Component({
  selector: 'app-student-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label for="name">Ime:</label>
        <input 
          type="text" 
          id="name" 
          formControlName="name" 
          class="form-control"
          placeholder="Unesite ime studenta"
        />
        <small *ngIf="form.get('name')?.hasError('required') && form.get('name')?.touched" class="error">
          Ime je obavezno
        </small>
      </div>

      <div class="form-group">
        <label for="email">Email:</label>
        <input 
          type="email" 
          id="email" 
          formControlName="email" 
          class="form-control"
          placeholder="Unesite email"
        />
        <small *ngIf="form.get('email')?.hasError('required') && form.get('email')?.touched" class="error">
          Email je obavezan
        </small>
        <small *ngIf="form.get('email')?.hasError('email') && form.get('email')?.touched" class="error">
          Neispravan format emaila
        </small>
      </div>

      <div class="form-group">
        <label for="major">Studijski program:</label>
        <select 
          id="major" 
          formControlName="major" 
          class="form-control"
        >
          <option value="">-- Izaberi program --</option>
          <option value="SI">Softversko inženjerstvo (SI)</option>
          <option value="RN">Računarske mreže (RN)</option>
          <option value="IKT">Informacione i komunikacione tehnologije (IKT)</option>
        </select>
        <small *ngIf="form.get('major')?.hasError('required') && form.get('major')?.touched" class="error">
          Studijski program je obavezan
        </small>
      </div>

      <div class="form-group">
        <label for="gpa">Ocena (6-10):</label>
        <input 
          type="number" 
          id="gpa" 
          formControlName="gpa" 
          class="form-control"
          step="0.01"
          min="6"
          max="10"
          placeholder="Unesite ocenu od 6 do 10"
        />
        <small *ngIf="form.get('gpa')?.hasError('required') && form.get('gpa')?.touched" class="error">
          Ocena je obavezna
        </small>
        <small *ngIf="form.get('gpa')?.hasError('min') && form.get('gpa')?.touched" class="error">
          Minimalna ocena je 6
        </small>
        <small *ngIf="form.get('gpa')?.hasError('max') && form.get('gpa')?.touched" class="error">
          Maksimalna ocena je 10
        </small>
      </div>

      <button type="submit" class="btn-submit" [disabled]="!form.valid">
        Dodaj studenta
      </button>
      <div *ngIf="successMessage" class="success-message">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="error-message">{{ errorMessage }}</div>
    </form>
  `,
  styles: [`
    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    label {
      font-weight: 600;
      color: #333;
    }
    .form-control {
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .form-control:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
    }
    small.error {
      color: #dc3545;
      font-size: 12px;
    }
    .btn-submit {
      padding: 10px 20px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
    }
    .btn-submit:hover:not(:disabled) {
      background-color: #0056b3;
    }
    .btn-submit:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }
    .success-message {
      color: #28a745;
      background-color: #d4edda;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
    }
    .error-message {
      color: #dc3545;
      background-color: #f8d7da;
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
    }
  `]
})
export class StudentFormComponent {
  @Output() studentAdded = new EventEmitter<void>();

  form: FormGroup;
  successMessage = '';
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      major: ['', Validators.required],
      gpa: ['', [Validators.required, Validators.min(6), Validators.max(10)]],
      enrollmentDate: [new Date().toISOString().split('T')[0], Validators.required]
    });
  }

  onSubmit() {
    if (this.form.valid) {
      const student: Student = {
        ...this.form.value,
        enrollmentDate: new Date(this.form.value.enrollmentDate),
        gpa: parseFloat(this.form.value.gpa)
      };

      this.studentService.createStudent(student).subscribe({
        next: () => {
          this.successMessage = 'Student je uspešno dodan!';
          this.form.reset();
          this.form.patchValue({ enrollmentDate: new Date().toISOString().split('T')[0] });
          this.studentAdded.emit();
          setTimeout(() => this.successMessage = '', 3000);
        },
        error: () => {
          this.errorMessage = 'Greška pri dodavanju studenta';
          setTimeout(() => this.errorMessage = '', 3000);
        }
      });
    }
  }
}
