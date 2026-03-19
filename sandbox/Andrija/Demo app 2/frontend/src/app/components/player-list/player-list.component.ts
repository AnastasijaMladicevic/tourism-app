import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Player, PlayerPayload } from '../../models/player.model';
import { PlayerService } from '../../services/player.service';
import { PlayerFormComponent } from '../player-form/player-form.component';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule, FormsModule, PlayerFormComponent],
  templateUrl: './player-list.component.html',
  styleUrl: './player-list.component.css'
})
export class PlayerListComponent implements OnInit {
  protected players: Player[] = [];
  protected searchTerm = '';
  protected loading = false;
  protected submitting = false;
  protected showForm = false;
  protected selectedPlayer: Player | null = null;
  protected errorMessage = '';

  constructor(private readonly playerService: PlayerService) {}

  ngOnInit(): void {
    this.loadPlayers();
  }

  protected loadPlayers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.playerService.getPlayers(this.searchTerm).subscribe({
      next: (players) => {
        this.players = players;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Neuspesno ucitavanje igraca. Proveri da li backend radi.';
        this.loading = false;
      }
    });
  }

  protected openCreateForm(): void {
    this.selectedPlayer = null;
    this.showForm = true;
  }

  protected openEditForm(player: Player): void {
    this.selectedPlayer = { ...player };
    this.showForm = true;
  }

  protected closeForm(): void {
    this.showForm = false;
    this.selectedPlayer = null;
  }

  protected handleSave(payload: PlayerPayload | Player): void {
    this.submitting = true;

    const request$: import('rxjs').Observable<Player | void> = 'id' in payload && payload.id
      ? this.playerService.updatePlayer(payload as Player)
      : this.playerService.createPlayer(payload as PlayerPayload);

    request$.subscribe({
      next: () => {
        this.submitting = false;
        this.closeForm();
        this.loadPlayers();
      },
      error: () => {
        this.errorMessage = 'Doslo je do greske pri cuvanju podataka.';
        this.submitting = false;
      }
    });
  }

  protected deletePlayer(player: Player): void {
    const confirmed = window.confirm(`Da li sigurno zelis da obrises igraca ${player.firstName} ${player.lastName}?`);
    if (!confirmed) {
      return;
    }

    this.playerService.deletePlayer(player.id).subscribe({
      next: () => this.loadPlayers(),
      error: () => {
        this.errorMessage = 'Brisanje nije uspelo.';
      }
    });
  }

  protected trackById(_: number, player: Player): number {
    return player.id;
  }
}
