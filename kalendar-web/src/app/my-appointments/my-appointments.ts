import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { AppointmentsService } from '../services/appointments.service';
import { BusinessService } from '../services/business.service';
import { map } from 'rxjs';

@Component({
  selector: 'app-my-appointments',
  imports: [],
  templateUrl: './my-appointments.html',
  styleUrl: './my-appointments.scss',
})

export class MyAppointments {
  protected auth = inject(AuthService);
  user = this.auth.currentUser();
  protected appointmentsService = inject(AppointmentsService);
  protected businessService = inject(BusinessService);
  appointments = this.appointmentsService.listAppointments(this.user?.id ?? 0);
  business = this.appointments.pipe(map(appointments => appointments[0]?.business_id));
}

export interface Appointment {
  id: number;
  business_id: number;
  customer_name: string;
  notes: string;
  starts_at: string;
  date: string;
  time: string;
}
