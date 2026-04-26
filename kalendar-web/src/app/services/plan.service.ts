import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Plan {
  id: number;
  type: string;
  price: number;
  description: string;
  features: string[];
  cta: string;
  featured: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlanService {
  private http = inject(HttpClient);

  list(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${environment.apiBaseUrl}/plans`);
  }
}
