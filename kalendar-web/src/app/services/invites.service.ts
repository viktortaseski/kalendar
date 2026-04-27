import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IncomingInvite {
  id: number;
  business_id: number;
  business_slug: string;
  business_name: string;
  email: string;
  name: string | null;
  status: string;
  created_at: string;
  invited_by_name: string;
}

export interface OwnerInvite {
  id: number;
  email: string;
  name: string | null;
  status: string;
  created_at: string;
  responded_at: string | null;
  invitee_full_name: string;
}

@Injectable({ providedIn: 'root' })
export class InvitesService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/invites`;

  mine(): Observable<IncomingInvite[]> {
    return this.http.get<IncomingInvite[]>(`${this.base}/mine`);
  }

  accept(id: number): Observable<{ employee_id: number; business_id: number }> {
    return this.http.post<{ employee_id: number; business_id: number }>(
      `${this.base}/${id}/accept`,
      {},
    );
  }

  decline(id: number): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/decline`, {});
  }
}
