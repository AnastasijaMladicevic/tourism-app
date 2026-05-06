import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './adminlayout.component.html',
  styleUrls: ['./adminlayout.component.css']
})
export class AdminLayoutComponent implements OnInit {

  searchQuery = '';

  user = {
    name: '',
    email: '',
    initials: '',
    avatarUrl: ''
  };

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const userData = this.authService.getUser();

    if (!userData) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = {
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      initials: `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase(),
      avatarUrl: ''
    };
  }

  signOut(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}