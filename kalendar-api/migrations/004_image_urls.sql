-- ──────────────────────────────────────────────────────────
-- 004: image url columns (Cloudinary or any external CDN)
-- ──────────────────────────────────────────────────────────

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url   TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS banner_url TEXT;

ALTER TABLE employees  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE users      ADD COLUMN IF NOT EXISTS avatar_url TEXT;

ALTER TABLE services   ADD COLUMN IF NOT EXISTS image_url  TEXT;
