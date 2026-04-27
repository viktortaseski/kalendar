import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  BusinessService,
  BusinessDetail as BusinessDetailModel,
  BusinessAppointment,
  Service,
  Employee,
  WorkingHourRow,
} from '../services/business.service';
import { AuthService } from '../services/auth.service';
import { PlanService, Plan } from '../services/plan.service';

type Tab = 'appointments' | 'staff' | 'settings' | 'plans' | 'billing';

interface DayRow {
  dayOfWeek: number;
  label: string;
  open: boolean;
  startTime: string;
  endTime: string;
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

@Component({
  selector: 'app-business-manage',
  imports: [ReactiveFormsModule, RouterLink, DecimalPipe, DatePipe],
  templateUrl: './business-manage.html',
  styleUrl: './business-manage.scss',
})
export class BusinessManage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private api = inject(BusinessService);
  private auth = inject(AuthService);
  private planService = inject(PlanService);

  slug = '';
  business = signal<BusinessDetailModel | null>(null);
  loading = signal(true);
  pageError = signal<string | null>(null);

  activeTab = signal<Tab>('appointments');

  // ─── Appointments ─────────────────────────────────────────
  appointments = signal<BusinessAppointment[]>([]);
  appointmentsLoading = signal(false);
  appointmentsError = signal<string | null>(null);

  // ─── Services ────────────────────────────────────────────
  services = signal<Service[]>([]);
  serviceError = signal<string | null>(null);
  serviceForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    durationMinutes: [30, [Validators.required, Validators.min(5)]],
    priceCents: [0, [Validators.min(0)]],
    description: [''],
  });

  // ─── Employees ───────────────────────────────────────────
  employees = signal<Employee[]>([]);
  employeeError = signal<string | null>(null);
  employeeForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: [''],
  });

  // ─── Working hours ───────────────────────────────────────
  selectedEmployeeId = signal<number | null>(null);
  daysGrid = signal<DayRow[]>(this.emptyGrid());
  hoursError = signal<string | null>(null);
  hoursSaving = signal(false);
  hoursSaved = signal(false);

  selectedEmployee = computed(() =>
    this.employees().find((e) => e.id === this.selectedEmployeeId()) ?? null,
  );

  // ─── Settings ────────────────────────────────────────────
  settingsForm = this.fb.nonNullable.group({
    timezone: ['UTC', [Validators.required]],
    slotDurationMinutes: [30, [Validators.required, Validators.min(5)]],
  });
  settingsSaving = signal(false);
  settingsSaved = signal(false);
  settingsError = signal<string | null>(null);

  // ─── Plans ───────────────────────────────────────────────
  plans = signal<Plan[]>([]);
  selectedPlanId = signal<number | null>(null);
  planSaving = signal(false);
  planSaved = signal(false);
  planError = signal<string | null>(null);

  isPlanUnchanged = computed(() => {
    const biz = this.business();
    const pid = this.selectedPlanId();
    if (!biz || !pid) return true;
    return this.plans().find((p) => p.id === pid)?.type === biz.plan_type;
  });

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.pageError.set('Missing slug');
      this.loading.set(false);
      return;
    }
    this.slug = slug;

    this.api.getBySlug(slug).subscribe({
      next: (b) => {
        const me = this.auth.currentUser();
        if (!me || b.owner_id !== me.id) {
          this.router.navigateByUrl(`/businesses/${slug}`);
          return;
        }
        this.business.set(b);
        this.loading.set(false);
        this.settingsForm.patchValue({
          timezone: b.timezone,
          slotDurationMinutes: b.slot_duration_minutes,
        });
        this.loadAppointments();
        this.refreshServices();
        this.refreshEmployees();
        this.loadPlans(b.plan_type);
      },
      error: () => {
        this.pageError.set('Could not load business');
        this.loading.set(false);
      },
    });
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
  }

  // ─── Appointments ─────────────────────────────────────────
  loadAppointments() {
    this.appointmentsLoading.set(true);
    this.appointmentsError.set(null);
    this.api.getBusinessAppointments(this.slug).subscribe({
      next: (rows) => {
        this.appointments.set(rows);
        this.appointmentsLoading.set(false);
      },
      error: (err) => {
        this.appointmentsError.set(err?.error?.error || 'Failed to load appointments');
        this.appointmentsLoading.set(false);
      },
    });
  }

  // ─── Services ────────────────────────────────────────────
  refreshServices() {
    this.api.listServices(this.slug).subscribe({
      next: (rows) => this.services.set(rows),
      error: (err) => this.serviceError.set(err?.error?.error || 'Failed to load services'),
    });
  }

  addService() {
    this.serviceError.set(null);
    if (this.serviceForm.invalid) {
      this.serviceForm.markAllAsTouched();
      return;
    }
    const v = this.serviceForm.getRawValue();
    this.api
      .createService(this.slug, {
        name: v.name,
        durationMinutes: v.durationMinutes,
        priceCents: v.priceCents > 0 ? v.priceCents : undefined,
        description: v.description || undefined,
      })
      .subscribe({
        next: (created) => {
          this.services.update((rows) => [...rows, created]);
          this.serviceForm.reset({ name: '', durationMinutes: 30, priceCents: 0, description: '' });
        },
        error: (err) => this.serviceError.set(err?.error?.error || 'Failed to add service'),
      });
  }

  removeService(s: Service) {
    if (!confirm(`Delete "${s.name}"?`)) return;
    this.api.deleteService(this.slug, s.id).subscribe({
      next: () => this.services.update((rows) => rows.filter((r) => r.id !== s.id)),
      error: (err) => this.serviceError.set(err?.error?.error || 'Failed to delete service'),
    });
  }

  // ─── Employees ───────────────────────────────────────────
  refreshEmployees() {
    this.api.listEmployees(this.slug).subscribe({
      next: (rows) => {
        this.employees.set(rows);
        if (rows.length > 0 && this.selectedEmployeeId() === null) {
          this.selectEmployee(rows[0].id);
        }
      },
      error: (err) => this.employeeError.set(err?.error?.error || 'Failed to load employees'),
    });
  }

  addEmployee() {
    this.employeeError.set(null);
    if (this.employeeForm.invalid) {
      this.employeeForm.markAllAsTouched();
      return;
    }
    const v = this.employeeForm.getRawValue();
    this.api
      .createEmployee(this.slug, { name: v.name, email: v.email || undefined })
      .subscribe({
        next: (created) => {
          this.employees.update((rows) => [...rows, created]);
          this.employeeForm.reset({ name: '', email: '' });
          if (this.selectedEmployeeId() === null) this.selectEmployee(created.id);
        },
        error: (err) => this.employeeError.set(err?.error?.error || 'Failed to add employee'),
      });
  }

  removeEmployee(e: Employee) {
    if (!confirm(`Delete "${e.name}"?`)) return;
    this.api.deleteEmployee(this.slug, e.id).subscribe({
      next: () => {
        this.employees.update((rows) => rows.filter((r) => r.id !== e.id));
        if (this.selectedEmployeeId() === e.id) {
          const remaining = this.employees();
          this.selectedEmployeeId.set(remaining[0]?.id ?? null);
          if (remaining[0]) this.loadHoursForEmployee(remaining[0].id);
          else this.daysGrid.set(this.emptyGrid());
        }
      },
      error: (err) => this.employeeError.set(err?.error?.error || 'Failed to delete employee'),
    });
  }

  // ─── Working hours ───────────────────────────────────────
  selectEmployee(id: number) {
    this.selectedEmployeeId.set(id);
    this.hoursSaved.set(false);
    this.loadHoursForEmployee(id);
  }

  loadHoursForEmployee(id: number) {
    this.api.getWorkingHours(this.slug, id).subscribe({
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
    const empId = this.selectedEmployeeId();
    if (empId === null) return;

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

    this.api.putWorkingHours(this.slug, empId, payload).subscribe({
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

  // ─── Settings ────────────────────────────────────────────
  saveSettings() {
    this.settingsError.set(null);
    this.settingsSaved.set(false);
    if (this.settingsForm.invalid) {
      this.settingsForm.markAllAsTouched();
      return;
    }
    this.settingsSaving.set(true);
    const v = this.settingsForm.getRawValue();
    this.api
      .updateSettings(this.slug, { timezone: v.timezone, slotDurationMinutes: v.slotDurationMinutes })
      .subscribe({
        next: (updated) => {
          this.business.update((b) =>
            b
              ? { ...b, timezone: updated.timezone, slot_duration_minutes: updated.slot_duration_minutes }
              : b,
          );
          this.settingsSaving.set(false);
          this.settingsSaved.set(true);
        },
        error: (err) => {
          this.settingsError.set(err?.error?.error || 'Failed to save settings');
          this.settingsSaving.set(false);
        },
      });
  }

  // ─── Plans ───────────────────────────────────────────────
  loadPlans(currentPlanType: string) {
    this.planService.list().subscribe({
      next: (rows) => {
        this.plans.set(rows);
        const current = rows.find((p) => p.type === currentPlanType);
        if (current) this.selectedPlanId.set(current.id);
      },
    });
  }

  selectPlan(id: number) {
    this.selectedPlanId.set(id);
    this.planSaved.set(false);
  }

  confirmPlanChange() {
    const planId = this.selectedPlanId();
    if (!planId) return;
    this.planError.set(null);
    this.planSaving.set(true);
    this.planSaved.set(false);
    this.api.changePlan(this.slug, planId).subscribe({
      next: () => {
        const newPlan = this.plans().find((p) => p.id === planId);
        if (newPlan) {
          this.business.update((b) => (b ? { ...b, plan_type: newPlan.type } : b));
        }
        this.planSaving.set(false);
        this.planSaved.set(true);
      },
      error: (err) => {
        this.planError.set(err?.error?.error || 'Failed to change plan');
        this.planSaving.set(false);
      },
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
