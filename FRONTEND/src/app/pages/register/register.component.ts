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
  selector: 'app-register',
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
    <div class="register-wrapper">
      <div class="glass-panel register-card">
        <div class="card-header">
          <h1 class="bold-title">Create Account</h1>
          <p class="subtitle">Join the DKnex AI evolution today</p>
        </div>
        
        <mat-progress-bar *ngIf="loading" mode="indeterminate" class="loader"></mat-progress-bar>
        
        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Username</mat-label>
            <input matInput formControlName="username" placeholder="Choose your ID">
            <mat-icon matPrefix>person</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Email Address</mat-label>
            <input matInput formControlName="email" type="email" placeholder="name@company.com">
            <mat-icon matPrefix>email</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="premium-field">
            <mat-label>Password</mat-label>
            <input matInput formControlName="password" type="password" placeholder="Min. 6 characters">
            <mat-icon matPrefix>lock</mat-icon>
          </mat-form-field>

          <div *ngIf="error" class="error-box">
            <mat-icon>error_outline</mat-icon>
            <span>{{ error }}</span>
          </div>

          <button mat-raised-button class="btn-primary register-btn" [disabled]="registerForm.invalid || loading">
            Create Free Account
          </button>
        </form>

        <div class="card-footer">
          <span>Already member? <a routerLink="/login">Sign In</a></span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .register-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 85vh;
      padding: 20px;
    }
    .register-card {
      width: 100%;
      max-width: 440px;
      padding: 40px;
      border-radius: 24px;
    }
    .card-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .bold-title {
      font-family: 'Outfit', sans-serif;
      font-size: 2.5rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -1px;
      background: var(--accent-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      color: var(--text-secondary);
      margin-top: 8px;
      font-size: 1rem;
    }
    .premium-field {
      width: 100%;
      margin-bottom: 12px;
    }
    .register-btn {
      width: 100%;
      height: 56px;
      font-size: 1.1rem;
      margin-top: 24px;
    }
    .error-box {
      background: rgba(207, 102, 121, 0.1);
      color: #cf6679;
      padding: 12px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 0.9rem;
      border: 1px solid rgba(207, 102, 121, 0.2);
    }
    .card-footer {
      text-align: center;
      margin-top: 32px;
      color: var(--text-secondary);
    }
    .card-footer a {
      color: var(--accent-secondary);
      text-decoration: none;
      font-weight: 700;
      margin-left: 5px;
    }
    .card-footer a:hover {
      text-decoration: underline;
    }
    .loader {
      margin-bottom: 20px;
      border-radius: 10px;
    }
    mat-icon[matPrefix] {
      margin-right: 8px;
      color: var(--text-secondary);
    }
  `]
})
export class RegisterComponent implements OnInit {
  registerForm: FormGroup;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // If the user is already logged in, redirect them immediately to the dashboard
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.error = '';

    this.authService.register(this.registerForm.value).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Registration failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
