import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { InfoComponent } from './components/info/info.component';
import { PlayerListComponent } from './components/player-list/player-list.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent
  },
  {
    path: 'players',
    component: PlayerListComponent
  },
  {
    path: 'info',
    component: InfoComponent
  }
];
