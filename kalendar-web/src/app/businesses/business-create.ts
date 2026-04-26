import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { BusinessService } from '../services/business.service';
import { Plan, PlanService } from '../services/plan.service';

@Component({
  selector: 'app-business-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './business-create.html',
  styleUrl: './business-create.scss',
})
export class BusinessCreate implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private plansApi = inject(PlanService);
  private businessesApi = inject(BusinessService);

  plans = signal<Plan[]>([]);
  loadingPlans = signal(true);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    planId: [0, [Validators.required, Validators.min(1)]],
    timezone: ['UTC'],
    slotDurationMinutes: [30, [Validators.required, Validators.min(5)]],
  });

  ngOnInit() {
    this.plansApi.list().subscribe({
      next: (rows) => {
        this.plans.set(rows);
        this.loadingPlans.set(false);
        const first = rows[0];
        if (first) this.form.patchValue({ planId: first.id });
      },
      error: () => this.loadingPlans.set(false),
    });
  }

  selectPlan(id: number) {
    this.form.patchValue({ planId: id });
  }

  onSubmit() {
    this.errorMessage.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const payload = this.form.getRawValue();

    this.businessesApi.create(payload).subscribe({
      next: (b) => this.router.navigate(['/businesses', b.slug]),
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.error || 'Failed to create business');
      },
    });
  }
}
