-- ──────────────────────────────────────────────────────────
-- 001_init: core schema for Kalendar
-- ──────────────────────────────────────────────────────────

-- Subscription tiers (Basic, Premium)
CREATE TABLE IF NOT EXISTS plans (
  id            SERIAL PRIMARY KEY,
  type          TEXT NOT NULL UNIQUE,
  price         INTEGER NOT NULL,
  description   TEXT,
  features      TEXT[] NOT NULL,
  cta           TEXT NOT NULL,
  featured      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- All accounts: customers AND business owners
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A user becomes a business by buying a plan
CREATE TABLE IF NOT EXISTS businesses (
  id                    SERIAL PRIMARY KEY,
  owner_id              INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id               INTEGER NOT NULL REFERENCES plans(id),
  name                  TEXT NOT NULL,
  slug                  TEXT NOT NULL UNIQUE,
  description           TEXT,
  timezone              TEXT NOT NULL DEFAULT 'UTC',
  slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
  active                BOOLEAN NOT NULL DEFAULT true,
  subscription_status   TEXT NOT NULL DEFAULT 'trial',  -- trial | active | past_due | canceled
  trial_ends_at         TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff who take bookings (a business has many)
CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- optional login link
  name          TEXT NOT NULL,
  email         TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- What a business offers (haircut, massage, consult, …)
CREATE TABLE IF NOT EXISTS services (
  id                SERIAL PRIMARY KEY,
  business_id       INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  duration_minutes  INTEGER NOT NULL CHECK (duration_minutes > 0),
  price_cents       INTEGER,
  description       TEXT,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recurring weekly availability per employee
CREATE TABLE IF NOT EXISTS working_hours (
  id            SERIAL PRIMARY KEY,
  employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week   SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sun … 6=Sat
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  CHECK (end_time > start_time)
);

-- One-off blocks (vacations, sick days, lunch)
CREATE TABLE IF NOT EXISTS unavailability (
  id            SERIAL PRIMARY KEY,
  employee_id   INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  starts_at     TIMESTAMPTZ NOT NULL,
  ends_at       TIMESTAMPTZ NOT NULL,
  reason        TEXT,
  CHECK (ends_at > starts_at)
);

-- Actual bookings
CREATE TABLE IF NOT EXISTS appointments (
  id              SERIAL PRIMARY KEY,
  business_id     INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  service_id      INTEGER REFERENCES services(id) ON DELETE SET NULL,
  customer_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- null = guest booking
  customer_name   TEXT NOT NULL,
  customer_email  TEXT NOT NULL,
  customer_phone  TEXT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'confirmed',  -- confirmed | canceled | no_show | completed
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

-- Indexes that match the queries you'll actually run
CREATE INDEX IF NOT EXISTS idx_businesses_owner          ON businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_slug           ON businesses(slug);
CREATE INDEX IF NOT EXISTS idx_employees_business        ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business         ON services(business_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_employee    ON working_hours(employee_id);
CREATE INDEX IF NOT EXISTS idx_unavailability_employee   ON unavailability(employee_id, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_appointments_employee_at  ON appointments(employee_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_business_at  ON appointments(business_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_customer     ON appointments(customer_id);
