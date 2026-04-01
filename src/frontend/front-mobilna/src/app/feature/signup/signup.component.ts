import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { LogoComponent } from '../header/logo.component';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [RouterLink, HeaderComponent, LogoComponent],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {}
