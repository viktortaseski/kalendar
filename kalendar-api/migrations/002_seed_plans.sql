-- ──────────────────────────────────────────────────────────
-- 002_seed_plans: insert the two starting subscription tiers
-- ──────────────────────────────────────────────────────────

INSERT INTO plans (type, price, description, features, cta, featured) VALUES
  (
    'Basic',
    19,
    'For solo practitioners and small shops getting started.',
    ARRAY[
      'Up to 2 staff calendars',
      'Unlimited appointments',
      'Email reminders',
      'Custom booking page',
      'Basic analytics'
    ],
    'Start free trial',
    false
  ),
  (
    'Premium',
    49,
    'For growing teams that need more power and polish.',
    ARRAY[
      'Up to 15 staff calendars',
      'Unlimited appointments',
      'SMS + email reminders',
      'Custom domain & branding',
      'Advanced analytics',
      'Stripe payments',
      'Priority support'
    ],
    'Start free trial',
    true
  )
ON CONFLICT (type) DO NOTHING;
