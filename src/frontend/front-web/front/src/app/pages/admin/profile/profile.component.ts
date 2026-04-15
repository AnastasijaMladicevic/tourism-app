import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserDto } from '../../../models/user.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  user: UserDto = {
    firstName: '',
    lastName: '',
    email: '',
    dateOfBirth: '',
    phoneNumber: '',
    country: '',
    language: ''
  };

  initials = '';
  role = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const userData = this.authService.getUser();

    if (!userData) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = { ...userData };
    this.initials = `${userData.firstName[0]}${userData.lastName[0]}`.toUpperCase();
    this.role = this.authService.getNormalizedRole(userData) ?? '';
  }

  saveChanges(): void {
    // Kada backend bude spreman:
    // this.userService.updateProfile(this.user).subscribe(...)
    console.log('Saving:', this.user);
  }
}