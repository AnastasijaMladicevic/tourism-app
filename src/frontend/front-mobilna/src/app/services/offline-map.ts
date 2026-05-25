import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OfflineMapService {
  private readonly storageKey = 'spirego-offline-maps-enabled';
  private readonly cachePrefix = 'spirego-';

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'caches' in window &&
      this.isSecureContextSupported()
    );
  }

  isEnabled(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return localStorage.getItem(this.storageKey) === '1';
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, enabled ? '1' : '0');
    await this.syncRegistration();
  }

  async syncRegistration(): Promise<void> {
    if (!this.isSupported()) {
      return;
    }

    if (this.isEnabled()) {
      await this.registerWorker();
      return;
    }

    await this.unregisterWorkerAndClearCaches();
  }

  private isSecureContextSupported(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    const host = window.location.hostname;
    return window.isSecureContext || host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  private async registerWorker(): Promise<void> {
    await navigator.serviceWorker.register('/push-sw.js', { scope: '/' });
  }

  private async unregisterWorkerAndClearCaches(): Promise<void> {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));

    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(this.cachePrefix))
        .map((key) => caches.delete(key)),
    );
  }
}
