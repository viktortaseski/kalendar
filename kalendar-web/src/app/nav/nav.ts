import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './nav.html',
  styleUrl: './nav.scss',
})
export class Nav {
  private router = inject(Router);
  protected auth = inject(AuthService);

  menuOpen = signal(false);

  constructor() {
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      takeUntilDestroyed(),
    ).subscribe(() => this.menuOpen.set(false));
  }

  toggleMenu() { this.menuOpen.update((o) => !o); }
  closeMenu() { this.menuOpen.set(false); }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
