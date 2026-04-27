import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/notifications`;

  unreadCount = signal(0);

  list(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.base);
  }

  refreshUnreadCount(): Observable<{ count: number }> {
    return this.http
      .get<{ count: number }>(`${this.base}/unread-count`)
      .pipe(tap((r) => this.unreadCount.set(r.count)));
  }

  markRead(id: number): Observable<{ id: number; read_at: string }> {
    return this.http.post<{ id: number; read_at: string }>(`${this.base}/${id}/read`, {}).pipe(
      tap(() => this.unreadCount.update((c) => Math.max(0, c - 1))),
    );
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http
      .post<{ updated: number }>(`${this.base}/read-all`, {})
      .pipe(tap(() => this.unreadCount.set(0)));
  }
}
