import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface EmailUser {
  id: string;
  name: string;
  email: string;
  role: string;
  skills: string | null;
  is_active: boolean;
}

export interface EmailLead {
  id: number;
  lead_id: string;
  type: string;
  client_name: string;
  project_name: string;
  role: string;
  skills: string;
  experience: string;
  submission_deadline: string | null;
  contact_person: string;
  contact_email: string;
  email_ref: string;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailTask {
  id: string;
  lead_id: string | null;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface EmailDraft {
  id: string;
  lead_id: string;
  to_email: string;
  subject: string;
  body: string;
  draft_type: string;
  status: string;
  created_at: string;
  sent_at: string | null;
}

export interface DashboardStats {
  total_leads: number;
  open_leads: number;
  submitted_leads: number;
  pending_tasks: number;
  pending_drafts: number;
  emails_processed_today: number;
}

@Injectable({
  providedIn: 'root'
})
export class EmailAgentService {
  private readonly BASE_URL = 'http://localhost:8080/api';
  private tokenSubject = new BehaviorSubject<string | null>(
    localStorage.getItem('emailAgentToken')
  );
  private userSubject = new BehaviorSubject<EmailUser | null>(
    JSON.parse(localStorage.getItem('emailAgentUser') || 'null')
  );

  constructor(private http: HttpClient) {}

  get token$(): Observable<string | null> {
    return this.tokenSubject.asObservable();
  }

  get currentUser(): EmailUser | null {
    return this.userSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!this.tokenSubject.value;
  }

  get isAdmin(): boolean {
    return this.userSubject.value?.role === 'admin';
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.tokenSubject.value}`
    });
  }

  login(email: string, password: string): Observable<any> {
    const body = new URLSearchParams();
    body.set('username', email);
    body.set('password', password);
    return this.http.post<any>(`${this.BASE_URL}/auth/login`, body.toString(), {
      headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' })
    }).pipe(
      tap(res => {
        localStorage.setItem('emailAgentToken', res.access_token);
        localStorage.setItem('emailAgentUser', JSON.stringify(res.user));
        this.tokenSubject.next(res.access_token);
        this.userSubject.next(res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('emailAgentToken');
    localStorage.removeItem('emailAgentUser');
    this.tokenSubject.next(null);
    this.userSubject.next(null);
  }

  getMe(): Observable<EmailUser> {
    return this.http.get<EmailUser>(`${this.BASE_URL}/auth/me`, { headers: this.getHeaders() });
  }

  // ── Dashboard Stats ─────────────────────────────────────
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.BASE_URL}/reports/dashboard`, { headers: this.getHeaders() });
  }

  // ── Leads ────────────────────────────────────────────────
  getLeads(status?: string): Observable<EmailLead[]> {
    const params: any = {};
    if (status) params['status'] = status;
    return this.http.get<EmailLead[]>(`${this.BASE_URL}/leads`, { headers: this.getHeaders(), params });
  }

  updateLead(leadId: string, data: Partial<EmailLead>): Observable<EmailLead> {
    return this.http.patch<EmailLead>(`${this.BASE_URL}/leads/${leadId}`, data, { headers: this.getHeaders() });
  }

  deleteLead(leadId: string): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/leads/${leadId}`, { headers: this.getHeaders() });
  }

  // ── Tasks ─────────────────────────────────────────────────
  getTasks(): Observable<EmailTask[]> {
    return this.http.get<EmailTask[]>(`${this.BASE_URL}/tasks`, { headers: this.getHeaders() });
  }

  updateTask(taskId: string, data: Partial<EmailTask>): Observable<EmailTask> {
    return this.http.patch<EmailTask>(`${this.BASE_URL}/tasks/${taskId}`, data, { headers: this.getHeaders() });
  }

  // ── Drafts ────────────────────────────────────────────────
  getDrafts(status?: string): Observable<EmailDraft[]> {
    const params: any = {};
    if (status) params['status'] = status;
    return this.http.get<EmailDraft[]>(`${this.BASE_URL}/drafts`, { headers: this.getHeaders(), params });
  }

  approveDraft(draftId: string, action: 'approve' | 'reject'): Observable<EmailDraft> {
    return this.http.post<EmailDraft>(
      `${this.BASE_URL}/drafts/${draftId}/action`,
      { action },
      { headers: this.getHeaders() }
    );
  }

  // ── Users (Admin) ─────────────────────────────────────────
  getUsers(): Observable<EmailUser[]> {
    return this.http.get<EmailUser[]>(`${this.BASE_URL}/auth/users`, { headers: this.getHeaders() });
  }

  createUser(data: { name: string; email: string; password: string; role: string; skills?: string }): Observable<EmailUser> {
    return this.http.post<EmailUser>(`${this.BASE_URL}/auth/register`, data, { headers: this.getHeaders() });
  }

  updateUser(userId: string, data: any): Observable<EmailUser> {
    return this.http.patch<EmailUser>(`${this.BASE_URL}/auth/users/${userId}`, data, { headers: this.getHeaders() });
  }

  deactivateUser(userId: string): Observable<any> {
    return this.http.delete(`${this.BASE_URL}/auth/users/${userId}`, { headers: this.getHeaders() });
  }

  // ── Reports ───────────────────────────────────────────────
  downloadExcel(): void {
    const token = this.tokenSubject.value;
    window.open(`${this.BASE_URL}/reports/excel?token=${token}`, '_blank');
  }

  downloadPdf(): void {
    const token = this.tokenSubject.value;
    window.open(`${this.BASE_URL}/reports/pdf?token=${token}`, '_blank');
  }
}
