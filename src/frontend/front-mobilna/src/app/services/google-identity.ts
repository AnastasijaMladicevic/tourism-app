import { Injectable } from '@angular/core';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          cancel?: () => void;
        };
      };
    };
  }
}

@Injectable({ providedIn: 'root' })
export class GoogleIdentityService {
  private scriptPromise: Promise<void> | null = null;

  async renderButton(
    container: HTMLElement,
    clientId: string,
    onCredential: (credential: string) => void,
    text: 'signin_with' | 'signup_with' | 'continue_with' = 'continue_with',
  ): Promise<void> {
    if (!clientId || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    await this.loadScript();

    const google = window.google?.accounts?.id;
    if (!google) {
      throw new Error('Google Identity Services failed to initialize.');
    }

    google.initialize({
      client_id: clientId,
      callback: (response) => {
        const credential = response?.credential;
        if (credential) {
          onCredential(credential);
        }
      },
    });

    container.innerHTML = '';
    google.renderButton(container, {
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text,
      width: Math.max(container.clientWidth || 0, 280),
      logo_alignment: 'left',
    });
  }

  private loadScript(): Promise<void> {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      return Promise.resolve();
    }

    if (this.scriptPromise) {
      return this.scriptPromise;
    }

    this.scriptPromise = new Promise<void>((resolve, reject) => {
      if (typeof document === 'undefined') {
        reject(new Error('Document is not available.'));
        return;
      }

      const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Identity script.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset['googleIdentity'] = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity script.'));
      document.head.appendChild(script);
    });

    return this.scriptPromise;
  }
}
