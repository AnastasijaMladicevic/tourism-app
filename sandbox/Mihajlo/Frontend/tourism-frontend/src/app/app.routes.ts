import { Routes } from '@angular/router';
import { ListaDestinacija } from './components/lista-destinacija/lista-destinacija';
import { DetaljiDestinacije } from './components/detalji-destinacije/detalji-destinacije';

export const routes: Routes = [
  { path: '', component: ListaDestinacija },
  { path: 'destinacija/:id', component: DetaljiDestinacije },
  { path: '**', redirectTo: '' }
];