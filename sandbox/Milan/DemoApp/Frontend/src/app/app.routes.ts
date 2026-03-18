import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { WordsComponent } from './components/words/words';
import { TestComponent } from './components/test/test';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'words', component: WordsComponent },
  { path: 'test', component: TestComponent }
];