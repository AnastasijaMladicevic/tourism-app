import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaDestinacija } from './lista-destinacija';

describe('ListaDestinacija', () => {
  let component: ListaDestinacija;
  let fixture: ComponentFixture<ListaDestinacija>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaDestinacija],
    }).compileComponents();

    fixture = TestBed.createComponent(ListaDestinacija);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
