import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Agent, ExecuteRequest, ExecuteResponse, AgentLog } from '../models/agent.models';

@Injectable({
  providedIn: 'root'
})
export class AgentService {
  private readonly BASE_URL = 'http://localhost:8081/api';
  private readonly API_URL = `${this.BASE_URL}/agents`;
  private readonly LOGS_URL = `${this.BASE_URL}/logs`;

  constructor(private http: HttpClient) {}

  getAllAgents(): Observable<Agent[]> {
    return this.http.get<Agent[]>(this.API_URL);
  }

  getAgentById(id: number): Observable<Agent> {
    return this.http.get<Agent>(`${this.API_URL}/${id}`);
  }

  createAgent(agent: Partial<Agent>): Observable<Agent> {
    return this.http.post<Agent>(this.API_URL, agent);
  }

  executeAgent(id: number, input: string): Observable<ExecuteResponse> {
    const request: ExecuteRequest = { input };
    return this.http.post<ExecuteResponse>(`${this.API_URL}/${id}/execute`, request);
  }

  getLogsByAgentId(id: number): Observable<AgentLog[]> {
    return this.http.get<AgentLog[]>(`${this.API_URL}/${id}/logs`);
  }

  getAllLogs(): Observable<AgentLog[]> {
    return this.http.get<AgentLog[]>(this.LOGS_URL);
  }
}
