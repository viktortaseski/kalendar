import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Appointment {
  id: number;
  customer_name: string;
  employee_id: number;
  employee_name: string | null;
  notes: string;
  starts_at: string;
  business_id: number;
  business_name: string | null;
}

@Injectable({ providedIn: 'root' })

export class AppointmentsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/appointments`;

  listAppointments(customerId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.base}/${customerId}`);
  }
}
