import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, of, timer } from 'rxjs';
import { catchError, switchMap, takeWhile, tap } from 'rxjs/operators';
import { Character } from '../models/character.model';
import { characters } from '../data/characters';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private apiKey = 'AIzaSyBiP4X4VTyNuz6W3FmgzKbasvNJvcm90a8';
  private proUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-exp-0827:generateContent';
  private flashUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b-exp-0827:generateContent';

  private proRequestsThisMinute = 0;
  private lastProRequestTime = 0;

  private currentModelSubject = new BehaviorSubject<'pro' | 'flash'>('pro');
  currentModel$ = this.currentModelSubject.asObservable();
  
  private cooldownTimeSubject = new BehaviorSubject<number>(0);
  cooldownTime$ = this.cooldownTimeSubject.asObservable();

  constructor(private http: HttpClient) { }

  generateResponse(prompt: string, character: Character, conversationHistory: string[]): Observable<any> {
    const headers = new HttpHeaders().set('Content-Type', 'application/json');
    const body = this.prepareRequestBody(prompt, character, conversationHistory);
  
    const currentTime = Date.now();
    const timeSinceLastProRequest = currentTime - this.lastProRequestTime;
  
    if (timeSinceLastProRequest >= 60000) {
      this.proRequestsThisMinute = 0;
    }

    if (this.proRequestsThisMinute < 2) {
      this.currentModelSubject.next('pro');
      return this.makeRequest(this.proUrl, body, headers).pipe(
        tap(() => {
          this.proRequestsThisMinute++;
          this.lastProRequestTime = currentTime;
          this.startCooldownTimer();
        }),
        catchError(error => {
          console.warn('Pro model failed, falling back to Flash model:', error);
          this.currentModelSubject.next('flash');
          return this.makeRequest(this.flashUrl, body, headers);
        })
      );
    } else {
      this.currentModelSubject.next('flash');
      return this.makeRequest(this.flashUrl, body, headers);
    }
  }

  private makeRequest(url: string, body: any, headers: HttpHeaders): Observable<any> {
    return this.http.post(`${url}?key=${this.apiKey}`, body, { headers }).pipe(
      switchMap(response => {
        if (url === this.proUrl) {
          this.proRequestsThisMinute++;
          this.lastProRequestTime = Date.now();
        }
        return of(response); // Retorna um Observable do response
      }),
      catchError(error => {
        console.error('Error making request:', error);
        return throwError(() => error);
      })
    );
  }

  private prepareRequestBody(prompt: string, character: Character, conversationHistory: string[]) {
    console.log(character);
    const systemPrompt = `Você é ${character.name} do jogo Valorant. Aqui está sua descrição: ${character.description}
    
    Instruções:
    1. Responda sempre como se fosse este personagem, mantendo suas características e personalidade.
    2. Use um tom casual e responda em português brasileiro (pt-br).
    3. Mantenha-se estritamente no papel do personagem durante toda a conversa.
    4. Não mencione que está interpretando um papel ou que é uma IA.  Seja convicente que não é uma IA assistente virtual.
    5. Use o conhecimento e as habilidades específicas do personagem em suas respostas.
    6. Mantenha a consistência com a história e personalidade do personagem.
    7. Não responda com emojis e seja direto e curtonas respostas.
    8. NÃO responda 'Como posso ajudar você hoje?' (ou qualquer coisa do tipo). Você NÃO é uma assistente virtual. ASSUMA a personalidade e o comportamento do personagem, SEM oferecer assistência ou ajuda sem que seja solicitado.
    `;

    const fullConversation = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...conversationHistory.flatMap((message, index) => [
        { role: index % 2 === 0 ? 'user' : 'model', parts: [{ text: message }] }
      ]),
      { role: 'user', parts: [{ text: prompt }] }
    ];

    return {
      contents: fullConversation,
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ],
      generationConfig: {
        "temperature": 1,
        "top_p": 0.95,
        "top_k": 64,
        "max_output_tokens": 8192,
        "response_mime_type": "text/plain",
      }
    };
  }

  private startCooldownTimer() {
    timer(0, 1000).pipe(
      takeWhile(() => {
        const remainingTime = Math.max(0, 60000 - (Date.now() - this.lastProRequestTime));
        this.cooldownTimeSubject.next(remainingTime);
        return remainingTime > 0;
      })
    ).subscribe();
  }
}