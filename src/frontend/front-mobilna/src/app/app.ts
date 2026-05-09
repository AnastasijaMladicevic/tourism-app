import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { FloatingAiAssistantComponent } from './shared/components/floating-ai-assistant/floating-ai-assistant.component';
import { TranslationService } from './services/translation.service';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FloatingAiAssistantComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly translationService = inject(TranslationService);
  protected readonly title = signal('front-mobilna');
}
