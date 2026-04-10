import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './adminlayout.component.html',
  styleUrls: ['./adminlayout.component.css']
})
export class AdminLayoutComponent {

  searchQuery = '';

  // Ovo ces kasnije dobijati iz AuthService-a
  user = {
    name: 'Jarry McLovin',
    email: 'mclovin@spirego.com',
    initials: 'JM',
    avatarUrl: 'assets/avatar.jpg' // ili '' ako nema slike
  };

  constructor(private router: Router) {}

  signOut(): void {
    // Ovde ocisti token / sesiju
    this.router.navigate(['/login']);
  }
}