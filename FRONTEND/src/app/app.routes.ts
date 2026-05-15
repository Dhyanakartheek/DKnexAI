import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { AgentDetailComponent } from './pages/agent-detail/agent-detail.component';
import { LogsComponent } from './pages/logs/logs.component';
import { CodeWorkspaceComponent } from './components/code-workspace/code-workspace.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'agent/:id', component: AgentDetailComponent, canActivate: [authGuard] },
  { path: 'workspace', component: CodeWorkspaceComponent, canActivate: [authGuard] },
  { path: 'logs', component: LogsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
