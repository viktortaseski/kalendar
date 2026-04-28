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
  logo_url: string | null;
  banner_url: string | null;
}

export interface BusinessDetail extends BusinessSummary {
  slot_duration_minutes: number;
  plan_type: string;
  owner_id: number;
  subscription_status: string;
  trial_ends_at: string | null;
}

export interface BusinessAppointment {
  id: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  employee_name: string | null;
  service_name: string | null;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
}

export interface MyBusiness extends BusinessSummary {
  subscription_status: string;
}

export interface MyJob {
  business_id: number;
  business_slug: string;
  business_name: string;
  business_timezone: string;
  business_logo_url: string | null;
  employee_id: number;
  employee_name: string;
  employee_avatar_url: string | null;
}

export interface UnavailabilityBlock {
  id: number;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

export interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price: number | null;
  description: string | null;
  active: boolean;
  image_url: string | null;
}

export interface Employee {
  id: number;
  name: string;
  email: string | null;
  active: boolean;
  avatar_url: string | null;
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

  myJobs(): Observable<MyJob[]> {
    return this.http.get<MyJob[]>(`${this.base}/jobs/list`);
  }

  // Services
  listServices(slug: string): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.base}/${slug}/services`);
  }
  createService(
    slug: string,
    p: { name: string; durationMinutes: number; price?: number; description?: string },
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
  getAvailability(
    slug: string,
    employeeId: number,
    date: string,
    serviceId?: number,
  ): Observable<{ slots: string[] }> {
    let params = new HttpParams().set('date', date);
    if (serviceId) params = params.set('serviceId', String(serviceId));
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

  // Business management (owner-only)
  getBusinessAppointments(slug: string): Observable<BusinessAppointment[]> {
    return this.http.get<BusinessAppointment[]>(`${this.base}/${slug}/appointments`);
  }

  updateSettings(
    slug: string,
    payload: { name?: string; timezone?: string; slotDurationMinutes?: number },
  ): Observable<{ name: string; timezone: string; slot_duration_minutes: number }> {
    return this.http.put<{ name: string; timezone: string; slot_duration_minutes: number }>(
      `${this.base}/${slug}/settings`,
      payload,
    );
  }

  changePlan(slug: string, planId: number): Observable<{ plan_id: number }> {
    return this.http.put<{ plan_id: number }>(`${this.base}/${slug}/plan`, { planId });
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

  // Employee invites (owner)
  listInvites(slug: string) {
    return this.http.get<{
      id: number;
      email: string;
      name: string | null;
      status: string;
      created_at: string;
      responded_at: string | null;
      invitee_full_name: string;
    }[]>(`${this.base}/${slug}/invites`);
  }

  createInvite(slug: string, payload: { email: string; name?: string }) {
    return this.http.post<{
      id: number;
      business_id: number;
      user_id: number;
      email: string;
      name: string | null;
      status: string;
      created_at: string;
    }>(`${this.base}/${slug}/invites`, payload);
  }

  revokeInvite(slug: string, id: number) {
    return this.http.delete<void>(`${this.base}/${slug}/invites/${id}`);
  }

  // Employee's own appointments (owner-or-self)
  getEmployeeAppointments(slug: string, employeeId: number): Observable<BusinessAppointment[]> {
    return this.http.get<BusinessAppointment[]>(
      `${this.base}/${slug}/employees/${employeeId}/appointments`,
    );
  }

  // Unavailability (employee-self or owner)
  listUnavailability(slug: string, employeeId: number): Observable<UnavailabilityBlock[]> {
    return this.http.get<UnavailabilityBlock[]>(
      `${this.base}/${slug}/employees/${employeeId}/unavailability`,
    );
  }
  createUnavailability(
    slug: string,
    employeeId: number,
    payload: { startsAt: string; endsAt: string; reason?: string },
  ): Observable<UnavailabilityBlock> {
    return this.http.post<UnavailabilityBlock>(
      `${this.base}/${slug}/employees/${employeeId}/unavailability`,
      payload,
    );
  }
  deleteUnavailability(slug: string, employeeId: number, id: number) {
    return this.http.delete<void>(
      `${this.base}/${slug}/employees/${employeeId}/unavailability/${id}`,
    );
  }
}
