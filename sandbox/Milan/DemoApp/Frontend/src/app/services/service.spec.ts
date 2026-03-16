import { TestBed } from '@angular/core/testing';

import { TestService } from './TestService';

describe('Service', () => {
  let service: TestService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TestService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
