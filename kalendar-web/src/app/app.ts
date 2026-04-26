import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { Nav } from './nav/nav';
import { Sidebar } from './sidebar/sidebar';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Nav, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('kalendar');
  protected auth = inject(AuthService);
  private router = inject(Router);

  mobileNavOpen = signal(false);

  constructor() {
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => this.mobileNavOpen.set(false));
  }

  toggleMobileNav() { this.mobileNavOpen.update((o) => !o); }
  closeMobileNav() { this.mobileNavOpen.set(false); }
}
