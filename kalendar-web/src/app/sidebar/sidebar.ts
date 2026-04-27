import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { BusinessService, MyBusiness, MyJob } from '../services/business.service';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar implements OnInit {
  private router = inject(Router);
  private bizService = inject(BusinessService);
  protected auth = inject(AuthService);

  open = input<boolean>(false);
  myBusinesses = signal<MyBusiness[]>([]);
  myJobs = signal<MyJob[]>([]);

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.bizService.mine().subscribe({
      next: (rows) => this.myBusinesses.set(rows),
      error: () => this.myBusinesses.set([]),
    });
    this.bizService.myJobs().subscribe({
      next: (rows) => this.myJobs.set(rows),
      error: () => this.myJobs.set([]),
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigateByUrl('/');
  }
}
