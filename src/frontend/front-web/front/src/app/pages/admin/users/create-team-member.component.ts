import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

export type TeamMemberRole = 'manager' | 'content-creator' | 'tourist';

@Component({
  selector: 'app-create-team-member',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './create-team-member.component.html',
  styleUrls: ['./create-team-member.component.css']
})
export class CreateTeamMemberComponent {
  private readonly router = inject(Router);

  firstName = '';
  lastName = '';
  workEmail = '';
  dateOfBirth = '';
  phoneNumber = '';

  password = '';
  confirmPassword = '';

  selectedRole: TeamMemberRole = 'manager';

  country = 'United States';
  preferredLanguage = 'English (US)';
  regionAssignment = '';

  readonly countries = [
    'United States',
    'United Kingdom',
    'Canada',
    'Germany',
    'France',
    'Croatia',
    'Spain',
    'Italy'
  ];

  readonly languages = [
    'English (US)',
    'English (UK)',
    'German',
    'French',
    'Spanish',
    'Italian',
    'Croatian'
  ];

  readonly regionOptions = [
    'North America — East',
    'North America — West',
    'European Union — Central',
    'European Union — Mediterranean',
    'Asia-Pacific'
  ];

  selectRole(role: TeamMemberRole): void {
    this.selectedRole = role;
  }

  get passwordStrengthLabel(): string {
    const p = this.password;
    if (!p) {
      return '';
    }
    let score = 0;
    if (p.length >= 8) {
      score++;
    }
    if (/[a-z]/.test(p) && /[A-Z]/.test(p)) {
      score++;
    }
    if (/\d/.test(p)) {
      score++;
    }
    if (/[^a-zA-Z0-9]/.test(p)) {
      score++;
    }
    if (score <= 1) {
      return 'WEAK';
    }
    if (score === 2) {
      return 'FAIR';
    }
    if (score === 3) {
      return 'GOOD';
    }
    return 'STRONG';
  }

  get passwordStrengthClass(): 'weak' | 'fair' | 'good' | 'strong' | '' {
    const label = this.passwordStrengthLabel;
    if (!label) {
      return '';
    }
    const map: Record<string, 'weak' | 'fair' | 'good' | 'strong'> = {
      WEAK: 'weak',
      FAIR: 'fair',
      GOOD: 'good',
      STRONG: 'strong'
    };
    return map[label] ?? '';
  }

  get passwordsMismatch(): boolean {
    if (!this.confirmPassword) {
      return false;
    }
    return this.password !== this.confirmPassword;
  }

  onCancel(): void {
    void this.router.navigate(['/admin/users']);
  }

  onCreate(): void {
    // UI-only: form submission wired later when API exists.
  }
}
