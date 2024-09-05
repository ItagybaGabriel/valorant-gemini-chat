import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CharacterSelectComponent } from './components/character-select/character-select.component';
import { ChatComponent } from './components/chat/chat.component';
import { Character } from './models/character.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CharacterSelectComponent, ChatComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  selectedCharacter: Character | null = null;

  onCharacterSelected(character: Character) {
    this.selectedCharacter = character;
  }

  onBackToSelect() {
    this.selectedCharacter = null;
  }
}