import { Component, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Agent } from '../../models/agent.models';

@Component({
  selector: 'app-agent-card',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, MatCardModule, MatIconModule],
  template: `
    <mat-card class="glass-panel agent-card" [routerLink]="['/agent', agent.id]">
      <mat-card-header>
        <div mat-card-avatar class="agent-icon-wrapper" [ngClass]="agent.type.toLowerCase()">
          <mat-icon>{{ getIcon(agent.type) }}</mat-icon>
        </div>
        <div class="header-text">
          <mat-card-title>{{ agent.name }}</mat-card-title>
          <mat-card-subtitle>{{ agent.type }}</mat-card-subtitle>
        </div>
      </mat-card-header>
      
      <mat-card-content>
        <p class="description">{{ agent.description }}</p>
        <div class="agent-email-small" *ngIf="agent.type === 'Automation' && agent.agentEmail">
          <mat-icon>mail</mat-icon>
          {{ agent.agentEmail }}
        </div>
        
        <div class="card-footer">
          <div class="status-badge" [class.active]="agent.status">
            <span class="dot"></span>
            {{ agent.status ? 'Active' : 'Inactive' }}
          </div>
          <div class="time-stamp" *ngIf="agent.lastUsedTime">
            <mat-icon>history</mat-icon>
            {{ agent.lastUsedTime | date:'short' }}
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .agent-card {
      padding: 24px;
      border-radius: 24px;
      cursor: pointer;
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: var(--transition-smooth);
    }
    .agent-card:hover {
      border-color: var(--accent-indigo);
      box-shadow: 0 0 30px var(--accent-glow);
    }
    .header-text {
      margin-left: 12px;
    }
    .agent-icon-wrapper {
      background: var(--accent-gradient);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      width: 44px;
      height: 44px;
      color: white;
    }
    .agent-icon-wrapper.automation { background: linear-gradient(135deg, #3b82f6, #06b6d4); }
    .agent-icon-wrapper.coding { background: linear-gradient(135deg, #8b5cf6, #d946ef); }
    .agent-icon-wrapper.rag { background: linear-gradient(135deg, #f59e0b, #ef4444); }
    
    mat-card-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: white;
      margin: 0;
    }
    mat-card-subtitle {
      color: var(--accent-indigo);
      text-transform: uppercase;
      font-size: 0.7rem;
      letter-spacing: 1px;
      margin: 2px 0 0;
    }
    .description {
      height: 50px;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      margin: 20px 0;
      color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .agent-email-small {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      color: var(--accent-indigo);
      margin-bottom: 12px;
      margin-top: -10px;
    }
    .agent-email-small mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
    .card-footer {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.05);
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .status-badge.active {
      color: #4ade80;
      background: rgba(74, 222, 128, 0.1);
    }
    .status-badge .dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: currentColor;
    }
    .time-stamp {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .time-stamp mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }
  `]
})
export class AgentCardComponent {
  @Input() agent!: Agent;

  getIcon(type: string): string {
    switch (type?.toLowerCase()) {
      case 'chat': return 'chat';
      case 'automation': return 'auto_fix_high';
      case 'coding': return 'code';
      case 'rag': return 'menu_book';
      default: return 'smart_toy';
    }
  }
}
