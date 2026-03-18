import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestService } from './services/TestService';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

  messages: string[] = [];

  constructor(private service: TestService, private cdr: ChangeDetectorRef) {}

  ngOnInit(){
      this.service.getAll().subscribe((data: any) => {
      this.messages = data.messages;
      this.cdr.detectChanges();
    });
  }

}