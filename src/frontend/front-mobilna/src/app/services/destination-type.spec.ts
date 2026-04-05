import { TestBed } from '@angular/core/testing';

import { DestinationType } from './destination-type';

describe('DestinationType', () => {
  let service: DestinationType;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DestinationType);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
