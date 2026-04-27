import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BusinessSummary {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  timezone: string;
}

export interface BusinessDetail extends BusinessSummary {
  slot_duration_minutes: number;
  plan_type: string;
  owner_id: number;
}

export interface MyBusiness extends BusinessSummary {
  subscription_status: string;
}

export interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price_cents: number | null;
  description: string | null;
  active: boolean;
}

export interface Employee {
  id: number;
  name: string;
  email: string | null;
  active: boolean;
}

export interface WorkingHourRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface StaffMember extends Employee {
  working_hours: WorkingHourRow[];
}

export interface CreateBusinessPayload {
  name: string;
  description?: string;
  planId: number;
  timezone?: string;
  slotDurationMinutes?: number;
}

@Injectable({ providedIn: 'root' })
export class BusinessService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/businesses`;

  list(query?: string): Observable<BusinessSummary[]> {
    let params = new HttpParams();
    if (query) params = params.set('q', query);
    return this.http.get<BusinessSummary[]>(this.base, { params });
  }

  getBySlug(slug: string): Observable<BusinessDetail> {
    return this.http.get<BusinessDetail>(`${this.base}/${slug}`);
  }

  getById(id: number): Observable<BusinessDetail> {
    return this.http.get<BusinessDetail>(`${this.base}/${id}`);
  }

  create(payload: CreateBusinessPayload): Observable<BusinessDetail> {
    return this.http.post<BusinessDetail>(this.base, payload);
  }

  mine(): Observable<MyBusiness[]> {
    return this.http.get<MyBusiness[]>(`${this.base}/mine/list`);
  }

  // Services
  listServices(slug: string): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.base}/${slug}/services`);
  }
  createService(
    slug: string,
    p: { name: string; durationMinutes: number; priceCents?: number; description?: string },
  ) {
    return this.http.post<Service>(`${this.base}/${slug}/services`, p);
  }
  deleteService(slug: string, id: number) {
    return this.http.delete<void>(`${this.base}/${slug}/services/${id}`);
  }

  // Employees
  listEmployees(slug: string): Observable<Employee[]> {
    return this.http.get<Employee[]>(`${this.base}/${slug}/employees`);
  }
  // Staff = employees + their working hours, in one call
  listStaff(slug: string): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>(`${this.base}/${slug}/staff`);
  }
  createEmployee(slug: string, p: { name: string; email?: string }) {
    return this.http.post<Employee>(`${this.base}/${slug}/employees`, p);
  }
  deleteEmployee(slug: string, id: number) {
    return this.http.delete<void>(`${this.base}/${slug}/employees/${id}`);
  }

  // Availability & Appointments
  getAvailability(slug: string, employeeId: number, date: string): Observable<{ slots: string[] }> {
    const params = new HttpParams().set('date', date);
    return this.http.get<{ slots: string[] }>(
      `${this.base}/${slug}/employees/${employeeId}/availability`,
      { params },
    );
  }

  createAppointment(
    slug: string,
    payload: {
      employeeId: number;
      customerId: number;
      date: string;
      startTime: string;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      notes?: string;
      serviceId?: number;
    },
  ): Observable<{ id: number; starts_at: string; ends_at: string; status: string }> {
    return this.http.post<{ id: number; starts_at: string; ends_at: string; status: string }>(
      `${this.base}/${slug}/appointments`,
      payload,
    );
  }

  // Working hours
  getWorkingHours(slug: string, employeeId: number): Observable<WorkingHourRow[]> {
    return this.http.get<WorkingHourRow[]>(
      `${this.base}/${slug}/employees/${employeeId}/working-hours`,
    );
  }
  putWorkingHours(
    slug: string,
    employeeId: number,
    hours: { dayOfWeek: number; startTime: string; endTime: string }[],
  ) {
    return this.http.put<WorkingHourRow[]>(
      `${this.base}/${slug}/employees/${employeeId}/working-hours`,
      { hours },
    );
  }
}
