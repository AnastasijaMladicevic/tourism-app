import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TestService } from './services/TestService';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {

  messages: string[] = [];

  constructor(private service: TestService) {}

  ngOnInit(){
    this.service.getMessage().subscribe((data: any) => {
      this.messages = data.messages;
    });
  }

}