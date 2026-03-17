import { Component } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { StudentsComponent } from './components/students/students.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [HttpClientModule, StudentsComponent],
  template: `<app-students></app-students>`,
  styleUrl: './app.css'
})
export class App {
}
