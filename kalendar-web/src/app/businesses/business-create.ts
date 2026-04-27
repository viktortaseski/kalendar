import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { map, switchMap } from 'rxjs';
import { BusinessService } from '../services/business.service';
import { Plan, PlanService } from '../services/plan.service';

type Step = 1 | 2;

interface DayRow {
  dayOfWeek: number;
  label: string;
  open: boolean;
  startTime: string;
  endTime: string;
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_ORDER  = [1, 2, 3, 4, 5, 6, 0]; // Mon-first

@Component({
  selector: 'app-business-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './business-create.html',
  styleUrl: './business-create.scss',
})
export class BusinessCreate implements OnInit {
  private fb           = inject(FormBuilder);
  private router       = inject(Router);
  private plansApi     = inject(PlanService);
  private businessesApi = inject(BusinessService);

  plans        = signal<Plan[]>([]);
  loadingPlans = signal(true);
  submitting   = signal(false);
  errorMessage = signal<string | null>(null);
  hoursError   = signal<string | null>(null);
  currentStep  = signal<Step>(1);

  // ─── Step 1: plan + business details + calendar ───────────
  form = this.fb.nonNullable.group({
    name:                ['', [Validators.required, Validators.minLength(2)]],
    description:         [''],
    planId:              [0, [Validators.required, Validators.min(1)]],
    timezone:            ['UTC'],
    slotDurationMinutes: [30, [Validators.required, Validators.min(5)]],
  });

  // ─── Step 2: first employee + hours ───────────────────────
  employeeForm = this.fb.nonNullable.group({
    name:  ['', [Validators.required, Validators.minLength(2)]],
    email: [''],
  });
  daysGrid = signal<DayRow[]>(this.emptyGrid());

  // ─── Step 2: first service ────────────────────────────────
  serviceForm = this.fb.nonNullable.group({
    name:            ['', [Validators.required, Validators.minLength(2)]],
    durationMinutes: [30, [Validators.required, Validators.min(5)]],
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

  goToStep2() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.currentStep.set(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToStep1() {
    this.currentStep.set(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleDay(idx: number) {
    this.daysGrid.update((rows) => {
      const next = [...rows];
      next[idx] = { ...next[idx], open: !next[idx].open };
      return next;
    });
  }

  updateTime(idx: number, field: 'startTime' | 'endTime', value: string) {
    this.daysGrid.update((rows) => {
      const next = [...rows];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  }

  onSubmit() {
    this.errorMessage.set(null);
    this.hoursError.set(null);

    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }

    const openDays = this.daysGrid().filter((d) => d.open);
    if (openDays.length === 0) {
      this.hoursError.set('Set working hours for at least one day.');
      return;
    }
    for (const d of openDays) {
      if (d.startTime >= d.endTime) {
        this.hoursError.set(`End time must be after start time on ${d.label}.`);
        return;
      }
    }

    this.submitting.set(true);
    const bizPayload = this.form.getRawValue();
    const empPayload = this.employeeForm.getRawValue();
    const svcPayload = this.serviceForm.getRawValue();
    const hours = openDays.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: d.startTime,
      endTime:   d.endTime,
    }));

    this.businessesApi.create(bizPayload).pipe(
      switchMap((b) =>
        this.businessesApi
          .createEmployee(b.slug, { name: empPayload.name, email: empPayload.email || undefined })
          .pipe(map((employee) => ({ business: b, employee }))),
      ),
      switchMap(({ business, employee }) =>
        this.businessesApi
          .putWorkingHours(business.slug, employee.id, hours)
          .pipe(map(() => business)),
      ),
      switchMap((business) =>
        this.businessesApi
          .createService(business.slug, { name: svcPayload.name, durationMinutes: svcPayload.durationMinutes })
          .pipe(map(() => business)),
      ),
    ).subscribe({
      next:  (business) => this.router.navigate(['/businesses', business.slug, 'manage']),
      error: (err) => {
        this.submitting.set(false);
        this.errorMessage.set(err?.error?.error || 'Failed to create business. Please try again.');
      },
    });
  }

  private emptyGrid(): DayRow[] {
    return DAY_ORDER.map((d) => ({
      dayOfWeek: d,
      label:     DAY_LABELS[d],
      open:      false,
      startTime: '09:00',
      endTime:   '17:00',
    }));
  }
}
