import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LocalityDetail } from './locality-detail';

describe('LocalityDetail', () => {
  let component: LocalityDetail;
  let fixture: ComponentFixture<LocalityDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocalityDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(LocalityDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
