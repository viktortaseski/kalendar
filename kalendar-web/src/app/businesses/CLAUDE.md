# Businesses module

Routes related to businesses. Four components, all standalone.

## Components

| File                  | Route                              | Purpose |
|-----------------------|------------------------------------|---------|
| `businesses.ts`       | `/businesses`                      | Public list + search (uses `BusinessService.list(q)`). |
| `business-create.ts`  | `/businesses/new` (auth)           | Create form. POSTs to `BusinessService.create()`. |
| `business-detail.ts`  | `/businesses/:slug`                | Public booking flow + read-only business info. |
| `business-manage.ts`  | `/businesses/:slug/manage` (auth)  | Owner dashboard: appointments / staff / settings / plans / billing tabs. |

## Booking flow (`business-detail.ts`)

State: `bookingStep: signal<'calendar'|'slots'|'form'|'done'>`.
Uses `StaffMember` (employee + `working_hours[]`) from `BusinessService.listStaff(slug)`.

1. Pick staff member → `selectedMember.set()`, step `'calendar'`.
2. `calDays = computed(...)`: Mon-first month grid; cell `disabled` if `< today` OR `!workingDow.has(date.getDay())`.
3. Click date → fetch `getAvailability(slug, empId, date)` → step `'slots'`.
4. Click slot → step `'form'`.
5. Submit → `createAppointment()` → step `'done'`.

Owner check: `isOwner = computed(() => business().owner_id === auth.currentUser()?.id)`.

## Owner manage (`business-manage.ts`)

Tabs (`activeTab: signal<'appointments'|'staff'|'settings'|'plans'|'billing'>`). Each tab has its own load + form. Working-hours editor builds a `DayRow[]` (Mon-first, `open` toggle, `startTime`, `endTime`) and PUTs the whole schedule. Generates a booking QR with `qrcode` npm package using `${environment.publicDomain}/businesses/${slug}` — keep it in sync with the Python `qr-generator/generator.py` URL shape.

## Don'ts

- Don't fetch from `HttpClient` directly — use `BusinessService`.
- Don't duplicate type interfaces — import from `services/business.service.ts`.
- Don't add a new top-level route here without registering it in `app.routes.ts`.
