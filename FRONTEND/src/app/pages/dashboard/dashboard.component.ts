import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgentService } from '../../services/agent.service';
import { Agent } from '../../models/agent.models';
import { AgentCardComponent } from '../../components/agent-card/agent-card.component';
import { CreateAgentModalComponent } from '../../components/create-agent-modal/create-agent-modal.component';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    AgentCardComponent,
    CreateAgentModalComponent
  ],
  template: `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div class="header-content">
          <h1 class="gradient-text">Neural Command</h1>
          <p>Orchestrate your autonomous AI workforce</p>
        </div>
        <div style="display: flex; gap: 16px;">
          <button class="btn-primary" style="background: var(--glass-border); border: 1px solid rgba(255,255,255,0.2)" routerLink="/workspace">
            <mat-icon>code</mat-icon>
            Code Workspace
          </button>
          <button *ngIf="isAdmin" class="btn-primary deploy-btn" (click)="showModal = true">
            <mat-icon>add</mat-icon>
            Deploy Agent
          </button>
        </div>
      </header>

      <nav class="filter-tabs glass-panel">
        <button 
          *ngFor="let cat of categories" 
          [class.active]="selectedCategory === cat"
          (click)="selectedCategory = cat">
          {{ cat }}
        </button>
      </nav>

      <div *ngIf="loading" class="loader-container">
        <mat-spinner diameter="40"></mat-spinner>
        <span>Syncing with Neural Network...</span>
      </div>

      <div *ngIf="!loading" class="agent-grid">
        <app-agent-card 
          *ngFor="let agent of filteredAgents" 
          [agent]="agent">
        </app-agent-card>
      </div>

      <div *ngIf="!loading && filteredAgents.length === 0" class="empty-state glass-panel">
        <div class="empty-icon"><mat-icon>terminal</mat-icon></div>
        <h3>No neural agents detected.</h3>
        <p>Create your first AI agent to begin orchestration.</p>
        <button *ngIf="isAdmin" class="btn-primary" (click)="showModal = true">Deploy First Agent</button>
      </div>
    </div>

    <app-create-agent-modal 
      *ngIf="showModal" 
      (close)="showModal = false"
      (created)="loadAgents()">
    </app-create-agent-modal>
  `,
  styles: [`
    .dashboard-container {
      padding: 40px 5%;
      max-width: 1600px;
      margin: 0 auto;
    }
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 48px;
    }
    h1 {
      font-size: 3.5rem;
      font-weight: 800;
      letter-spacing: -2px;
      margin: 0;
    }
    .deploy-btn {
      height: 56px;
      padding: 0 32px;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .filter-tabs {
      display: flex;
      padding: 6px;
      gap: 8px;
      border-radius: 16px;
      margin-bottom: 40px;
      width: fit-content;
    }
    .filter-tabs button {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 10px 24px;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: var(--transition-smooth);
    }
    .filter-tabs button.active {
      background: rgba(255, 255, 255, 0.08);
      color: white;
    }
    .agent-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 32px;
    }
    .loader-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 100px;
      gap: 20px;
      color: var(--text-muted);
    }
    .empty-state {
      padding: 80px;
      text-align: center;
      border-radius: 32px;
      max-width: 600px;
      margin: 40px auto;
    }
    .empty-icon {
      font-size: 3rem;
      color: var(--accent-indigo);
      margin-bottom: 24px;
    }
    .empty-state h3 {
      font-size: 1.8rem;
      font-weight: 700;
      margin-bottom: 12px;
    }
    .empty-state p {
      color: var(--text-secondary);
      margin-bottom: 32px;
    }
    @media (max-width: 768px) {
      h1 { font-size: 2.5rem; }
      .dashboard-header { flex-direction: column; align-items: flex-start; gap: 24px; }
      .deploy-btn { width: 100%; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  agents: Agent[] = [];
  loading = true;
  showModal = false;
  
  categories = ['All', 'Chat', 'Automation', 'Coding', 'RAG'];
  selectedCategory = 'All';

  constructor(private agentService: AgentService, private authService: AuthService) {}

  get isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  ngOnInit(): void {
    this.loadAgents();
  }

  loadAgents() {
    this.loading = true;
    this.agentService.getAllAgents().subscribe({
      next: (data) => {
        this.agents = data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  get filteredAgents() {
    if (this.selectedCategory === 'All') return this.agents;
    return this.agents.filter(a => a.type === this.selectedCategory);
  }
}
