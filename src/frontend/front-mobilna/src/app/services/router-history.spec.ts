import { TestBed } from '@angular/core/testing';

import { RouterHistory } from './router-history';

describe('RouterHistory', () => {
  let service: RouterHistory;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RouterHistory);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
