import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MarkdownModule } from 'ngx-markdown';
import { AgentService } from '../../services/agent.service';
import { Agent, AgentLog } from '../../models/agent.models';
import { ChatWindowComponent } from '../../components/chat-window/chat-window.component';
import { EmailDashboardComponent } from '../../components/email-dashboard/email-dashboard.component';

@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    ChatWindowComponent,
    EmailDashboardComponent,
    MarkdownModule
  ],
  template: `
    <div class="detail-container" *ngIf="agent">
      <header class="detail-header">
        <button mat-icon-button routerLink="/dashboard" class="back-btn">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="agent-info">
          <h1 class="gradient-text">{{ agent.name }}</h1>
          <span class="type-tag">{{ agent.type }}</span>
        </div>
        <div class="status-pill" [class.active]="agent.status">
          {{ agent.status ? 'Operational' : 'Offline' }}
        </div>
      </header>

      <mat-tab-group class="custom-tabs">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>chat</mat-icon>
            <span>Chat</span>
          </ng-template>
          <div class="tab-content chat-tab">
            <app-chat-window [agent]="agent"></app-chat-window>
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>terminal</mat-icon>
            <span>Capabilities</span>
          </ng-template>
          <div class="tab-content glass-panel cap-tab">
            <h3>Neural Capabilities</h3>
            <p>{{ agent.description }}</p>
            <div *ngIf="agent.agentEmail && agent.type === 'Automation'" class="agent-email-box">
              <mat-icon>email</mat-icon>
              <span><strong>Agent Email:</strong> {{ agent.agentEmail }}</span>
            </div>
            <div class="cap-list">
              <div *ngFor="let cap of agent.capabilities || defaultCaps" class="cap-item">
                <mat-icon>check_circle</mat-icon>
                {{ cap }}
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>history</mat-icon>
            <span>Logs</span>
          </ng-template>
          <div class="tab-content glass-panel logs-tab">
            <div class="logs-header">
              <h3>Execution Logs</h3>
              <button mat-icon-button (click)="loadLogs()"><mat-icon>refresh</mat-icon></button>
            </div>
            
            <div class="log-table-container">
              <table class="log-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Input</th>
                    <th>Output</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let log of logs">
                    <td class="time">{{ log.timestamp | date:'medium' }}</td>
                    <td class="io">{{ log.input }}</td>
                    <td class="io output">
                      <markdown [data]="log.output" [katex]="true"></markdown>
                    </td>
                  </tr>
                  <tr *ngIf="logs.length === 0">
                    <td colspan="3" class="empty-logs">No execution records found for this agent.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </mat-tab>
        <!-- EMAIL AUTOMATION TAB: only for Automation agents -->
        <mat-tab *ngIf="agent.type === 'Automation'">
          <ng-template mat-tab-label>
            <mat-icon>mark_email_unread</mat-icon>
            <span>Email Automation</span>
          </ng-template>
          <div class="tab-content">
            <app-email-dashboard></app-email-dashboard>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <div *ngIf="loading" class="loader-container">
      <mat-spinner diameter="50"></mat-spinner>
      <p>Initializing neural bridge...</p>
    </div>
  `,
  styles: [`
    /* Markdown Styles for Logs */
    ::ng-deep .output markdown p { margin: 0; }
    ::ng-deep .output markdown pre { 
      background: rgba(0,0,0,0.2); 
      padding: 10px; 
      border-radius: 8px;
      font-size: 0.8rem;
    }

    .detail-container {
      padding: 40px 5%;
      max-width: 1400px;
      margin: 0 auto;
    }
    .detail-header {
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 40px;
    }
    .agent-info {
      flex: 1;
    }
    .agent-info h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -1px;
    }
    .type-tag {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--accent-indigo);
      font-weight: 700;
    }
    .status-pill {
      padding: 8px 16px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.05);
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .status-pill.active {
      color: #4ade80;
      background: rgba(74, 222, 128, 0.1);
      box-shadow: 0 0 10px rgba(74, 222, 128, 0.1);
    }
    .tab-content {
      padding: 30px 0;
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .glass-panel.tab-content {
      padding: 40px;
      border-radius: 24px;
    }
    .chat-tab {
      max-width: 1000px;
      margin: 0 auto;
    }
    .cap-tab h3, .logs-tab h3 {
      margin-top: 0;
      font-size: 1.5rem;
      margin-bottom: 24px;
    }
    .agent-email-box {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin: 16px 0;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--accent-indigo);
      border-radius: 12px;
      color: white;
      font-size: 0.95rem;
    }
    .agent-email-box mat-icon {
      color: var(--accent-indigo);
    }
    .cap-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 16px;
      margin-top: 32px;
    }
    .cap-item {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text-secondary);
    }
    .cap-item mat-icon {
      color: var(--accent-indigo);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .logs-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .log-table-container {
      overflow-x: auto;
    }
    .log-table {
      width: 100%;
      border-collapse: collapse;
    }
    .log-table th {
      text-align: left;
      padding: 16px;
      color: var(--text-muted);
      font-size: 0.85rem;
      border-bottom: 1px solid var(--glass-border);
    }
    .log-table td {
      padding: 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.03);
      vertical-align: top;
      font-size: 0.9rem;
    }
    .log-table .time {
      white-space: nowrap;
      color: var(--text-muted);
    }
    .log-table .io {
      color: var(--text-secondary);
    }
    .log-table .output {
      color: var(--text-primary);
    }
    .empty-logs {
      text-align: center;
      padding: 40px !important;
      color: var(--text-muted);
    }
    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 20px;
      color: var(--text-muted);
    }
  `]
})
export class AgentDetailComponent implements OnInit {
  agent?: Agent;
  logs: AgentLog[] = [];
  loading = true;
  defaultCaps = [
    'Autonomous Decision Making',
    'Natural Language Processing',
    'Real-time Data Retrieval',
    'Contextual Awareness'
  ];

  constructor(
    private route: ActivatedRoute,
    private agentService: AgentService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadAgent(id);
      this.loadLogs(id);
    }
  }

  loadAgent(id: number) {
    this.agentService.getAgentById(id).subscribe({
      next: (data) => {
        this.agent = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadLogs(id?: number) {
    const agentId = id || this.agent?.id;
    if (agentId) {
      this.agentService.getLogsByAgentId(agentId).subscribe(data => {
        this.logs = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      });
    }
  }
}
