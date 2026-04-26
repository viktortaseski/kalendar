import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BusinessService,
  StaffMember,
  WorkingHourRow,
  BusinessDetail as BusinessDetailModel,
} from '../services/business.service';
import { AuthService } from '../services/auth.service';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

interface CalCell {
  date: Date;
  dateStr: string;
  disabled: boolean;
}

@Component({
  selector: 'app-business-detail',
  imports: [RouterLink],
  templateUrl: './business-detail.html',
  styleUrl: './business-detail.scss',
})
export class BusinessDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private businesses = inject(BusinessService);
  protected auth = inject(AuthService);

  business = signal<BusinessDetailModel | null>(null);
  staff = signal<StaffMember[]>([]);
  loading = signal(true);
  errorMessage = signal<string | null>(null);

  isOwner = computed(() => {
    const b = this.business();
    const u = this.auth.currentUser();
    return !!(b && u && b.owner_id === u.id);
  });

  // ── Booking state ─────────────────────────────────────────
  selectedMember = signal<StaffMember | null>(null);
  bookingStep = signal<'calendar' | 'slots' | 'form' | 'done'>('calendar');
  calMonth = signal(new Date());
  selectedDate = signal<string | null>(null);
  availableSlots = signal<string[]>([]);
  slotsLoading = signal(false);
  selectedSlot = signal<string | null>(null);
  bookingLoading = signal(false);
  bookingError = signal<string | null>(null);

  readonly calDow = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  calDays = computed<(CalCell | null)[]>(() => {
    const month = this.calMonth();
    const member = this.selectedMember();
    const workingDow = new Set(member?.working_hours.map(h => h.day_of_week) ?? []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const year = month.getFullYear();
    const mo = month.getMonth();
    const first = new Date(year, mo, 1);
    const lastDay = new Date(year, mo + 1, 0).getDate();

    const cells: (CalCell | null)[] = [];
    // Mon-first leading blanks (Mon=0, Tue=1, …, Sun=6)
    const leading = (first.getDay() + 6) % 7;
    for (let i = 0; i < leading; i++) cells.push(null);

    for (let d = 1; d <= lastDay; d++) {
      const date = new Date(year, mo, d);
      const dateStr = `${year}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const disabled = date < today || !workingDow.has(date.getDay());
      cells.push({ date, dateStr, disabled });
    }
    return cells;
  });

  calMonthLabel = computed(() =>
    this.calMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  );

  ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.loading.set(false);
      this.errorMessage.set('Missing business slug');
      return;
    }

    this.businesses.getBySlug(slug).subscribe({
      next: (b) => { this.business.set(b); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err?.error?.error || 'Business not found');
      },
    });

    this.businesses.listStaff(slug).subscribe({
      next: (rows) => this.staff.set(rows),
      error: () => this.staff.set([]),
    });
  }

  weekFor(staff: StaffMember): { label: string; hours: WorkingHourRow[] }[] {
    return DAY_ORDER.map((d) => ({
      label: DAY_LABELS[d],
      hours: staff.working_hours.filter((h) => h.day_of_week === d),
    }));
  }

  formatTime(t: string): string {
    const [hh, mm] = t.split(':');
    const h = Number(hh);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${mm} ${ampm}`;
  }

  // ── Booking actions ────────────────────────────────────────
  openBooking(member: StaffMember) {
    this.selectedMember.set(member);
    this.bookingStep.set('calendar');
    this.calMonth.set(new Date());
    this.selectedDate.set(null);
    this.selectedSlot.set(null);
    this.availableSlots.set([]);
    this.bookingError.set(null);
  }

  closeBooking() { this.selectedMember.set(null); }

  prevMonth() {
    const m = this.calMonth();
    this.calMonth.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  nextMonth() {
    const m = this.calMonth();
    this.calMonth.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  selectDate(dateStr: string) {
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.selectedDate.set(dateStr);
    this.bookingStep.set('slots');
    this.slotsLoading.set(true);
    this.availableSlots.set([]);

    this.businesses.getAvailability(slug, this.selectedMember()!.id, dateStr).subscribe({
      next: (r) => { this.availableSlots.set(r.slots); this.slotsLoading.set(false); },
      error: () => { this.availableSlots.set([]); this.slotsLoading.set(false); },
    });
  }

  selectSlot(slot: string) {
    this.selectedSlot.set(slot);
    this.bookingStep.set('form');
  }

  confirmBooking(name: string, email: string, phone: string, notes: string) {
    if (!name.trim() || !email.trim()) {
      this.bookingError.set('Name and email are required');
      return;
    }
    const slug = this.route.snapshot.paramMap.get('slug')!;
    this.bookingLoading.set(true);
    this.bookingError.set(null);

    this.businesses.createAppointment(slug, {
      employeeId: this.selectedMember()!.id,
      date: this.selectedDate()!,
      startTime: this.selectedSlot()!,
      customerName: name.trim(),
      customerEmail: email.trim(),
      customerPhone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
    }).subscribe({
      next: () => { this.bookingLoading.set(false); this.bookingStep.set('done'); },
      error: (err) => {
        this.bookingLoading.set(false);
        this.bookingError.set(err?.error?.error || 'Failed to book — please try again');
      },
    });
  }

  formatSlot(slot: string): string {
    const [hh, mm] = slot.split(':');
    const h = Number(hh);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${mm} ${ampm}`;
  }

  formatSelectedDate(): string {
    const d = this.selectedDate();
    if (!d) return '';
    const [y, mo, day] = d.split('-').map(Number);
    return new Date(y, mo - 1, day).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  }
}
