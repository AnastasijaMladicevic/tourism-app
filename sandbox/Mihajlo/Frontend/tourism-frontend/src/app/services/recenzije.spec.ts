import { TestBed } from '@angular/core/testing';

import { Recenzije } from './recenzije';

describe('Recenzije', () => {
  let service: Recenzije;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Recenzije);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
