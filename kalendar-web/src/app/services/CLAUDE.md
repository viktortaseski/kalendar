# Services

Thin Angular HTTP wrappers. All `@Injectable({ providedIn: 'root' })`. Use `inject(HttpClient)`. Base URL from `environment.apiBaseUrl`.

## Files

### `auth.service.ts` — `AuthService`
State: `currentUser = signal<User | null>`, `isLoggedIn = computed(() => currentUser() !== null)`.
- `register({fullName,email,password})` → persists `{token,user}`
- `login({email,password})` → persists `{token,user}`
- `refreshMe()` → re-reads `/auth/me`, updates signal + storage
- `logout()` → clears signal + storage
- `getToken()` → string | null (used by `authInterceptor`)

Storage keys: `kalendar.token`, `kalendar.user`. All `localStorage` access is SSR-guarded.

### `business.service.ts` — `BusinessService`
Big surface. Typed interfaces exported: `BusinessSummary, BusinessDetail, MyBusiness, Service, Employee, WorkingHourRow, StaffMember (= Employee + working_hours[]), BusinessAppointment, CreateBusinessPayload`.

| Method                                    | Endpoint |
|-------------------------------------------|----------|
| `list(query?)`                            | `GET /businesses?q=` |
| `getBySlug(slug)` / `getById(id)`         | `GET /businesses/:slug` |
| `create(payload)`                         | `POST /businesses` |
| `mine()`                                  | `GET /businesses/mine/list` |
| `listServices/createService/deleteService`| `/businesses/:slug/services[/:id]` |
| `listEmployees/createEmployee/deleteEmployee` | `/businesses/:slug/employees[/:id]` |
| `listStaff(slug)`                         | `GET /businesses/:slug/staff` (employees + nested working_hours) |
| `getAvailability(slug, empId, date)`      | `GET /businesses/:slug/employees/:id/availability?date=` → `{slots[]}` |
| `createAppointment(slug, payload)`        | `POST /businesses/:slug/appointments` |
| `getBusinessAppointments(slug)`           | `GET /businesses/:slug/appointments` (owner) |
| `updateSettings(slug, {timezone?, slotDurationMinutes?})` | `PUT /businesses/:slug/settings` |
| `changePlan(slug, planId)`                | `PUT /businesses/:slug/plan` |
| `getWorkingHours(slug, empId)`            | `GET …/working-hours` |
| `putWorkingHours(slug, empId, hours[])`   | `PUT …/working-hours` (replaces full schedule) |

### `plan.service.ts` — `PlanService`
- `list()` → `Plan[]` (`{id, type, price, description, features[], cta, featured}`)

### `appointments.service.ts` — `AppointmentsService`
- `listAppointments(customerId)` → `Appointment[]`

## Conventions

- Response types use **snake_case** (DB rows passed through). Request payloads use **camelCase**.
- Always return `Observable<T>` — no `.subscribe()` inside services.
- New endpoint? Add a typed method here, not a raw `HttpClient` call in a component.
