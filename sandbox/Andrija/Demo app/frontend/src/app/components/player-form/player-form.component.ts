import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Player, PlayerPayload } from '../../models/player.model';

@Component({
  selector: 'app-player-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './player-form.component.html',
  styleUrl: './player-form.component.css'
})
export class PlayerFormComponent implements OnChanges {
  @Input() player: Player | null = null;
  @Input() loading = false;
  @Output() save = new EventEmitter<PlayerPayload | Player>();
  @Output() cancel = new EventEmitter<void>();

  protected readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    club: ['', [Validators.required, Validators.maxLength(80)]],
    position: ['', [Validators.required, Validators.maxLength(30)]],
    jerseyNumber: [1, [Validators.required, Validators.min(1), Validators.max(99)]],
    age: [18, [Validators.required, Validators.min(15), Validators.max(45)]]
  });

  constructor(private readonly fb: FormBuilder) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['player']) {
      if (this.player) {
        this.form.patchValue({
          firstName: this.player.firstName,
          lastName: this.player.lastName,
          club: this.player.club,
          position: this.player.position,
          jerseyNumber: this.player.jerseyNumber,
          age: this.player.age
        });
      } else {
        this.form.reset({
          firstName: '',
          lastName: '',
          club: '',
          position: '',
          jerseyNumber: 1,
          age: 18
        });
      }
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.getRawValue();

    if (this.player) {
      this.save.emit({ id: this.player.id, ...payload });
      return;
    }

    this.save.emit(payload);
  }
}
