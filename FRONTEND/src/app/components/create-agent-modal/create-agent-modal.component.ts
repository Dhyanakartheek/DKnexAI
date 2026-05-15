import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AgentService } from '../../services/agent.service';

@Component({
  selector: 'app-create-agent-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <div class="glass-panel modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2 class="gradient-text">Deploy New Agent</h2>
          <button mat-icon-button (click)="close.emit()" class="close-btn">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <form [formGroup]="agentForm" (ngSubmit)="onSubmit()" class="agent-form">
          <div class="form-group">
            <label>Agent Name</label>
            <input type="text" formControlName="name" placeholder="e.g. Nexus Prime">
          </div>

          <div class="form-group">
            <label>Agent Type</label>
            <select formControlName="type">
              <option value="Chat">Chat Agent</option>
              <option value="Automation">Automation Agent</option>
              <option value="Coding">Coding Assistant</option>
              <option value="RAG">Knowledge RAG</option>
            </select>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea formControlName="description" rows="3" placeholder="Define the agent's core purpose..."></textarea>
          </div>

          <div class="form-group" *ngIf="agentForm.get('type')?.value === 'Automation'">
            <label>Agent Email</label>
            <input type="email" formControlName="agentEmail" placeholder="e.g. agent@dknex.ai">
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancel" (click)="close.emit()">Abort</button>
            <button type="submit" class="btn-primary" [disabled]="agentForm.invalid || loading">
              {{ loading ? 'Deploying...' : 'Initialize Agent' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(8px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-content {
      width: 100%;
      max-width: 500px;
      padding: 40px;
      border-radius: 32px;
      animation: modalSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }
    @keyframes modalSlide {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 32px;
    }
    .modal-header h2 {
      margin: 0;
      font-size: 1.8rem;
      font-weight: 800;
    }
    .agent-form {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .form-group label {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      margin-left: 4px;
    }
    input, select, textarea {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--glass-border);
      border-radius: 12px;
      padding: 14px 18px;
      color: white;
      font-family: inherit;
      font-size: 1rem;
      transition: var(--transition-smooth);
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--accent-indigo);
      background: rgba(255, 255, 255, 0.06);
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 12px;
    }
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--glass-border);
      color: var(--text-secondary);
      padding: 0 24px;
      border-radius: 12px;
      cursor: pointer;
      transition: var(--transition-smooth);
    }
    .btn-cancel:hover {
      background: rgba(255, 255, 255, 0.05);
      color: white;
    }
    .btn-primary {
      height: 52px;
      font-size: 1rem;
    }
    .close-btn {
      color: var(--text-muted);
    }
    option {
      background: #0a0a0c;
      color: white;
    }
  `]
})
export class CreateAgentModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() created = new EventEmitter<void>();
  
  agentForm: FormGroup;
  loading = false;

  constructor(private fb: FormBuilder, private agentService: AgentService) {
    this.agentForm = this.fb.group({
      name: ['', Validators.required],
      type: ['Chat', Validators.required],
      description: ['', Validators.required],
      agentEmail: ['']
    });
  }

  onSubmit() {
    if (this.agentForm.invalid) return;
    this.loading = true;
    this.agentService.createAgent(this.agentForm.value).subscribe({
      next: () => {
        this.loading = false;
        this.created.emit();
        this.close.emit();
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
