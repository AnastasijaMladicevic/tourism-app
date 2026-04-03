import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PasswordUpdated } from './password-updated';

describe('PasswordUpdated', () => {
  let component: PasswordUpdated;
  let fixture: ComponentFixture<PasswordUpdated>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PasswordUpdated],
    }).compileComponents();

    fixture = TestBed.createComponent(PasswordUpdated);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
