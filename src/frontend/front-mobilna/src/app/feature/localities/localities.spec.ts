import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Localities } from './localities';

describe('Localities', () => {
  let component: Localities;
  let fixture: ComponentFixture<Localities>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Localities],
    }).compileComponents();

    fixture = TestBed.createComponent(Localities);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
