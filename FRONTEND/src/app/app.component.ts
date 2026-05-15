import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule, MatIconModule],
  template: `
    <mat-toolbar class="navbar glass-panel">
      <div class="logo-container" routerLink="/" style="cursor: pointer;">
        <div class="logo-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="url(#logo-grad)" />
            <path d="M2 17L12 22L22 17" stroke="url(#logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="url(#logo-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            <defs>
              <linearGradient id="logo-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stop-color="#6366f1" />
                <stop offset="1" stop-color="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="logo-text">DKNEX AI</span>
      </div>
      <span class="spacer"></span>
      <div class="nav-links">
        <ng-container *ngIf="authService.isLoggedIn()">
          <button mat-button routerLink="/dashboard" routerLinkActive="active-link" class="nav-btn">Dashboard</button>
          <button mat-button routerLink="/logs" routerLinkActive="active-link" class="nav-btn">Activity</button>
          <div class="profile-section">
            <div class="user-avatar">
              <mat-icon>account_circle</mat-icon>
            </div>
            <button mat-icon-button (click)="logout()" class="logout-btn" title="Logout">
              <mat-icon>power_settings_new</mat-icon>
            </button>
          </div>
        </ng-container>
        <ng-container *ngIf="!authService.isLoggedIn()">
          <button mat-button routerLink="/login" class="nav-btn">Login</button>
          <button mat-raised-button class="btn-primary" routerLink="/register">Get Started</button>
        </ng-container>
      </div>
    </mat-toolbar>

    <main class="content-area">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .navbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(5, 5, 5, 0.8) !important;
      padding: 0 5%;
      height: 80px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-icon {
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .logo-text {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 1.5rem;
      letter-spacing: -0.5px;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      line-height: 1.2;
    }
    .spacer {
      flex: 1 1 auto;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .nav-btn {
      font-weight: 600;
      color: var(--text-secondary) !important;
    }
    .nav-btn:hover {
      color: var(--text-primary) !important;
    }
    .active-link {
      color: var(--accent-indigo) !important;
    }
    .profile-section {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-left: 15px;
      border-left: 1px solid var(--glass-border);
    }
    .user-avatar {
      color: var(--text-muted);
    }
    .logout-btn {
      color: var(--text-muted);
      transition: var(--transition-smooth);
    }
    .logout-btn:hover {
      color: var(--accent-pink);
    }
    .content-area {
      padding: 0; /* Changed to 0 to allow pages to control padding */
      min-height: calc(100vh - 80px);
      background-color: var(--bg-primary);
    }
  `]
})
export class AppComponent {
  constructor(public authService: AuthService, private router: Router) {}

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
