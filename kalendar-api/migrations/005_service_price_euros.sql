-- ──────────────────────────────────────────────────────────
-- 005: services price stored as whole units (euros), not cents
-- ──────────────────────────────────────────────────────────

ALTER TABLE services RENAME COLUMN price_cents TO price;

UPDATE services
   SET price = ROUND(price / 100.0)::INTEGER
 WHERE price IS NOT NULL;
