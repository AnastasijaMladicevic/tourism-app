import { Injectable } from '@angular/core';

export interface PendingAction {
  type: 'favorite-object' | 'add-to-planner' | 'custom';
  payload?: any;
}

@Injectable({ providedIn: 'root' })
export class PendingActionService {
  private readonly storageKey = 'spirego-pending-action';
  private action: PendingAction | null = null;

  setAction(action: PendingAction): void {
    this.action = action;
    this.persistAction(action);
  }

  consumeAction(): PendingAction | null {
    const a = this.action ?? this.readStoredAction();
    this.action = null;
    this.clearStoredAction();
    return a;
  }

  hasAction(): boolean {
    return this.action !== null || this.readStoredAction() !== null;
  }

  clearAction(): void {
    this.action = null;
    this.clearStoredAction();
  }

  private persistAction(action: PendingAction): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(action));
    } catch {
      // ignore storage failures and keep in-memory fallback
    }
  }

  private readStoredAction(): PendingAction | null {
    if (typeof sessionStorage === 'undefined') {
      return null;
    }

    const raw = sessionStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as PendingAction;
    } catch {
      this.clearStoredAction();
      return null;
    }
  }

  private clearStoredAction(): void {
    if (typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.removeItem(this.storageKey);
  }
}
