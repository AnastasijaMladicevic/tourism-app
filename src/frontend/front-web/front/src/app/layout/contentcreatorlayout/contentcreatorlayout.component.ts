import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserDto } from '../../models/user.model';

@Component({
  selector: 'app-content-creator-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contentcreatorlayout.component.html',
  styleUrls: ['./contentcreatorlayout.component.css'],
})
export class ContentCreatorLayoutComponent implements OnInit {
  searchQuery = '';
  user: any = {
    name: '',
    email: '',
    initials: '',
    avatarUrl: null,
  };

  constructor(private router: Router, private authService: AuthService) { }

  ngOnInit(): void {
    this.loadUser();
    window.addEventListener('storage', this.loadUser);
  }
  ngOnDestroy(): void {
    window.removeEventListener('storage', this.loadUser);
  }
  private loadUser = (): void => {
    const userData = this.authService.getCurrentUser();

    if (!userData) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = {
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      initials: `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase(),
      avatarUrl: userData.profileImageUrl || ''
    };
  };

  private getInitials(firstName: string, lastName: string): string {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    return `${first}${last}`;
  }

  signOut(): void {
    this.router.navigate(['/signout']);
  }
}
