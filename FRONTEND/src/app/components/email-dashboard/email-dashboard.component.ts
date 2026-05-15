import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmailAgentService, EmailLead, EmailTask, EmailDraft, DashboardStats, EmailUser } from '../../services/email-agent.service';

type ActiveTab = 'overview' | 'leads' | 'tasks' | 'drafts' | 'users';

@Component({
  selector: 'app-email-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <!-- LOGIN GATE -->
    <div *ngIf="!svc.isAuthenticated" class="login-gate glass-panel">
      <div class="login-icon"><mat-icon>mark_email_unread</mat-icon></div>
      <h3 class="gradient-text">Email Agent Login</h3>
      <p>Connect to the Email Automation service</p>
      <form [formGroup]="loginForm" (ngSubmit)="login()" class="login-form">
        <input formControlName="email" type="email" placeholder="Email address">
        <input formControlName="password" type="password" placeholder="Password">
        <p *ngIf="loginError" class="error-msg">{{ loginError }}</p>
        <button type="submit" class="btn-primary" [disabled]="loginForm.invalid || loggingIn">
          {{ loggingIn ? 'Connecting...' : 'Connect Agent' }}
        </button>
      </form>
    </div>

    <!-- DASHBOARD -->
    <div *ngIf="svc.isAuthenticated" class="email-dash">
      <!-- Header -->
      <div class="dash-header">
        <div class="user-info">
          <mat-icon class="user-icon">account_circle</mat-icon>
          <div>
            <span class="user-name">{{ svc.currentUser?.name }}</span>
            <span class="user-role" [class.admin]="svc.isAdmin">{{ svc.currentUser?.role | titlecase }}</span>
          </div>
        </div>
        <div class="dash-actions">
          <button *ngIf="svc.isAdmin" class="icon-btn" (click)="downloadExcel()" title="Download Excel">
            <mat-icon>table_chart</mat-icon>
          </button>
          <button *ngIf="svc.isAdmin" class="icon-btn" (click)="downloadPdf()" title="Download PDF">
            <mat-icon>picture_as_pdf</mat-icon>
          </button>
          <button class="icon-btn" (click)="loadAll()" title="Refresh">
            <mat-icon>refresh</mat-icon>
          </button>
          <button class="icon-btn logout-btn" (click)="logout()" title="Disconnect">
            <mat-icon>logout</mat-icon>
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <nav class="email-tabs">
        <button *ngFor="let t of tabs" [class.active]="activeTab === t.id" (click)="activeTab = t.id">
          <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
        </button>
      </nav>

      <!-- OVERVIEW -->
      <div *ngIf="activeTab === 'overview'" class="tab-panel">
        <div *ngIf="loadingStats" class="mini-loader"><mat-spinner diameter="30"></mat-spinner></div>
        <div *ngIf="!loadingStats && stats" class="stats-grid">
          <div class="stat-card" *ngFor="let s of statCards">
            <mat-icon class="stat-icon">{{ s.icon }}</mat-icon>
            <div class="stat-val">{{ stats[s.key] }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>

      <!-- LEADS -->
      <div *ngIf="activeTab === 'leads'" class="tab-panel">
        <div class="panel-controls">
          <select [(ngModel)]="leadFilter" (ngModelChange)="loadLeads()" class="filter-select">
            <option value="">All Statuses</option>
            <option *ngFor="let s of leadStatuses" [value]="s">{{ s }}</option>
          </select>
        </div>
        <div *ngIf="loadingLeads" class="mini-loader"><mat-spinner diameter="30"></mat-spinner></div>
        <div *ngIf="!loadingLeads" class="data-table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Lead ID</th><th>Client</th><th>Role</th><th>Deadline</th><th>Status</th><th *ngIf="svc.isAdmin">Actions</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let l of leads">
                <td class="mono">{{ l.lead_id }}</td>
                <td>{{ l.client_name }}</td>
                <td>{{ l.role }}</td>
                <td>{{ l.submission_deadline ? (l.submission_deadline | date:'mediumDate') : '—' }}</td>
                <td><span class="status-chip" [ngClass]="getLeadClass(l.status)">{{ l.status }}</span></td>
                <td *ngIf="svc.isAdmin">
                  <select class="inline-select" [value]="l.status" (change)="changeLeadStatus(l, $any($event.target).value)">
                    <option *ngFor="let s of leadStatuses" [value]="s">{{ s }}</option>
                  </select>
                </td>
              </tr>
              <tr *ngIf="leads.length === 0"><td colspan="6" class="empty-row">No leads found.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- TASKS -->
      <div *ngIf="activeTab === 'tasks'" class="tab-panel">
        <div *ngIf="loadingTasks" class="mini-loader"><mat-spinner diameter="30"></mat-spinner></div>
        <div *ngIf="!loadingTasks" class="data-table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Title</th><th>Lead</th><th>Due Date</th><th>Status</th><th>Actions</th>
            </tr></thead>
            <tbody>
              <tr *ngFor="let t of tasks">
                <td>{{ t.title }}</td>
                <td class="mono">{{ t.lead_id || '—' }}</td>
                <td>{{ t.due_date ? (t.due_date | date:'mediumDate') : '—' }}</td>
                <td><span class="status-chip" [ngClass]="getTaskClass(t.status)">{{ t.status }}</span></td>
                <td>
                  <select class="inline-select" [value]="t.status" (change)="changeTaskStatus(t, $any($event.target).value)">
                    <option *ngFor="let s of taskStatuses" [value]="s">{{ s }}</option>
                  </select>
                </td>
              </tr>
              <tr *ngIf="tasks.length === 0"><td colspan="5" class="empty-row">No tasks found.</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- DRAFTS -->
      <div *ngIf="activeTab === 'drafts'" class="tab-panel">
        <div *ngIf="loadingDrafts" class="mini-loader"><mat-spinner diameter="30"></mat-spinner></div>
        <div *ngIf="!loadingDrafts" class="drafts-list">
          <div *ngFor="let d of drafts" class="draft-card glass-panel">
            <div class="draft-header">
              <div>
                <span class="draft-subject">{{ d.subject }}</span>
                <span class="draft-to">→ {{ d.to_email }}</span>
              </div>
              <span class="status-chip" [ngClass]="getDraftClass(d.status)">{{ d.status }}</span>
            </div>
            <p class="draft-body">{{ d.body | slice:0:200 }}{{ d.body.length > 200 ? '...' : '' }}</p>
            <div class="draft-footer" *ngIf="svc.isAdmin && d.status === 'Pending'">
              <button class="btn-approve" (click)="actOnDraft(d, 'approve')">
                <mat-icon>check_circle</mat-icon> Approve & Send
              </button>
              <button class="btn-reject" (click)="actOnDraft(d, 'reject')">
                <mat-icon>cancel</mat-icon> Reject
              </button>
            </div>
          </div>
          <div *ngIf="drafts.length === 0" class="empty-row" style="text-align:center;padding:40px">No drafts found.</div>
        </div>
      </div>

      <!-- USERS (Admin) -->
      <div *ngIf="activeTab === 'users' && svc.isAdmin" class="tab-panel">
        <div class="panel-controls" style="justify-content: flex-end;">
          <button class="btn-primary" style="height: 40px; padding: 0 16px; font-size: 0.9rem;" (click)="showAddUser = !showAddUser">
            <mat-icon>{{ showAddUser ? 'close' : 'person_add' }}</mat-icon>
            {{ showAddUser ? 'Cancel' : 'Add New User/Agent' }}
          </button>
        </div>

        <div *ngIf="showAddUser" class="glass-panel" style="padding: 20px; margin-bottom: 20px; border-radius: 16px;">
          <h4 style="margin-top: 0; color: white;">Create New User/Agent</h4>
          <form [formGroup]="newUserForm" (ngSubmit)="createUser()" style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <input formControlName="name" placeholder="Name" class="filter-select">
            <input formControlName="email" type="email" placeholder="Email" class="filter-select">
            <input formControlName="password" type="password" placeholder="Password" class="filter-select">
            <select formControlName="role" class="filter-select">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" class="btn-primary" style="height: 38px; padding: 0 16px;" [disabled]="newUserForm.invalid || creatingUser">
              {{ creatingUser ? 'Adding...' : 'Save' }}
            </button>
          </form>
        </div>

        <div *ngIf="loadingUsers" class="mini-loader"><mat-spinner diameter="30"></mat-spinner></div>
        <div *ngIf="!loadingUsers" class="data-table-wrap">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              <tr *ngFor="let u of users">
                <td>{{ u.name }}</td>
                <td>{{ u.email }}</td>
                <td><span class="role-chip" [class.admin]="u.role === 'admin'">{{ u.role }}</span></td>
                <td><span class="status-chip" [ngClass]="u.is_active ? 'chip-open' : 'chip-closed'">{{ u.is_active ? 'Active' : 'Inactive' }}</span></td>
                <td>
                  <button *ngIf="u.is_active && u.id !== svc.currentUser?.id" class="icon-btn danger" (click)="deactivateUser(u)" title="Deactivate">
                    <mat-icon>person_off</mat-icon>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    /* LOGIN */
    .login-gate {
      max-width: 420px; margin: 0 auto; padding: 48px 40px;
      border-radius: 24px; text-align: center;
    }
    .login-icon { font-size: 3rem; color: var(--accent-indigo); margin-bottom: 16px; }
    .login-icon mat-icon { font-size: 3rem; width: 3rem; height: 3rem; }
    .login-gate h3 { font-size: 1.8rem; font-weight: 800; margin: 0 0 8px; }
    .login-gate p { color: var(--text-secondary); margin: 0 0 28px; }
    .login-form { display: flex; flex-direction: column; gap: 14px; }
    .login-form input {
      background: rgba(255,255,255,0.04); border: 1px solid var(--glass-border);
      border-radius: 12px; padding: 14px 18px; color: white; font-size: 1rem; font-family: inherit;
    }
    .login-form input:focus { outline: none; border-color: var(--accent-indigo); }
    .login-form .btn-primary { width: 100%; height: 52px; font-size: 1rem; margin-top: 8px; }
    .error-msg { color: #f87171; font-size: 0.85rem; margin: 0; }

    /* DASHBOARD */
    .email-dash { display: flex; flex-direction: column; gap: 20px; }
    .dash-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 16px 20px; background: rgba(255,255,255,0.03);
      border: 1px solid var(--glass-border); border-radius: 16px;
    }
    .user-info { display: flex; align-items: center; gap: 12px; }
    .user-icon { color: var(--accent-indigo); font-size: 2rem; width: 2rem; height: 2rem; }
    .user-name { display: block; font-weight: 700; font-size: 1rem; }
    .user-role {
      display: inline-block; font-size: 0.7rem; text-transform: uppercase;
      letter-spacing: 1px; color: var(--text-muted); background: rgba(255,255,255,0.05);
      padding: 2px 8px; border-radius: 8px; margin-top: 2px;
    }
    .user-role.admin { color: #a78bfa; background: rgba(167,139,250,0.1); }
    .dash-actions { display: flex; gap: 8px; }
    .icon-btn {
      background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
      color: var(--text-secondary); border-radius: 10px; padding: 8px;
      cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.1); color: white; }
    .icon-btn.danger:hover { color: #f87171; border-color: #f87171; }
    .logout-btn:hover { color: #f87171; }

    /* TABS */
    .email-tabs {
      display: flex; gap: 6px; background: rgba(255,255,255,0.03);
      border: 1px solid var(--glass-border); border-radius: 14px;
      padding: 6px; width: fit-content;
    }
    .email-tabs button {
      display: flex; align-items: center; gap: 6px;
      background: transparent; border: none; color: var(--text-secondary);
      padding: 10px 20px; border-radius: 10px; font-weight: 600;
      cursor: pointer; transition: all 0.2s; font-size: 0.9rem;
    }
    .email-tabs button mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .email-tabs button.active { background: rgba(255,255,255,0.08); color: white; }

    /* PANEL */
    .tab-panel { animation: fadeIn 0.3s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .mini-loader { display: flex; justify-content: center; padding: 40px; }
    .panel-controls { margin-bottom: 16px; display: flex; gap: 12px; }

    /* STATS */
    .stats-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 16px;
    }
    .stat-card {
      background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
      border-radius: 16px; padding: 24px 20px; text-align: center;
      transition: all 0.2s;
    }
    .stat-card:hover { border-color: var(--accent-indigo); }
    .stat-icon { color: var(--accent-indigo); font-size: 2rem; width: 2rem; height: 2rem; margin-bottom: 8px; }
    .stat-val { font-size: 2.5rem; font-weight: 800; line-height: 1; }
    .stat-label { font-size: 0.8rem; color: var(--text-muted); margin-top: 6px; text-transform: uppercase; letter-spacing: 1px; }

    /* TABLE */
    .data-table-wrap { overflow-x: auto; border-radius: 16px; border: 1px solid var(--glass-border); }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th {
      text-align: left; padding: 14px 16px; font-size: 0.8rem;
      color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;
      border-bottom: 1px solid var(--glass-border);
    }
    .data-table td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 0.9rem; }
    .data-table tbody tr:hover { background: rgba(255,255,255,0.02); }
    .mono { font-family: monospace; font-size: 0.85rem; color: var(--accent-indigo); }
    .empty-row { text-align: center; color: var(--text-muted); padding: 40px 16px !important; }

    /* STATUS CHIPS */
    .status-chip {
      display: inline-block; padding: 3px 10px; border-radius: 20px;
      font-size: 0.75rem; font-weight: 600;
    }
    .chip-open { background: rgba(74,222,128,0.1); color: #4ade80; }
    .chip-submitted { background: rgba(96,165,250,0.1); color: #60a5fa; }
    .chip-closed { background: rgba(248,113,113,0.1); color: #f87171; }
    .chip-pending { background: rgba(251,191,36,0.15); color: #fbbf24; }
    .chip-approved { background: rgba(74,222,128,0.1); color: #4ade80; }
    .chip-sent { background: rgba(96,165,250,0.1); color: #60a5fa; }
    .chip-rejected { background: rgba(248,113,113,0.1); color: #f87171; }
    .chip-done { background: rgba(74,222,128,0.1); color: #4ade80; }
    .chip-inprogress { background: rgba(167,139,250,0.1); color: #a78bfa; }

    /* ROLES */
    .role-chip {
      display: inline-block; padding: 3px 10px; border-radius: 20px;
      font-size: 0.75rem; background: rgba(255,255,255,0.05); color: var(--text-muted);
    }
    .role-chip.admin { background: rgba(167,139,250,0.1); color: #a78bfa; }

    /* INLINE SELECT */
    .filter-select, .inline-select {
      background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
      color: white; border-radius: 10px; padding: 8px 12px; font-size: 0.85rem; cursor: pointer;
    }
    .inline-select { padding: 4px 8px; font-size: 0.8rem; }

    /* DRAFTS */
    .drafts-list { display: flex; flex-direction: column; gap: 16px; }
    .draft-card { padding: 20px 24px; border-radius: 16px; }
    .draft-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .draft-subject { font-weight: 700; font-size: 1rem; display: block; }
    .draft-to { font-size: 0.85rem; color: var(--accent-indigo); }
    .draft-body { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0 0 12px; }
    .draft-footer { display: flex; gap: 12px; }
    .btn-approve {
      display: flex; align-items: center; gap: 6px;
      background: rgba(74,222,128,0.1); border: 1px solid rgba(74,222,128,0.3);
      color: #4ade80; padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 0.9rem;
      transition: all 0.2s;
    }
    .btn-approve:hover { background: rgba(74,222,128,0.2); }
    .btn-reject {
      display: flex; align-items: center; gap: 6px;
      background: rgba(248,113,113,0.1); border: 1px solid rgba(248,113,113,0.3);
      color: #f87171; padding: 8px 16px; border-radius: 10px; cursor: pointer; font-size: 0.9rem;
      transition: all 0.2s;
    }
    .btn-reject:hover { background: rgba(248,113,113,0.2); }
  `]
})
export class EmailDashboardComponent implements OnInit {
  loginForm: FormGroup;
  loginError = '';
  loggingIn = false;
  activeTab: ActiveTab = 'overview';
  showAddUser = false;
  creatingUser = false;

  stats: DashboardStats | null = null;
  leads: EmailLead[] = [];
  tasks: EmailTask[] = [];
  drafts: EmailDraft[] = [];
  users: EmailUser[] = [];

  loadingStats = false;
  loadingLeads = false;
  loadingTasks = false;
  loadingDrafts = false;
  loadingUsers = false;

  leadFilter = '';
  leadStatuses = ['Open', 'Submitted', 'Closed', 'On Hold'];
  taskStatuses = ['Pending', 'In Progress', 'Done', 'Cancelled'];

  newUserForm: FormGroup;

  tabs = [
    { id: 'overview' as ActiveTab, label: 'Overview', icon: 'dashboard' },
    { id: 'leads' as ActiveTab, label: 'Leads', icon: 'contacts' },
    { id: 'tasks' as ActiveTab, label: 'Tasks', icon: 'task_alt' },
    { id: 'drafts' as ActiveTab, label: 'Drafts', icon: 'drafts' },
    { id: 'users' as ActiveTab, label: 'Users', icon: 'group' },
  ];

  statCards = [
    { key: 'total_leads' as keyof DashboardStats, label: 'Total Leads', icon: 'contacts' },
    { key: 'open_leads' as keyof DashboardStats, label: 'Open Leads', icon: 'folder_open' },
    { key: 'submitted_leads' as keyof DashboardStats, label: 'Submitted', icon: 'check_circle' },
    { key: 'pending_tasks' as keyof DashboardStats, label: 'Pending Tasks', icon: 'pending_actions' },
    { key: 'pending_drafts' as keyof DashboardStats, label: 'Pending Drafts', icon: 'drafts' },
    { key: 'emails_processed_today' as keyof DashboardStats, label: 'Emails Today', icon: 'email' },
  ];

  constructor(public svc: EmailAgentService, private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.newUserForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['staff', Validators.required]
    });
  }

  ngOnInit() {
    if (this.svc.isAuthenticated) {
      this.loadAll();
    }
    // Filter users tab for non-admin
    if (!this.svc.isAdmin) {
      this.tabs = this.tabs.filter(t => t.id !== 'users');
    }
  }

  login() {
    this.loggingIn = true;
    this.loginError = '';
    const { email, password } = this.loginForm.value;
    this.svc.login(email, password).subscribe({
      next: () => { this.loggingIn = false; this.loadAll(); },
      error: (e) => {
        this.loggingIn = false;
        this.loginError = e.error?.detail || 'Login failed. Check credentials.';
      }
    });
  }

  logout() {
    this.svc.logout();
  }

  loadAll() {
    this.loadStats();
    this.loadLeads();
    this.loadTasks();
    this.loadDrafts();
    if (this.svc.isAdmin) this.loadUsers();
  }

  loadStats() {
    this.loadingStats = true;
    this.svc.getDashboardStats().subscribe({
      next: (d) => { this.stats = d; this.loadingStats = false; },
      error: () => this.loadingStats = false
    });
  }

  loadLeads() {
    this.loadingLeads = true;
    this.svc.getLeads(this.leadFilter || undefined).subscribe({
      next: (d) => { this.leads = d; this.loadingLeads = false; },
      error: () => this.loadingLeads = false
    });
  }

  loadTasks() {
    this.loadingTasks = true;
    this.svc.getTasks().subscribe({
      next: (d) => { this.tasks = d; this.loadingTasks = false; },
      error: () => this.loadingTasks = false
    });
  }

  loadDrafts() {
    this.loadingDrafts = true;
    this.svc.getDrafts().subscribe({
      next: (d) => { this.drafts = d; this.loadingDrafts = false; },
      error: () => this.loadingDrafts = false
    });
  }

  loadUsers() {
    this.loadingUsers = true;
    this.svc.getUsers().subscribe({
      next: (d) => { this.users = d; this.loadingUsers = false; },
      error: () => this.loadingUsers = false
    });
  }

  changeLeadStatus(lead: EmailLead, status: string) {
    this.svc.updateLead(lead.lead_id, { status }).subscribe({
      next: (updated) => lead.status = updated.status,
      error: () => {}
    });
  }

  changeTaskStatus(task: EmailTask, status: string) {
    this.svc.updateTask(task.id, { status }).subscribe({
      next: (updated) => task.status = updated.status,
      error: () => {}
    });
  }

  actOnDraft(draft: EmailDraft, action: 'approve' | 'reject') {
    this.svc.approveDraft(draft.id, action).subscribe({
      next: (updated) => draft.status = updated.status,
      error: () => {}
    });
  }

  deactivateUser(user: EmailUser) {
    this.svc.deactivateUser(user.id).subscribe({
      next: () => user.is_active = false,
      error: () => {}
    });
  }

  createUser() {
    if (this.newUserForm.invalid) return;
    this.creatingUser = true;
    this.svc.createUser(this.newUserForm.value).subscribe({
      next: (newUser) => {
        this.users.unshift(newUser);
        this.creatingUser = false;
        this.showAddUser = false;
        this.newUserForm.reset({ role: 'staff' });
      },
      error: (err) => {
        console.error('Failed to create user', err);
        this.creatingUser = false;
      }
    });
  }

  downloadExcel() { this.svc.downloadExcel(); }
  downloadPdf() { this.svc.downloadPdf(); }

  getLeadClass(status: string): string {
    const map: Record<string, string> = {
      'Open': 'chip-open', 'Submitted': 'chip-submitted',
      'Closed': 'chip-closed', 'On Hold': 'chip-pending'
    };
    return map[status] || '';
  }

  getTaskClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'chip-pending', 'In Progress': 'chip-inprogress',
      'Done': 'chip-done', 'Cancelled': 'chip-rejected'
    };
    return map[status] || '';
  }

  getDraftClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'chip-pending', 'Approved': 'chip-approved',
      'Sent': 'chip-sent', 'Rejected': 'chip-rejected'
    };
    return map[status] || '';
  }
}
