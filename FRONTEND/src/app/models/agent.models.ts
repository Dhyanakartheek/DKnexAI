export interface Agent {
  id: number;
  name: string;
  description: string;
  type: string; // 'Chat' | 'Automation' | 'Coding'
  status: boolean;
  lastUsedTime?: string;  // matches backend field name
  capabilities?: string[];
  agentEmail?: string;
}

export interface ExecuteRequest {
  input: string;
}

export interface ExecuteResponse {
  output: string;
  agentName: string;
  timestamp: string;
}

export interface AgentLog {
  id: number;
  agentId: number;
  userId: number;
  agent?: { id: number; name: string; type: string };
  input: string;
  output: string;
  timestamp: string;
}
