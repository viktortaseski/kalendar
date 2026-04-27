import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { AppointmentsService } from '../services/appointments.service';
import { BusinessService } from '../services/business.service';
import { forkJoin, of, switchMap, map } from 'rxjs';

@Component({
  selector: 'app-my-appointments',
  imports: [AsyncPipe, DatePipe],
  templateUrl: './my-appointments.html',
  styleUrl: './my-appointments.scss',
})

export class MyAppointments {
  protected auth = inject(AuthService);
  user = this.auth.currentUser();
  private appointmentsService = inject(AppointmentsService);
  private businessService = inject(BusinessService);

  appointments = this.appointmentsService.listAppointments(this.user?.id ?? 0).pipe(
    switchMap(appointments => {
      if (!appointments.length) return of([]);
      const uniqueBusinessIds = [...new Set(appointments.map(a => a.business_id))];
      return forkJoin(uniqueBusinessIds.map(id => this.businessService.getById(id))).pipe(
        map(businesses => {
          const bizMap = new Map(uniqueBusinessIds.map((id, i) => [id, businesses[i]]));
          return appointments.map(a => ({ ...a, business_name: bizMap.get(a.business_id)?.name ?? '' }));
        })
      );
    })
  );
}
