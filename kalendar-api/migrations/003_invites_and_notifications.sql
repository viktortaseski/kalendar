-- ──────────────────────────────────────────────────────────
-- 003: employee invites + generic notifications
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS employee_invites (
  id            SERIAL PRIMARY KEY,
  business_id   INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT,
  invited_by    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending',  -- pending | accepted | declined | revoked
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_employee_invites_user
  ON employee_invites(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_employee_invites_business
  ON employee_invites(business_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_invites_unique_pending
  ON employee_invites(business_id, user_id) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,  -- e.g. employee_invite
  title       TEXT NOT NULL,
  body        TEXT,
  payload     JSONB,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
  ON notifications(user_id, read_at, created_at DESC);
