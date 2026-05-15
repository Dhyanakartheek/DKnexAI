import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgentService } from '../../services/agent.service';
import { AgentLog } from '../../models/agent.models';

@Component({
  selector: 'app-logs',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="logs-container">
      <header class="logs-header">
        <div class="header-main">
          <h1 class="gradient-text">Execution Intelligence</h1>
          <p>Real-time audit trail of neural agent operations</p>
        </div>
        <button class="refresh-btn glass-panel" (click)="loadLogs()" [class.spinning]="loading">
          <mat-icon>refresh</mat-icon>
          Sync Logs
        </button>
      </header>

      <div class="glass-panel logs-card">
        <div *ngIf="loading" class="loader">
          <mat-spinner diameter="40"></mat-spinner>
          <span>Retrieving records...</span>
        </div>

        <div *ngIf="!loading" class="table-scroll">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Neural Input</th>
                <th>Agent Output</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let log of logs">
                <td class="time-col">
                  <div class="date">{{ log.timestamp | date:'MMM d' }}</div>
                  <div class="time">{{ log.timestamp | date:'HH:mm:ss' }}</div>
                </td>
                <td class="input-col">
                  <div class="content-wrapper">{{ log.input }}</div>
                </td>
                <td class="output-col">
                  <div class="content-wrapper agent-text">{{ log.output }}</div>
                </td>
                <td class="status-col">
                  <span class="status-indicator">SUCCESS</span>
                </td>
              </tr>
              <tr *ngIf="logs.length === 0">
                <td colspan="4" class="empty-state">
                  <mat-icon>history_toggle_off</mat-icon>
                  <p>No execution logs found in current sector.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logs-container { padding: 40px 5%; max-width: 1600px; margin: 0 auto; }
    .logs-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 40px; }
    .logs-header h1 { font-size: 3rem; font-weight: 800; margin: 0; letter-spacing: -1.5px; }
    .logs-header p { color: var(--text-muted); font-size: 1.1rem; margin-top: 8px; }
    
    .refresh-btn { 
      background: rgba(255, 255, 255, 0.05); border: 1px solid var(--glass-border); 
      color: white; padding: 12px 24px; border-radius: 12px; cursor: pointer;
      display: flex; align-items: center; gap: 10px; font-weight: 600;
      transition: var(--transition-smooth);
    }
    .refresh-btn:hover { background: rgba(255, 255, 255, 0.1); border-color: var(--accent-indigo); }
    .spinning mat-icon { animation: spin 1s infinite linear; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

    .logs-card { border-radius: 28px; overflow: hidden; min-height: 500px; }
    .table-scroll { overflow-x: auto; max-height: 75vh; }
    
    .premium-table { width: 100%; border-collapse: collapse; text-align: left; }
    .premium-table th { 
      padding: 20px 24px; background: rgba(255, 255, 255, 0.03); 
      color: var(--text-muted); font-size: 0.8rem; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid var(--glass-border);
    }
    .premium-table td { padding: 24px; border-bottom: 1px solid rgba(255, 255, 255, 0.03); vertical-align: middle; }
    
    .time-col { white-space: nowrap; }
    .time-col .date { font-weight: 700; color: var(--text-primary); font-size: 0.95rem; }
    .time-col .time { color: var(--text-muted); font-size: 0.8rem; margin-top: 4px; }
    
    .content-wrapper { max-width: 400px; line-height: 1.6; color: var(--text-secondary); font-size: 0.95rem; }
    .agent-text { color: var(--text-primary); font-weight: 500; }
    
    .status-indicator { 
      background: rgba(74, 222, 128, 0.1); color: #4ade80; 
      padding: 6px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 800;
    }
    
    .loader { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 500px; gap: 20px; color: var(--text-muted); }
    .empty-state { text-align: center; padding: 100px !important; color: var(--text-muted); }
    .empty-state mat-icon { font-size: 3rem; width: 3rem; height: 3rem; margin-bottom: 16px; opacity: 0.5; }
  `]
})
export class LogsComponent implements OnInit {
  logs: AgentLog[] = [];
  loading = true;

  constructor(private agentService: AgentService) {}

  ngOnInit() {
    this.loadLogs();
  }

  loadLogs() {
    this.loading = true;
    this.agentService.getAllLogs().subscribe({
      next: (data) => {
        this.logs = data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }
}
