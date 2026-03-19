import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player, PlayerPayload } from '../models/player.model';

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly apiUrl = 'http://localhost:5000/api/players';

  constructor(private readonly http: HttpClient) {}

  getPlayers(search = ''): Observable<Player[]> {
    const params = search ? new HttpParams().set('search', search) : undefined;
    return this.http.get<Player[]>(this.apiUrl, { params });
  }

  createPlayer(player: PlayerPayload): Observable<Player> {
    return this.http.post<Player>(this.apiUrl, player);
  }

  updatePlayer(player: Player): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${player.id}`, player);
  }

  deletePlayer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
