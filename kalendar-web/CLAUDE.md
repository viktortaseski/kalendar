# kalendar-web

Angular **21** with SSR, standalone components, signals, **no NgModules**. SCSS styles. Talks to `kalendar-api` (default `http://localhost:3000/api`).

## Scripts

- `npm start` — `ng serve` on `:4200`
- `npm run build` — production build
- `npm run watch` — dev build with rebuild
- `npm test` — `ng test` (Vitest)
- `npm run serve:ssr:kalendar` — run SSR server from `dist/`

## Layout

```
src/
├── main.ts             browser bootstrap
├── main.server.ts      SSR bootstrap
├── server.ts           Express SSR server
├── styles.scss         global tokens (--color-*, --space-*, --radius-*, --shadow-*) + .container, .btn-primary-lg, .btn-ghost, .section-head, .eyebrow
├── environments/
│   └── environment.ts  { production, apiBaseUrl, publicDomain }
└── app/
    ├── app.ts/.html/.scss   Shell — sidebar layout when logged in, nav+footer when guest
    ├── app.config.ts        Providers: router, hydration, http+authInterceptor
    ├── app.config.server.ts SSR config
    ├── app.routes.ts        ★ all routes (see below)
    ├── app.routes.server.ts SSR prerender config
    ├── services/            ★ HTTP services (auth, business, plan, appointments)
    ├── interceptors/        authInterceptor — adds Bearer header
    ├── guards/              authGuard, guestGuard
    ├── nav/                 Top nav for logged-out users
    ├── sidebar/             Sidebar for logged-in users (lists user's businesses)
    ├── home/                Landing page
    ├── pricing/             Pricing page + pricing-card subcomponent
    ├── auth/                login/, register/
    ├── dashboard/           Authed user landing
    ├── businesses/          list, detail (booking flow), create, manage (owner)
    ├── my-appointments/     Customer's bookings
    └── settings/            User settings
```

## Routes (`app.routes.ts`)

| Path                              | Component        | Guard       |
|-----------------------------------|------------------|-------------|
| `/`                               | `Home`           | guest       |
| `/pricing`                        | `Pricing`        | guest       |
| `/login`                          | `Login`          | guest       |
| `/register`                       | `Register`       | guest       |
| `/dashboard`                      | `Dashboard`      | auth        |
| `/settings`                       | `Settings`       | auth        |
| `/my-appointments`                | `MyAppointments` | auth        |
| `/businesses`                     | `Businesses`     | —           |
| `/businesses/new`                 | `BusinessCreate` | auth        |
| `/businesses/:slug`               | `BusinessDetail` | —           |
| `/businesses/:slug/manage`        | `BusinessManage` | auth        |

`guestGuard` redirects logged-in users to `/dashboard`. `authGuard` redirects to `/login?redirect=…`.

## Conventions

- **Standalone components only.** Use the `imports: [...]` array on `@Component`. Don't create NgModules.
- **Signals first** — `signal()`, `computed()`. Use `effect()` only when truly needed. `input()` for component inputs.
- **`inject()` everywhere** — no constructor DI.
- **Control flow blocks** — `@if`, `@for`, `@switch`, `@empty`, `@let`. Don't use `*ngIf`/`*ngFor`.
- **Templates** = separate `.html` file. **Styles** = separate `.scss`. (Component-scoped by default.)
- **Selectors** = `app-<kebab>`.
- **Class names** = PascalCase, no `Component` suffix (`Login`, `BusinessDetail`, `Sidebar`).
- **File names** = kebab, no `.component` suffix (`login.ts`, `business-detail.ts`).
- **Tests** = Vitest, `*.spec.ts` next to the file.
- **HTTP** — never call `HttpClient` directly from components; go through a service in `app/services/`.
- **Auth state** — read from `AuthService.currentUser()` / `isLoggedIn()` signals. Token persistence is handled inside `AuthService` (gated on `typeof localStorage !== 'undefined'` for SSR).
- **API base URL** — always read from `environment.apiBaseUrl`; never hardcode `http://localhost:3000`.

## Services (`app/services/`)

| Service              | Endpoints touched         | Notes |
|----------------------|---------------------------|-------|
| `AuthService`        | `/auth/{register,login,me}` | Holds `currentUser` signal, persists token+user to `localStorage`. |
| `BusinessService`    | `/businesses/*`             | Big surface — list/get/create, services, employees, staff, working-hours, availability, appointments, settings, plan. See file for typed interfaces. |
| `PlanService`        | `/plans`                    | Returns `Plan[]`. |
| `AppointmentsService`| `/appointments/:customerId` | Used by `MyAppointments`. |

Response interfaces use **snake_case** (mirror DB rows). Request payloads use **camelCase** (matches API expectations).

## Styling

Global CSS variables in `src/styles.scss` are the design system — use them, don't hardcode colors/spacing:
- Colors: `--color-bg`, `--color-bg-elevated`, `--color-ink`, `--color-ink-muted`, `--color-ink-subtle`, `--color-border`, `--color-border-strong`, `--color-accent` (deep green `#0f4c3a`), `--color-accent-hover`, `--color-accent-soft`, `--color-warm`
- Fonts: `--font-sans` (Inter), `--font-serif` (Instrument Serif — used via `<em>` for italic display text)
- Space scale: `--space-1` (4px) through `--space-24` (96px)
- Radius: `--radius-sm/md/lg/xl/pill`
- Shadows: `--shadow-sm/md/lg/xl`

Reusable utility classes already defined: `.container`, `.btn-primary-lg`, `.btn-ghost`, `.section-head`, `.section-title`, `.section-sub`, `.eyebrow` (with `.dot`).

Layout in `app.scss`: `.app-shell` is a `260px 1fr` grid (sidebar + main) when logged in; collapses to mobile topbar at `≤768px`. Logged-out layout is nav + main + `.site-footer`.

## Booking flow (BusinessDetail)

State machine signal `bookingStep`: `'calendar' → 'slots' → 'form' → 'done'`.
1. User picks a staff member (calendar enables only days the employee works).
2. Calendar uses Mon-first grid; days disabled if `< today` or not in `working_hours.day_of_week`.
3. Pick date → fetch `/availability?date=…` → show `slots[]`.
4. Submit form → `POST /:slug/appointments`.
5. `done` shows confirmation (and a QR for the booking).

## SSR notes

- All `localStorage` access must check `typeof localStorage !== 'undefined'` (already done in `AuthService`).
- `provideClientHydration(withEventReplay())` is configured.
- Don't use `window`/`document` directly in components — gate via `isPlatformBrowser` or move to a browser-only effect.

## Don'ts

- Don't add NgModules.
- Don't use `*ngIf`/`*ngFor` — use `@if`/`@for`.
- Don't hardcode the API URL.
- Don't call `HttpClient` from components directly.
- Don't add new global styles — extend the token system or scope to the component.
- Don't add comments unless WHY is non-obvious.
