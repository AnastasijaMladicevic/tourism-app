import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetaljiDestinacije } from './detalji-destinacije';

describe('DetaljiDestinacije', () => {
  let component: DetaljiDestinacije;
  let fixture: ComponentFixture<DetaljiDestinacije>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetaljiDestinacije],
    }).compileComponents();

    fixture = TestBed.createComponent(DetaljiDestinacije);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
