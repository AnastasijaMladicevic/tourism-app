import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserDto } from '../../models/user.model';

@Component({
  selector: 'app-manager-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './managerlayout.component.html',
  styleUrls: ['./managerlayout.component.css'],
})
export class ManagerLayoutComponent implements OnInit {
  searchQuery = '';
  user: any = {
    name: '',
    email: '',
    initials: '',
    avatarUrl: null,
  };

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  private loadUserData(): void {
    const userData = this.authService.getUser();
    if (userData) {
      this.user = {
        name: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        initials: this.getInitials(userData.firstName, userData.lastName),
        avatarUrl: null,
      };
    }
  }

  private getInitials(firstName: string, lastName: string): string {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    return `${first}${last}`;
  }

  signOut(): void {
    this.router.navigate(['/signout']);
  }
}
