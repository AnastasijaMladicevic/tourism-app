import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-new-credentials',
  standalone: true,
  imports: [HeaderComponent],
  templateUrl: './new-credentials.component.html',
  styleUrl: './new-credentials.component.scss'
})
export class NewCredentialsComponent {
  private readonly location = inject(Location);

  cancel(): void {
    this.location.back();
  }
}
