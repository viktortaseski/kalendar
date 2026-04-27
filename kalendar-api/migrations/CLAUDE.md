# Migrations

SQL files applied in lexical order by `migrations.js`. Tracked in `_migrations(filename, applied_at)`.

## Files

- `001_init.sql` — full core schema: `plans, users, businesses, employees, services, working_hours, unavailability, appointments` + indexes.
- `002_seed_plans.sql` — seeds `Basic` ($19) and `Premium` ($49) plans (`ON CONFLICT DO NOTHING`).

## Adding a migration

1. Next number, snake_case description: `003_add_<thing>.sql`
2. Pure SQL. Prefer idempotent: `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `ON CONFLICT DO NOTHING`.
3. Run `npm run migrate` from `kalendar-api/`.
4. Each file runs inside a single transaction — failure rolls back and aborts the whole run.

## Schema enums (TEXT)

- `businesses.subscription_status`: `trial | active | past_due | canceled`
- `appointments.status`: `confirmed | canceled | no_show | completed`
- `working_hours.day_of_week`: `0=Sun … 6=Sat` (SMALLINT, CHECK constraint)

## Don'ts

- Don't edit a migration that's already been applied in any environment — write a new one.
- Don't reorder existing files.
- Don't drop columns/tables without a paired data-preservation step.
