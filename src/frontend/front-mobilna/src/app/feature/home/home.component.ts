import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar.component';
import { BottomNavComponent } from '../bottom-nav/bottom-nav.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavbarComponent, BottomNavComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {}
