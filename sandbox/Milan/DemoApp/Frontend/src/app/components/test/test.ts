import { Component, OnInit } from '@angular/core';
import { TestService } from '../../services/TestService';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
  standalone: true,
  imports: [AsyncPipe],   
  templateUrl: './test.html'
})
export class TestComponent implements OnInit {

  data$: Observable<any>;
  data: any;

  constructor(private service: TestService) {
    this.data$ = this.service.getAll();
  }

  ngOnInit() {
    this.service.getAll().subscribe(res => {
      this.data = res;
    });
  }

}