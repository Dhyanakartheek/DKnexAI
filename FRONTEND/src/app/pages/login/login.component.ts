import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressBarModule,
    MatIconModule
  ],
  template: `
    <div class="login-wrapper">
      <div class="glass-panel login-card">
        <div class="card-header">
          <h1 class="bold-title gradient-text">Welcome Back</h1>
          <p class="subtitle">Access your DKnex AI control center</p>
        </div>
        
        <mat-progress-bar *ngIf="loading" mode="indeterminate" class="loader"></mat-progress-bar>
        
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" placeholder="e.g. alex_dknex">
            <mat-icon matPrefix>person</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" type="password" placeholder="••••••••">
            <mat-icon matPrefix>lock</mat-icon>
          </mat-form-field>

          <div *ngIf="error" class="error-box">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error }}</span>
          </div>

          <button mat-raised-button class="btn-primary login-btn" [disabled]="loginForm.invalid || loading">
            Sign In
          </button>
        </form>

        <div class="card-footer">
          <span>New here? <a routerLink="/register">Create Premium Account</a></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 90vh;
      padding: 20px;
    }
    .login-card {
      width: 100%;
      max-width: 440px;
      padding: 48px;
      border-radius: 28px;
    }
    .card-header {
      text-align: center;
      margin-bottom: 40px;
    }
    .bold-title {
      font-size: 2.8rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -1.5px;
      line-height: 1.1;
    }
    .subtitle {
      color: var(--text-secondary);
      margin-top: 12px;
      font-size: 1.1rem;
      font-weight: 400;
    }
    .premium-field {
      width: 100%;
    }
    .login-btn {
      width: 100%;
      height: 60px;
      font-size: 1.1rem;
      margin-top: 24px;
    }
    .error-box {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      padding: 14px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
      font-size: 0.95rem;
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    .card-footer {
      text-align: center;
      margin-top: 40px;
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
    .card-footer a {
      color: var(--accent-indigo);
      text-decoration: none;
      font-weight: 600;
      transition: var(--transition-smooth);
    }
    .card-footer a:hover {
      color: var(--accent-pink);
    }
    .loader {
      margin-bottom: 24px;
      border-radius: 10px;
      height: 4px;
    }
    mat-icon[matPrefix] {
      margin-right: 12px;
      color: var(--text-muted);
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
  `]

})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  ngOnInit() {
    // If the user is already logged in, redirect them immediately to the dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.error = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = 'Invalid username or password';
        this.loading = false;
      }
    });
  }
}
