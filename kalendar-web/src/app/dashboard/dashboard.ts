import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import {
  BusinessAppointment,
  BusinessService,
  MyBusiness,
  MyJob,
} from '../services/business.service';
import { AppointmentsService, Appointment } from '../services/appointments.service';
import { NotificationsService } from '../services/notifications.service';

interface DayAppointment {
  id: number;
  customer_name: string;
  service_name: string | null;
  employee_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  business_name: string;
  link: (string | number)[];
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private businesses = inject(BusinessService);
  private appointmentsApi = inject(AppointmentsService);
  protected auth = inject(AuthService);
  protected notifications = inject(NotificationsService);

  myBusinesses = signal<MyBusiness[]>([]);
  myJobs = signal<MyJob[]>([]);
  todayAppointments = signal<DayAppointment[]>([]);
  nextCustomerBooking = signal<Appointment | null>(null);

  todayCount = computed(() => this.todayAppointments().length);
  workplaceCount = computed(() => this.myBusinesses().length + this.myJobs().length);
  hasWorkplaces = computed(() => this.workplaceCount() > 0);

  todayLabel = computed(() =>
    new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
  );

  ngOnInit() {
    this.businesses.mine().subscribe({
      next: (rows) => {
        this.myBusinesses.set(rows);
        rows.forEach((b) => this.loadOwnerAppointments(b));
      },
    });

    this.businesses.myJobs().subscribe({
      next: (rows) => {
        this.myJobs.set(rows);
        rows.forEach((j) => this.loadEmployeeAppointments(j));
      },
    });

    this.notifications.refreshUnreadCount().subscribe({ error: () => {} });

    const userId = this.auth.currentUser()?.id;
    if (userId) {
      this.appointmentsApi.listAppointments(userId).subscribe({
        next: (rows) => {
          const now = Date.now();
          const next = rows
            .filter((a) => new Date(a.starts_at).getTime() >= now)
            .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())[0];
          this.nextCustomerBooking.set(next ?? null);
        },
        error: () => this.nextCustomerBooking.set(null),
      });
    }
  }

  private loadOwnerAppointments(b: MyBusiness) {
    this.businesses.getBusinessAppointments(b.slug).subscribe({
      next: (rows) =>
        this.mergeToday(rows, b.name, ['/businesses', b.slug, 'manage']),
      error: () => {},
    });
  }

  private loadEmployeeAppointments(j: MyJob) {
    this.businesses.getEmployeeAppointments(j.business_slug, j.employee_id).subscribe({
      next: (rows) =>
        this.mergeToday(rows, j.business_name, ['/my-jobs', j.business_slug]),
      error: () => {},
    });
  }

  private mergeToday(
    rows: BusinessAppointment[],
    businessName: string,
    link: (string | number)[],
  ) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const startMs = start.getTime();
    const endMs = end.getTime();

    const today = rows
      .filter((a) => {
        const t = new Date(a.starts_at).getTime();
        return t >= startMs && t < endMs && a.status !== 'canceled';
      })
      .map<DayAppointment>((a) => ({
        id: a.id,
        customer_name: a.customer_name,
        service_name: a.service_name,
        employee_name: a.employee_name,
        starts_at: a.starts_at,
        ends_at: a.ends_at,
        status: a.status,
        business_name: businessName,
        link,
      }));

    this.todayAppointments.update((curr) => {
      const seen = new Set(curr.map((a) => a.id));
      const merged = [...curr, ...today.filter((a) => !seen.has(a.id))];
      merged.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      return merged;
    });
  }
}
