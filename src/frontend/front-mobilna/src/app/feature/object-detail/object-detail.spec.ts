import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObjectDetail } from './object-detail';

describe('ObjectDetail', () => {
  let component: ObjectDetail;
  let fixture: ComponentFixture<ObjectDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObjectDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(ObjectDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
