import { TestBed } from '@angular/core/testing';

import { Destinacije } from './destinacije';

describe('Destinacije', () => {
  let service: Destinacije;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Destinacije);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
