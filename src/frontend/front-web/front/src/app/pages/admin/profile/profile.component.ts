import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent {

  // Kada backend bude gotov, ovo popuniš iz AuthService-a:
  // const u = this.authService.getUser();
  user = {
    firstName: 'Jarry',
    lastName: 'McLovin',
    email: 'mclovin@spirego.com',
    phone: '+1 (555) 123-4567',
    dateOfBirth: '1990-05-15',
    timezone: 'North America (EST)',
    organization: 'SipreGO',
    division: 'Engineering Division',
    role: 'Admin',
    initials: 'JM',
    avatarUrl: '' // 'assets/avatar.jpg' ako postoji slika
  };

  constructor(private router: Router) {}

  saveChanges(): void {
    // Ovde će ići API poziv kada backend bude gotov:
    // this.userService.updateProfile(this.user).subscribe(...)
    console.log('Saving:', this.user);
    alert('Changes saved!'); // privremeno
  }
}