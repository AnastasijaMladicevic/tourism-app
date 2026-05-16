import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

import { environment } from '../../environment/environment';

export interface PushNotificationSettingsDto {
  enabled: boolean;
  hasSubscription: boolean;
  publicKey?: string | null;
}

export type PushAvailabilityReason = 'unsupported' | 'insecure' | 'missing-key' | 'denied';

export interface PushToggleResult {
  ok: boolean;
  enabled: boolean;
  reason?: PushAvailabilityReason;
}

@Injectable({
  providedIn: 'root',
})
export class PushNotificationService {
  private readonly api = `${environment.apiUrl}/notifications`;
  private readonly operationTimeoutMs = 10000;

  constructor(private http: HttpClient) {}

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  isSecureContextSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const host = window.location.hostname;
    return window.isSecureContext || host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  async loadSettings(): Promise<PushNotificationSettingsDto> {
    return firstValueFrom(
      this.http.get<PushNotificationSettingsDto>(`${this.api}/push-settings`).pipe(timeout(5000)),
    );
  }

  async setEnabled(enabled: boolean): Promise<PushToggleResult> {
    if (!this.isSupported()) {
      return { ok: false, enabled: false, reason: 'unsupported' };
    }

    if (!this.isSecureContextSupported()) {
      return { ok: false, enabled: false, reason: 'insecure' };
    }

    try {
      if (enabled) {
        return await this.enablePushAsync();
      }

      return await this.disablePushAsync();
    } catch (error) {
      this.logAndThrow(error);
    }
  }

  private async enablePushAsync(): Promise<PushToggleResult> {
    const settings = await this.loadSettings();
    const publicKey = settings.publicKey?.trim();

    if (!publicKey) {
      return { ok: false, enabled: false, reason: 'missing-key' };
    }

    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      await this.withTimeout(this.updateBackendEnabled(false));
      return { ok: false, enabled: false, reason: 'denied' };
    }

    await this.withTimeout(navigator.serviceWorker.register('/push-sw.js'));
    const registration = await this.withTimeout(navigator.serviceWorker.ready);
    let subscription = await this.withTimeout(registration.pushManager.getSubscription());

    if (!subscription) {
      subscription = await this.withTimeout(
        registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(publicKey) as BufferSource,
        }),
      );
    }

    const json = subscription.toJSON();
    const keys = json.keys;

    if (!json.endpoint || !keys?.['p256dh'] || !keys?.['auth']) {
      return { ok: false, enabled: false, reason: 'missing-key' };
    }

    await this.withTimeout(
      firstValueFrom(
        this.http.post(`${this.api}/push-subscriptions`, {
          endpoint: json.endpoint,
          expirationTime: json.expirationTime ?? null,
          keys: {
            p256dh: keys['p256dh'],
            auth: keys['auth'],
          },
        }),
      ),
    );

    await this.withTimeout(this.updateBackendEnabled(true));
    return { ok: true, enabled: true };
  }

  private async disablePushAsync(): Promise<PushToggleResult> {
    const registration = await this.withTimeout(navigator.serviceWorker.getRegistration('/push-sw.js'));
    const subscription = registration
      ? await this.withTimeout(registration.pushManager.getSubscription())
      : null;

    let endpoint: string | null = null;
    if (subscription) {
      endpoint = subscription.endpoint;
      await this.withTimeout(subscription.unsubscribe());
    }

    if (endpoint) {
      const params = new HttpParams().set('endpoint', endpoint);
      await this.withTimeout(
        firstValueFrom(
          this.http.delete(`${this.api}/push-subscriptions`, { params }),
        ),
      );
    } else {
      await this.withTimeout(firstValueFrom(this.http.delete(`${this.api}/push-subscriptions`)));
    }

    await this.withTimeout(this.updateBackendEnabled(false));
    return { ok: true, enabled: false };
  }

  private async updateBackendEnabled(enabled: boolean): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.api}/push-settings`, { enabled }),
    );
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(normalized);
    const buffer = new ArrayBuffer(rawData.length);
    const outputArray = new Uint8Array(buffer);

    for (let index = 0; index < rawData.length; index += 1) {
      outputArray[index] = rawData.charCodeAt(index);
    }

    return outputArray as Uint8Array<ArrayBuffer>;
  }

  private async withTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        window.setTimeout(() => reject(new Error('Push notification operation timed out.')), this.operationTimeoutMs);
      }),
    ]);
  }

  private logAndThrow(error: unknown): never {
    if (error instanceof HttpErrorResponse) {
      const backendMessage =
        typeof error.error === 'string'
          ? error.error
          : error.error?.message || `HTTP ${error.status}`;
      console.error('Push notification HTTP error:', backendMessage, error);
      throw new Error(backendMessage);
    }

    if (error instanceof Error) {
      console.error('Push notification error:', error.message, error);
      throw error;
    }

    console.error('Unknown push notification error:', error);
    throw new Error('Unknown push notification error.');
  }
}
