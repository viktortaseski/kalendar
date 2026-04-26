import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-settings',
  template: `
    <section class="page">
      <div class="container">
        <h1 class="title">Settings</h1>

        @if (auth.currentUser(); as u) {
          <section class="card">
            <h2 class="card-title">Account</h2>
            <div class="row">
              <span class="label">Full name</span>
              <span class="value">{{ u.fullName }}</span>
            </div>
            <div class="row">
              <span class="label">Email</span>
              <span class="value">{{ u.email }}</span>
            </div>
            @if (u.phone) {
              <div class="row">
                <span class="label">Phone</span>
                <span class="value">{{ u.phone }}</span>
              </div>
            }
          </section>
        }

        <p class="note">Profile editing, password changes, and notification preferences coming soon.</p>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: var(--space-12) 0; }
    .container { max-width: 720px; margin: 0 auto; padding: 0 var(--space-6); }
    .title {
      font-size: clamp(32px, 4.5vw, 48px);
      letter-spacing: -0.03em;
      margin-bottom: var(--space-8);
    }
    .card {
      background: var(--color-bg-elevated);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: var(--space-4);
      letter-spacing: -0.01em;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid var(--color-border);
      gap: var(--space-4);

      &:last-child { border-bottom: none; }
    }
    .label {
      color: var(--color-ink-muted);
      font-size: 14px;
    }
    .value {
      color: var(--color-ink);
      font-weight: 500;
      font-size: 14px;
      text-align: right;
    }
    .note {
      color: var(--color-ink-subtle);
      font-size: 13px;
      margin-top: var(--space-6);
      font-style: italic;
    }
  `],
})
export class Settings {
  protected auth = inject(AuthService);
}
