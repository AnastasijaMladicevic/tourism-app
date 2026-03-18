import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Words } from './words';

describe('Words', () => {
  let component: Words;
  let fixture: ComponentFixture<Words>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Words],
    }).compileComponents();

    fixture = TestBed.createComponent(Words);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
