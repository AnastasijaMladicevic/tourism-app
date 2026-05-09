import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './terms.component.html',
  styleUrl: './terms.component.scss',
})
export class TermsComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly backLink = this.route.snapshot.queryParamMap.get('returnTo') || '/settings';
  protected readonly sections = [
    { titleKey: 'terms.section.1.title', bodyKey: 'terms.section.1.body' },
    { titleKey: 'terms.section.2.title', bodyKey: 'terms.section.2.body' },
    { titleKey: 'terms.section.3.title', bodyKey: 'terms.section.3.body' },
  ];

  protected readonly noteKeys = ['terms.note.1', 'terms.note.2', 'terms.note.3'];
}
