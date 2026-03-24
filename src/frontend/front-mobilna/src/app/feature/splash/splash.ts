import { Component, OnInit, signal } from '@angular/core';
// import { Router } from '@angular/router';
import { LoginComponent } from "../login/login";

@Component({
  selector: 'app-splash',
  standalone: true,
  templateUrl: './splash.html',
  styleUrl: './splash.scss',
  imports: [LoginComponent],
})
export class SplashComponent implements OnInit {
  showSplash = signal(true);

  ngOnInit() {
    setTimeout(() => this.showSplash.set(false), 2000);
  }
}