import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject, switchMap } from 'rxjs';
import { BusinessService, BusinessSummary } from '../services/business.service';

@Component({
  selector: 'app-businesses',
  imports: [FormsModule, RouterLink],
  templateUrl: './businesses.html',
  styleUrl: './businesses.scss',
})
export class Businesses implements OnInit {
  private businesses = inject(BusinessService);

  query = '';
  results = signal<BusinessSummary[]>([]);
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  private search$ = new Subject<string>();

  ngOnInit() {
    this.search$
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          this.loading.set(true);
          return this.businesses.list(q);
        })
      )
      .subscribe({
        next: (rows) => {
          this.results.set(rows);
          this.loading.set(false);
          this.errorMessage.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err?.error?.error || 'Failed to load businesses');
        },
      });

    this.search$.next('');
  }

  onQueryChange(value: string) {
    this.query = value;
    this.search$.next(value);
  }
}
