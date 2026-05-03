import { Injectable } from '@angular/core';

export interface PendingAction {
  type: 'favorite-object' | 'add-to-planner' | 'custom';
  payload?: any;
}

@Injectable({ providedIn: 'root' })
export class PendingActionService {
  private action: PendingAction | null = null;

  setAction(action: PendingAction): void {
    this.action = action;
  }

  consumeAction(): PendingAction | null {
    const a = this.action;
    this.action = null;
    return a;
  }

  hasAction(): boolean {
    return this.action !== null;
  }
}