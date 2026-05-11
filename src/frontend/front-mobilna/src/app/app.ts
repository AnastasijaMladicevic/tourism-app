import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar';
import { FloatingAiAssistantComponent } from './shared/components/floating-ai-assistant/floating-ai-assistant.component';
import { LiveNotificationBannerComponent } from './shared/components/live-notification-banner/live-notification-banner.component';
import { LocationIntelligenceService } from './services/location-intelligence';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FloatingAiAssistantComponent, LiveNotificationBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly locationIntelligenceService = inject(LocationIntelligenceService);
  protected readonly title = signal('front-mobilna');

  constructor() {
    void this.locationIntelligenceService;
  }
}
