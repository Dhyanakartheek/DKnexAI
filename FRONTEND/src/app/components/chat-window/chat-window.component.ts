import { Component, Input, ViewChild, ElementRef, AfterViewChecked, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MarkdownModule } from 'ngx-markdown';
import { AgentService } from '../../services/agent.service';
import { Agent } from '../../models/agent.models';

interface Message {
  sender: 'user' | 'agent';
  content: string;
  timestamp: Date;
}

@Component({
  selector: 'app-chat-window',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MarkdownModule],
  template: `
    <div class="chat-container glass-panel">
      <div class="message-list" #scrollContainer>
        <div *ngFor="let msg of messages" class="message-row" [class.user-row]="msg.sender === 'user'">
          <div class="message-bubble" [class.agent-bubble]="msg.sender === 'agent'">
            <div class="content">
              <ng-container *ngIf="getParsedData(msg.content) as data; else markdownTpl">
                <div class="response-card">
                  <h2>{{ data.title || 'Answer' }}</h2>
                  <p class="answer">{{ data.direct_answer }}</p>
                  
                  <h3 *ngIf="data.key_points?.length">Key Points</h3>
                  <ul *ngIf="data.key_points?.length">
                    <li *ngFor="let p of data.key_points">{{ p }}</li>
                  </ul>
                  
                  <h3 *ngIf="data.tips?.length">Tips</h3>
                  <ul *ngIf="data.tips?.length">
                    <li *ngFor="let t of data.tips">{{ t }}</li>
                  </ul>
                  
                  <div class="code-block-wrapper" *ngIf="data.code">
                    <markdown [data]="formatCodeBlock(data.code)" clipboard></markdown>
                  </div>
                </div>
              </ng-container>
              
              <ng-template #markdownTpl>
                <!-- Professional Markdown Rendering -->
                <markdown [data]="msg.content" [katex]="true" clipboard *ngIf="msg.content"></markdown>
                
                <!-- Failsafe: If content exists but markdown didn't render (debug fallback) -->
                <p *ngIf="msg.content" class="fallback-text">{{ msg.content }}</p>
              </ng-template>
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
            placeholder="Neural command..." 
            (keydown.enter)="onEnter($event)"
            [disabled]="isTyping || !agent.status"
          ></textarea>
          <button class="send-btn" (click)="sendMessage()" [disabled]="!userInput.trim() || isTyping || !agent.status">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 600px;
      border-radius: 24px;
      overflow: hidden;
    }
    .message-list {
      flex: 1;
      overflow-y: auto;
      padding: 30px;
      display: flex;
      flex-direction: column;
      gap: 20px;
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
      max-width: 85%;
      font-size: 0.95rem;
      line-height: 1.5;
      position: relative;
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

    /* Markdown Overrides */
    ::ng-deep .content markdown {
      display: block;
      color: white !important;
    }
    ::ng-deep .content markdown p {
      margin: 0 0 10px 0;
    }
    ::ng-deep .content markdown p:last-child {
      margin-bottom: 0;
    }
    ::ng-deep .content markdown code {
      background: rgba(0, 0, 0, 0.3);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Fira Code', monospace;
      font-size: 0.85em;
    }
    ::ng-deep .content markdown pre {
      background: #0d1117;
      padding: 16px;
      border-radius: 12px;
      overflow-x: auto;
      margin: 10px 0;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    ::ng-deep .content markdown table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 0.85rem;
    }
    ::ng-deep .content markdown th, ::ng-deep .content markdown td {
      border: 1px solid rgba(255, 255, 255, 0.1);
      padding: 8px 12px;
      text-align: left;
    }
    ::ng-deep .content markdown th {
      background: rgba(255, 255, 255, 0.05);
    }

    .fallback-text {
      display: block;
      font-size: 0.95rem;
      line-height: 1.5;
      color: white;
      white-space: pre-wrap;
    }

    /* Hide fallback only if markdown actually rendered something */
    markdown:not(:empty) + .fallback-text {
      display: none;
    }

    .time {
      font-size: 0.65rem;
      margin-top: 8px;
      opacity: 0.5;
      text-align: right;
    }
    .input-area {
      padding: 24px;
      border-top: 1px solid var(--glass-border);
    }
    .input-container {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      border-radius: 16px;
      background: rgba(0, 0, 0, 0.2);
    }
    textarea {
      flex: 1;
      background: transparent;
      border: none;
      color: white;
      padding: 10px;
      resize: none;
      font-family: inherit;
      font-size: 1rem;
      max-height: 120px;
      outline: none;
    }
    .send-btn {
      background: var(--accent-gradient);
      color: white;
      border: none;
      border-radius: 12px;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: var(--transition-smooth);
    }
    .send-btn:hover:not(:disabled) {
      transform: scale(1.05);
      box-shadow: 0 0 15px var(--accent-glow);
    }
    .typing-bubble {
      display: flex;
      gap: 4px;
      padding: 12px 18px;
    }
    .typing-bubble .dot {
      width: 5px;
      height: 5px;
      background: var(--accent-indigo);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out;
    }
    @keyframes bounce {
      0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
      40% { transform: translateY(-6px); opacity: 1; }
    }

    /* JSON Response Card CSS */
    .response-card {
      background: rgba(0, 0, 0, 0.15);
      padding: 18px;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      line-height: 1.6;
    }
    .response-card h2 {
      font-size: 1.15rem;
      margin-top: 0;
      margin-bottom: 8px;
      color: #fff;
    }
    .response-card h3 {
      margin-top: 14px;
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .response-card p.answer {
      margin-bottom: 12px;
    }
    .response-card ul {
      padding-left: 20px;
      margin-bottom: 10px;
    }
    .response-card li {
      margin-bottom: 6px;
    }
    .code-block-wrapper {
      margin-top: 15px;
      margin-bottom: 5px;
    }
  `]
})
export class ChatWindowComponent implements OnInit, AfterViewChecked {
  @Input() agent!: Agent;
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages: Message[] = [];
  userInput = '';
  isTyping = false;

  constructor(private agentService: AgentService) {}

  ngOnInit() {
    this.messages.push({
      sender: 'agent',
      content: `System initialized. ${this.agent.name} ready for directives.`,
      timestamp: new Date()
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

  getParsedData(content: string): any | null {
    if (!content || !content.trim().startsWith('{')) return null;
    try {
      const data = JSON.parse(content);
      if (data && typeof data === 'object' && (data.title || data.direct_answer)) {
        return data;
      }
    } catch (e) { }
    return null;
  }

  formatCodeBlock(code: string): string {
    return '```\n' + code + '\n```';
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
          content: "Protocol Error: Unable to reach neural processor.",
          timestamp: new Date()
        });
        this.isTyping = false;
      }
    });
  }
}
