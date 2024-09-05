import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { GeminiService } from '../../services/gemini.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, interval } from 'rxjs';
import { Character } from '../../models/character.model';

type CharacterName = 'Sage' | 'Killjoy' | 'Clove';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  @Input() character!: Character;
  @Output() backToSelect = new EventEmitter<void>();
  messages: { sender: string, text: string }[] = [];
  userInput: string = '';

  currentModel: 'pro' | 'flash' = 'pro';
  cooldownTime: number = 0;
  private modelSubscription: Subscription | undefined;
  private cooldownSubscription: Subscription | undefined;

  constructor(private geminiService: GeminiService) {}

  ngOnInit() {
    this.loadChatHistory();
    this.modelSubscription = this.geminiService.currentModel$.subscribe(model => {
      this.currentModel = model;
    });

    this.cooldownSubscription = this.geminiService.cooldownTime$.subscribe(time => {
      this.cooldownTime = time;
    });
  }

  ngOnDestroy() {
    this.modelSubscription?.unsubscribe();
    this.cooldownSubscription?.unsubscribe();
  }

  sendMessage(message: string = this.userInput) {
    if (message.trim() === '') return;

    // Se for a primeira mensagem, podemos adicionar uma lógica especial aqui, se necessário
    if (this.messages.length === 0) {
      // Lógica para primeira mensagem, se necessário
    }

    this.messages.push({ sender: 'User', text: message });
    this.scrollToBottom();
    
    const conversationHistory = this.messages.map(m => m.text);

    this.geminiService.generateResponse(message, this.character, conversationHistory).subscribe(
      (response) => {
        const aiResponse = response.candidates[0].content.parts[0].text;
        this.messages.push({ sender: this.character.name, text: aiResponse });
        this.saveChatHistory();
        this.scrollToBottom();
      },
      (error) => {
        console.error('Error:', error);
        this.messages.push({ sender: 'System', text: 'Ocorreu um erro. Por favor, tente novamente.' });
        this.scrollToBottom();
      }
    );

    this.userInput = '';
  }

  goBackToSelect() {
    this.backToSelect.emit();
  }

  saveChatHistory() {
    localStorage.setItem(`chat_${this.character.name}`, JSON.stringify(this.messages));
  }

  loadChatHistory() {
    const savedChat = localStorage.getItem(`chat_${this.character.name}`);
    if (savedChat) {
      this.messages = JSON.parse(savedChat);
      this.scrollToBottom();
    }
  }

  clearChatHistory() {
    if (confirm('Tem certeza que deseja apagar o histórico do chat?')) {
      this.messages = [];
      localStorage.removeItem(`chat_${this.character.name}`);
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const chatMessages = document.querySelector('.chat-messages');
      if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 0);
  }
}