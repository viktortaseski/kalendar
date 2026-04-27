import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BusinessService,
  MyJob as MyJobModel,
  UnavailabilityBlock,
  WorkingHourRow,
} from '../services/business.service';

interface DayRow {
  dayOfWeek: number;
  label: string;
  open: boolean;
  startTime: string;
  endTime: string;
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-my-job',
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './my-job.html',
  styleUrl: './my-job.scss',
})
export class MyJob implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private api = inject(BusinessService);
  private destroyRef = inject(DestroyRef);

  slug = '';
  job = signal<MyJobModel | null>(null);
  loading = signal(true);
  pageError = signal<string | null>(null);

  daysGrid = signal<DayRow[]>(this.emptyGrid());
  hoursError = signal<string | null>(null);
  hoursSaving = signal(false);
  hoursSaved = signal(false);

  unavailability = signal<UnavailabilityBlock[]>([]);
  unavailError = signal<string | null>(null);
  unavailForm = this.fb.nonNullable.group({
    startsAt: ['', [Validators.required]],
    endsAt:   ['', [Validators.required]],
    reason:   [''],
  });

  employeeName = computed(() => this.job()?.employee_name ?? '');
  businessName = computed(() => this.job()?.business_name ?? '');

  ngOnInit() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const slug = params.get('slug');
        if (!slug) {
          this.pageError.set('Missing slug');
          this.loading.set(false);
          return;
        }
        this.slug = slug;
        this.resetForSlugChange();
        this.loadJob();
      });
  }

  private resetForSlugChange() {
    this.loading.set(true);
    this.pageError.set(null);
    this.job.set(null);
    this.daysGrid.set(this.emptyGrid());
    this.unavailability.set([]);
    this.hoursError.set(null);
    this.hoursSaved.set(false);
    this.unavailError.set(null);
    this.unavailForm.reset({ startsAt: '', endsAt: '', reason: '' });
  }

  private loadJob() {
    this.api.myJobs().subscribe({
      next: (rows) => {
        const match = rows.find((r) => r.business_slug === this.slug);
        if (!match) {
          this.router.navigateByUrl('/dashboard');
          return;
        }
        this.job.set(match);
        this.loading.set(false);
        this.loadHours(match.employee_id);
        this.loadUnavailability(match.employee_id);
      },
      error: () => {
        this.pageError.set('Could not load job');
        this.loading.set(false);
      },
    });
  }

  // ─── Working hours ───────────────────────────────────────
  private loadHours(employeeId: number) {
    this.api.getWorkingHours(this.slug, employeeId).subscribe({
      next: (rows) => this.daysGrid.set(this.gridFromRows(rows)),
      error: () => this.daysGrid.set(this.emptyGrid()),
    });
  }

  toggleDay(idx: number) {
    this.daysGrid.update((rows) => {
      const next = [...rows];
      next[idx] = { ...next[idx], open: !next[idx].open };
      return next;
    });
    this.hoursSaved.set(false);
  }

  updateTime(idx: number, field: 'startTime' | 'endTime', value: string) {
    this.daysGrid.update((rows) => {
      const next = [...rows];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
    this.hoursSaved.set(false);
  }

  saveHours() {
    const job = this.job();
    if (!job) return;
    this.hoursError.set(null);
    this.hoursSaving.set(true);
    this.hoursSaved.set(false);

    const payload = this.daysGrid()
      .filter((d) => d.open)
      .map((d) => ({ dayOfWeek: d.dayOfWeek, startTime: d.startTime, endTime: d.endTime }));

    for (const h of payload) {
      if (h.startTime >= h.endTime) {
        this.hoursError.set(`End time must be after start time on ${DAY_LABELS[h.dayOfWeek]}`);
        this.hoursSaving.set(false);
        return;
      }
    }

    this.api.putWorkingHours(this.slug, job.employee_id, payload).subscribe({
      next: (rows) => {
        this.daysGrid.set(this.gridFromRows(rows));
        this.hoursSaving.set(false);
        this.hoursSaved.set(true);
      },
      error: (err) => {
        this.hoursError.set(err?.error?.error || 'Failed to save hours');
        this.hoursSaving.set(false);
      },
    });
  }

  // ─── Unavailability ──────────────────────────────────────
  private loadUnavailability(employeeId: number) {
    this.api.listUnavailability(this.slug, employeeId).subscribe({
      next: (rows) => this.unavailability.set(rows),
      error: (err) => this.unavailError.set(err?.error?.error || 'Failed to load unavailability'),
    });
  }

  addUnavailability() {
    const job = this.job();
    if (!job) return;
    this.unavailError.set(null);
    if (this.unavailForm.invalid) {
      this.unavailForm.markAllAsTouched();
      return;
    }
    const v = this.unavailForm.getRawValue();
    const start = new Date(v.startsAt);
    const end   = new Date(v.endsAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      this.unavailError.set('Invalid date/time');
      return;
    }
    if (end <= start) {
      this.unavailError.set('End must be after start');
      return;
    }
    this.api
      .createUnavailability(this.slug, job.employee_id, {
        startsAt: start.toISOString(),
        endsAt:   end.toISOString(),
        reason:   v.reason || undefined,
      })
      .subscribe({
        next: (created) => {
          this.unavailability.update((rows) => [created, ...rows]);
          this.unavailForm.reset({ startsAt: '', endsAt: '', reason: '' });
        },
        error: (err) => this.unavailError.set(err?.error?.error || 'Failed to add unavailability'),
      });
  }

  removeUnavailability(u: UnavailabilityBlock) {
    const job = this.job();
    if (!job) return;
    if (!confirm('Remove this block?')) return;
    this.api.deleteUnavailability(this.slug, job.employee_id, u.id).subscribe({
      next: () => this.unavailability.update((rows) => rows.filter((r) => r.id !== u.id)),
      error: (err) => this.unavailError.set(err?.error?.error || 'Failed to delete'),
    });
  }

  // ─── Helpers ─────────────────────────────────────────────
  private emptyGrid(): DayRow[] {
    const order = [1, 2, 3, 4, 5, 6, 0];
    return order.map((d) => ({
      dayOfWeek: d,
      label: DAY_LABELS[d],
      open: false,
      startTime: '09:00',
      endTime: '17:00',
    }));
  }

  private gridFromRows(rows: WorkingHourRow[]): DayRow[] {
    const grid = this.emptyGrid();
    for (const r of rows) {
      const idx = grid.findIndex((g) => g.dayOfWeek === r.day_of_week);
      if (idx === -1) continue;
      grid[idx] = {
        ...grid[idx],
        open: true,
        startTime: r.start_time.slice(0, 5),
        endTime: r.end_time.slice(0, 5),
      };
    }
    return grid;
  }
}
