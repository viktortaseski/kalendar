import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// 1. Define what an Appointment looks like
export interface Appointment {
  id: number;
  customer_name: string;
  notes: string;
  starts_at: string;
}

@Injectable({ providedIn: 'root' })

export class AppointmentsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/appointments`;

  listAppointments(userId: number): Observable<Appointment[]> {
    return this.http.get<Appointment[]>(`${this.base}/${userId}`);
  }
}
