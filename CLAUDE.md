# Kalendar — Monorepo

Online booking platform for small businesses.

## Layout

```
kalendar/
├── kalendar-api/   Express + Postgres backend (port 3000)
└── kalendar-web/   Angular 21 SSR frontend  (port 4200)
```

Two independent npm packages. Communicate via HTTP (`/api/*`).
See per-folder CLAUDE.md for details — read those before searching.

## Run locally

Terminal 1 (api): `cd kalendar-api && npm run dev`
Terminal 2 (web): `cd kalendar-web && npm start`
DB migrations:    `cd kalendar-api && npm run migrate`

Requires Postgres running and `kalendar-api/.env` with `DATABASE_URL`, `JWT_SECRET`, optional `CORS_ORIGINS`.

## Domain model (1-line)

`User` → owns `Business` (subscribed to a `Plan`) → has `Employee`s + `Service`s → `Employee` has `working_hours` + `unavailability` → customers create `Appointment`s.

Full schema: `kalendar-api/migrations/001_init.sql`.

## Conventions

- API responses use snake_case (raw Postgres rows). Frontend interfaces mirror snake_case for response types, camelCase for request payloads.
- Auth = JWT in `Authorization: Bearer <token>`, persisted in `localStorage` (`kalendar.token`, `kalendar.user`).
- `slug` is the public identifier for businesses; numeric `id` also accepted on `GET /api/businesses/:slug`.
- Times stored as `TIMESTAMPTZ`; availability/booking math done in business `timezone`.
- No build step for api (plain ESM JS). Web uses Angular CLI.

## Don'ts

- Don't add comments unless WHY is non-obvious.
- Don't add error handling for impossible cases.
- Don't create new .md files unless asked.
- Don't refactor outside the requested scope.
