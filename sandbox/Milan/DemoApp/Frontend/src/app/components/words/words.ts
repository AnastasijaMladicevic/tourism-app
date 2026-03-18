import { Component, OnInit } from '@angular/core';
import { WordService } from '../../services/word';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-words',
  standalone: true,
  templateUrl: './words.html',
  imports: [FormsModule]
})
export class WordsComponent implements OnInit {

  words: any[] = [];
  newWord = '';

  constructor(private service: WordService) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.service.getAll().subscribe(data => this.words = data);
  }

  add() {
    this.service.add(this.newWord).subscribe(() => {
      this.newWord = '';
      this.load();
    });
  }

  delete(id: number) {
    this.service.delete(id).subscribe(() => this.load());
  }

  update(word: any) {
    this.service.update(word.id, word.text).subscribe();
  }
}