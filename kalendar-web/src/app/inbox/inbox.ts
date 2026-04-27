import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  NotificationsService,
  AppNotification,
} from '../services/notifications.service';
import { InvitesService, IncomingInvite } from '../services/invites.service';

@Component({
  selector: 'app-inbox',
  imports: [DatePipe],
  templateUrl: './inbox.html',
  styleUrl: './inbox.scss',
})
export class Inbox implements OnInit {
  private notifService = inject(NotificationsService);
  private invitesService = inject(InvitesService);
  private router = inject(Router);

  notifications = signal<AppNotification[]>([]);
  invites = signal<IncomingInvite[]>([]);

  loading = signal(true);
  pageError = signal<string | null>(null);
  actionError = signal<string | null>(null);
  actingId = signal<number | null>(null);

  hasUnread = computed(() => this.notifications().some((n) => !n.read_at));
  pendingInviteIds = computed(() => new Set(this.invites().map((i) => i.id)));

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.loading.set(true);
    this.pageError.set(null);
    this.notifService.list().subscribe({
      next: (rows) => {
        this.notifications.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.pageError.set(err?.error?.error || 'Failed to load notifications');
        this.loading.set(false);
      },
    });
    this.invitesService.mine().subscribe({
      next: (rows) => this.invites.set(rows),
      error: () => this.invites.set([]),
    });
    this.notifService.refreshUnreadCount().subscribe({ error: () => {} });
  }

  inviteIdOf(n: AppNotification): number | null {
    const v = n.payload?.['invite_id'];
    return typeof v === 'number' ? v : null;
  }

  isPending(n: AppNotification): boolean {
    if (n.type !== 'employee_invite') return false;
    const id = this.inviteIdOf(n);
    return id !== null && this.pendingInviteIds().has(id);
  }

  markRead(n: AppNotification) {
    if (n.read_at) return;
    this.notifService.markRead(n.id).subscribe({
      next: (r) => {
        this.notifications.update((rows) =>
          rows.map((x) => (x.id === n.id ? { ...x, read_at: r.read_at } : x)),
        );
      },
    });
  }

  markAllRead() {
    this.notifService.markAllRead().subscribe({
      next: () => {
        const now = new Date().toISOString();
        this.notifications.update((rows) =>
          rows.map((x) => (x.read_at ? x : { ...x, read_at: now })),
        );
      },
    });
  }

  acceptInvite(n: AppNotification) {
    const id = this.inviteIdOf(n);
    if (id === null) return;
    this.actionError.set(null);
    this.actingId.set(n.id);
    this.invitesService.accept(id).subscribe({
      next: () => {
        this.invites.update((rows) => rows.filter((i) => i.id !== id));
        this.markRead(n);
        this.actingId.set(null);
        const slug = n.payload?.['business_slug'];
        if (typeof slug === 'string') this.router.navigateByUrl(`/my-jobs/${slug}`);
      },
      error: (err) => {
        this.actionError.set(err?.error?.error || 'Failed to accept invite');
        this.actingId.set(null);
      },
    });
  }

  declineInvite(n: AppNotification) {
    const id = this.inviteIdOf(n);
    if (id === null) return;
    this.actionError.set(null);
    this.actingId.set(n.id);
    this.invitesService.decline(id).subscribe({
      next: () => {
        this.invites.update((rows) => rows.filter((i) => i.id !== id));
        this.markRead(n);
        this.actingId.set(null);
      },
      error: (err) => {
        this.actionError.set(err?.error?.error || 'Failed to decline invite');
        this.actingId.set(null);
      },
    });
  }
}
