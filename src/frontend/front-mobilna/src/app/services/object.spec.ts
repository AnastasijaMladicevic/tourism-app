import { TestBed } from '@angular/core/testing';

import { Object } from './object';

describe('Object', () => {
  let service: Object;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Object);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
