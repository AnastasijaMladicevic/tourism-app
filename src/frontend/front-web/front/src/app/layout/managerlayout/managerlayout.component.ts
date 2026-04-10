import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-manager-layout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './managerlayout.component.html',
  styleUrls: ['./managerlayout.component.css'],
})
export class ManagerLayoutComponent {
  searchQuery = '';
  //mock
  user = {
    name: 'Sarah Ross',
    email: 'sarah@spirego.com',
    initials: 'SR',
    avatarUrl: null,
  };

  constructor(private router: Router) {}

  signOut(): void {
    this.router.navigate(['/signout']);
  }
}
