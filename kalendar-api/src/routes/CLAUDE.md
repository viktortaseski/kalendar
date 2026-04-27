# Routes

Each file is a standalone Express `Router` mounted in `src/index.js`. All exports are `default`.

## Files

| File              | Mount                | Auth model |
|-------------------|----------------------|------------|
| `auth.js`         | `/api/auth`          | public + `requireAuth` on `/me` |
| `users.js`        | `/api/users`         | none (TODO) |
| `plans.js`        | `/api/plans`         | none (read-only) |
| `businesses.js`   | `/api/businesses`    | mixed — see file header per route |
| `appointments.js` | `/api/appointments`  | none (TODO) |

## Patterns

```js
router.METHOD('/path', requireAuth, async (req, res) => {
  try {
    // 1. validate input → 400 on failure
    // 2. ownership/auth load via loadBySlug() if owner-gated
    // 3. parameterized db.query
    // 4. shape and return JSON
  } catch (err) {
    console.error('METHOD /path failed:', err);
    res.status(500).json({ error: err.message || 'fallback message' });
  }
});
```

## Ownership helper (in `businesses.js`)

```js
const r = await loadBySlug(req.params.slug, /* requireOwner */ true, req.user.sub);
if (r.error) return res.status(r.status).json({ error: r.error });
const biz = r.business;
```

Returns 404 if business missing/inactive, 403 if not owner.

## Transactions

For multi-statement writes use `db.connect()` + `BEGIN/COMMIT/ROLLBACK`. Always release the client in `finally`. Pattern lives in `PUT /:slug/employees/:id/working-hours`.

## Auth middleware

- `requireAuth` (404s without/invalid token) — sets `req.user = { sub, email }`.
- `tryAuth` (best-effort) — sets `req.user` if a valid Bearer token is present, otherwise continues anonymously. Used on `POST /:slug/appointments` so logged-in customers get `customer_id` stamped automatically.

## Adding a new route file

1. Create `routes/<name>.js`, export `default Router()`.
2. Mount in `src/index.js`: `app.use('/api/<name>', name);`
3. Use the `try/catch` + `console.error` pattern above.
4. Use parameterized queries — never interpolate user input into SQL.
