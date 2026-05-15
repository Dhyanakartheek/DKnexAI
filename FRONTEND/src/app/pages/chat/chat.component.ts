import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MarkdownModule } from 'ngx-markdown';
import { AgentService } from '../../services/agent.service';
import { Agent } from '../../models/agent.models';

interface Message {
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MarkdownModule
  ],
  template: `
    <div class="chat-wrapper glass-panel">
      <div class="chat-header">
        <button mat-icon-button routerLink="/dashboard" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="agent-info" *ngIf="agent">
          <div class="agent-avatar-sm">
            <mat-icon>{{ getIcon(agent.type) }}</mat-icon>
          </div>
          <div class="text-meta">
            <h2>{{ agent.name }}</h2>
            <div class="status-indicator">
              <span class="status-dot" [class.active]="agent.status"></span>
              <span class="status-text">{{ agent.status ? 'System Online' : 'System Offline' }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="message-container" #scrollContainer>
        <div *ngFor="let msg of messages" class="message-row" [class.user-row]="msg.sender === 'user'">
          <div class="message-bubble" [class.agent-bubble]="msg.sender === 'agent'">
            <div class="content">
              <markdown [data]="msg.content" [katex]="true"></markdown>
            </div>
            <div class="time">{{ msg.timestamp | date:'shortTime' }}</div>
          </div>
        </div>
        <div *ngIf="isTyping" class="message-row">
          <div class="message-bubble agent-bubble typing-bubble">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
      </div>

      <div class="input-area">
        <div class="input-container glass-panel">
          <textarea 
            [(ngModel)]="userInput" 
            placeholder="Type your command..." 
            (keydown.enter)="onEnter($event)"
            [disabled]="isTyping || !agent?.status"
          ></textarea>
          <button mat-icon-button class="send-btn" (click)="sendMessage()" [disabled]="!userInput.trim() || isTyping || !agent?.status">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-wrapper {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 120px);
      max-width: 1100px;
      margin: 20px auto;
      border-radius: 24px;
      overflow: hidden;
      border: 1px solid var(--glass-border);
    }
    .chat-header {
      display: flex;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 1px solid var(--glass-border);
      background: rgba(255, 255, 255, 0.02);
      gap: 1.5rem;
    }
    .back-btn {
      color: var(--text-secondary);
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }
    .agent-info {
      display: flex;
      align-items: center;
      gap: 1.2rem;
    }
    .agent-avatar-sm {
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 10px var(--accent-glow);
    }
    .text-meta h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 700;
      color: white;
    }
    .status-indicator {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background-color: var(--text-muted);
    }
    .status-dot.active {
      background-color: #4ade80;
      box-shadow: 0 0 10px #4ade80;
    }
    .status-text {
      font-size: 0.75rem;
      color: var(--text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .message-container {
      flex: 1;
      overflow-y: auto;
      padding: 2.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      background: radial-gradient(circle at center, rgba(99, 102, 241, 0.03) 0%, transparent 70%);
    }
    .message-row {
      display: flex;
      width: 100%;
    }
    .user-row {
      justify-content: flex-end;
    }
    .message-bubble {
      padding: 16px 20px;
      border-radius: 20px;
      max-width: 70%;
      font-size: 1rem;
      line-height: 1.5;
      position: relative;
      transition: var(--transition-smooth);
    }
    .agent-bubble {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
      border: 1px solid var(--glass-border);
      border-bottom-left-radius: 4px;
    }
    .user-row .message-bubble {
      background: var(--accent-gradient);
      color: white;
      box-shadow: 0 4px 15px var(--accent-glow);
      border-bottom-right-radius: 4px;
    }
    .content markdown p {
      margin: 0;
    }
    .content markdown p + p {
      margin-top: 12px;
    }
    .content markdown code {
      background: rgba(255, 255, 255, 0.1);
      padding: 2px 4px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
    }
    .agent-bubble markdown pre {
      background: rgba(0, 0, 0, 0.3) !important;
      padding: 12px;
      border-radius: 8px;
      margin: 12px 0;
      overflow-x: auto;
    }
    .katex-display {
      margin: 0.5em 0;
      padding: 8px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
    }
    .time {
      font-size: 0.7rem;
      margin-top: 8px;
      opacity: 0.5;
      text-align: right;
    }
    .input-area {
      padding: 2rem;
      background: rgba(255, 255, 255, 0.02);
      border-top: 1px solid var(--glass-border);
    }
    .input-container {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 16px;
      gap: 12px;
      background: rgba(0, 0, 0, 0.2);
    }
    .input-container:focus-within {
      border-color: var(--accent-indigo);
    }
    textarea {
      flex: 1;
      background: transparent;
      border: none;
      color: white;
      padding: 8px;
      resize: none;
      font-family: inherit;
      font-size: 1rem;
      max-height: 120px;
      outline: none;
    }
    .send-btn {
      background: var(--accent-gradient);
      color: white;
      border-radius: 12px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition-smooth);
    }
    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 0 15px var(--accent-glow);
    }
    .typing-bubble {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
    }
    .typing-bubble .dot {
      width: 6px;
      height: 6px;
      background: var(--accent-indigo);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }
    .dot:nth-child(2) { animation-delay: 0.2s; }
    .dot:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
      40% { transform: translateY(-6px); opacity: 1; }
    }
  `]

})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  
  agent: Agent | null = null;
  messages: Message[] = [];
  userInput = '';
  isTyping = false;

  constructor(
    private route: ActivatedRoute,
    private agentService: AgentService
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.agentService.getAgentById(id).subscribe(data => {
      this.agent = data;
      this.messages.push({
        sender: 'agent',
        content: `Hello! I am ${data.name}. How can I assist you today?`,
        timestamp: new Date()
      });
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  onEnter(event: any) {
    if (!event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isTyping || !this.agent) return;

    const userText = this.userInput.trim();
    this.messages.push({
      sender: 'user',
      content: userText,
      timestamp: new Date()
    });
    this.userInput = '';
    this.isTyping = true;

    this.agentService.executeAgent(this.agent.id, userText).subscribe({
      next: (res) => {
        this.messages.push({
          sender: 'agent',
          content: res.output,
          timestamp: new Date()
        });
        this.isTyping = false;
      },
      error: () => {
        this.messages.push({
          sender: 'agent',
          content: "I'm sorry, I encountered an error while processing your request.",
          timestamp: new Date()
        });
        this.isTyping = false;
      }
    });
  }

  getIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'chat': return 'chat';
      case 'image': return 'image';
      case 'code': return 'code';
      default: return 'smart_toy';
    }
  }
}

