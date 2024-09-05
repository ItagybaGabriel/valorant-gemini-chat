import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { Character } from '../../models/character.model';
import { characters } from '../../data/characters';

@Component({
  selector: 'app-character-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './character-select.component.html',
  styleUrls: ['./character-select.component.scss']
})
export class CharacterSelectComponent {
  @Output() characterSelected = new EventEmitter<Character>();

  characters: Character[] = characters;

  selectCharacter(character: Character) {
    this.characterSelected.emit(character);
  }
}