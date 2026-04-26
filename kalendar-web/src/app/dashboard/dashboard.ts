import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { BusinessService, MyBusiness } from '../services/business.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private businesses = inject(BusinessService);
  protected auth = inject(AuthService);

  myBusinesses = signal<MyBusiness[]>([]);

  ngOnInit() {
    this.businesses.mine().subscribe({
      next: (rows) => this.myBusinesses.set(rows),
      error: () => this.myBusinesses.set([]),
    });
  }
}
