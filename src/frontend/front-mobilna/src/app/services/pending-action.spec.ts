import { TestBed } from '@angular/core/testing';

import { PendingAction } from './pending-action';

describe('PendingAction', () => {
  let service: PendingAction;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PendingAction);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
