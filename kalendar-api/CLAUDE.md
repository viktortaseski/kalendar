# kalendar-api

Express 4 + Postgres (`pg`) + JWT. Plain ESM JavaScript, no TypeScript, no build step.

## Scripts

- `npm run dev` — `node --watch --env-file=.env src/index.js`
- `npm start` — production start
- `npm run migrate` — apply `migrations/*.sql` in order; tracked in `_migrations` table

## Layout

```
src/
├── index.js          Express bootstrap, CORS, route mounting
├── dbConn.js         pg Pool, exports `db`
├── middleware/
│   └── auth.js       requireAuth (401s), tryAuth (best-effort)
└── routes/
    ├── auth.js          /api/auth         register, login, me
    ├── users.js         /api/users        (list only — minimal)
    ├── plans.js         /api/plans        list plans
    ├── businesses.js    /api/businesses   ★ main router (see below)
    └── appointments.js  /api/appointments list / by customer
migrations/           SQL files, prefix-ordered (001_, 002_, …)
migrations.js         migration runner
qr-generator/         Python QR code script for booking URLs
```

## Env vars

| Name             | Required | Notes |
|------------------|----------|-------|
| `DATABASE_URL`   | yes      | Postgres URL. SSL auto-enabled if URL contains `dpg-` (Render). |
| `JWT_SECRET`     | yes      | HMAC secret for `jsonwebtoken`. |
| `PORT`           | no       | Default 3000. |
| `CORS_ORIGINS`   | no       | Comma-separated. Default `http://localhost:4200`. |

## Routes summary

### `/api/auth` (`routes/auth.js`)
- `POST /register` — `{fullName,email,password,phone?}` → `{token,user}` (201)
- `POST /login` — `{email,password}` → `{token,user}`
- `GET  /me` — auth required → `{user}`

Token: `jwt.sign({sub:userId,email}, JWT_SECRET, {expiresIn:'7d'})`. `publicUser` strips `password_hash` and renames to camelCase (`fullName`).

### `/api/businesses` (`routes/businesses.js`) — biggest router
Public:
- `GET  /` — list active, optional `?q=` ILIKE on name/description
- `GET  /:slug` — detail (accepts numeric id too); joins `plans`
- `GET  /:slug/services`
- `GET  /:slug/employees`
- `GET  /:slug/staff` — employees + nested `working_hours[]`
- `GET  /:slug/employees/:id/working-hours`
- `GET  /:slug/employees/:id/availability?date=YYYY-MM-DD&serviceId=` → `{slots:["HH:MM",...]}`
- `POST /:slug/appointments` — guest-friendly (uses `tryAuth` to stamp `customer_id` if logged in)

Owner-only (`requireAuth` + `loadBySlug(slug,true,userId)`):
- `POST /` — create (auto slugifies, dedupes with `-2`, `-3`)
- `GET  /mine/list` — owner's businesses
- `POST/DELETE /:slug/services[/...]`
- `POST/DELETE /:slug/employees[/...]`
- `PUT  /:slug/employees/:id/working-hours` — replaces full schedule in a transaction
- `GET  /:slug/appointments` — all bookings for business
- `PUT  /:slug/settings` — `{timezone?,slotDurationMinutes?}` (min slot 5)
- `PUT  /:slug/plan` — `{planId}`

### `/api/appointments` (`routes/appointments.js`)
- `GET  /` — list all (no auth — TODO)
- `GET  /:customerId` — appointments for a customer, joined with employee name

### `/api/plans` (`routes/plans.js`)
- `GET  /` — list all plans

### `/api/users` (`routes/users.js`)
- `GET  /` — list all (minimal, no auth — TODO)

## Patterns to follow

- Always wrap route bodies in `try/catch`; log with `console.error('METHOD /path failed:', err)` and return `500 {error: err.message || 'fallback'}`.
- For owner-gated routes use the `loadBySlug(slug, true, req.user.sub)` helper; it returns `{error,status}` or `{business}`.
- For multi-statement writes use `db.connect()` + `BEGIN/COMMIT/ROLLBACK` (see `PUT working-hours`).
- Validate input shape early; return `400` with a clear `{error}`.
- Use parameterized queries (`$1, $2, …`) — never string-concatenate user input.
- Slugs from names: `slugify()` lowercases, strips non-alphanumerics, collapses dashes; uniqueness via `-N` suffix loop.
- Timezones: validate via `safeTz()` (Intl.DateTimeFormat probe → fallback `'UTC'`).
- Time math: `toMinutes('HH:MM')`, `fromMinutes(n)`, `blockMinutes(row, refDate)` for per-day clamping. Booking width comes from `service.duration_minutes` if `serviceId` supplied, else `business.slot_duration_minutes`.

## DB schema (high level)

`plans, users, businesses, employees, services, working_hours, unavailability, appointments` + `_migrations`. Status enums are TEXT with comments in 001_init.sql:
- `businesses.subscription_status`: `trial|active|past_due|canceled`
- `appointments.status`: `confirmed|canceled|no_show|completed`
- `working_hours.day_of_week`: 0=Sun … 6=Sat

Indexes already cover common lookups (owner, slug, employee+date, business+date, customer).

## Adding a migration

1. New file `migrations/NNN_description.sql` with the next number.
2. Pure SQL, idempotent where possible (`IF NOT EXISTS`, `ON CONFLICT`).
3. Run `npm run migrate`. The runner wraps each file in a transaction; failure rolls back and aborts.
