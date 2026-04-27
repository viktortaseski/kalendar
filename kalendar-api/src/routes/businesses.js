import { Router } from 'express';
import { db } from '../dbConn.js';
import { requireAuth, tryAuth } from '../middleware/auth.js';

const businesses = Router();

function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function safeTz(tz) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function fromMinutes(mins) {
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}
// Clamp a multi-day block to minutes within refDate (YYYY-MM-DD).
// Row must have starts_local and ends_local as 'YYYY-MM-DD HH:MM'.
function blockMinutes(row, refDate) {
  const [startDate, startTime] = row.starts_local.split(' ');
  const [endDate,   endTime  ] = row.ends_local.split(' ');
  const startMins = startDate < refDate ? 0    : startDate > refDate ? 1440 : toMinutes(startTime);
  const endMins   = endDate   > refDate ? 1440 : endDate   < refDate ? 0    : toMinutes(endTime);
  return { startMins, endMins };
}

// Resolve :slug → business row. Optional ownership check.
async function loadBySlug(slug, requireOwner = false, userId = null) {
  const result = await db.query(
    'SELECT id, owner_id FROM businesses WHERE slug = $1 AND active = true',
    [slug]
  );
  if (result.rowCount === 0) return { error: 'Business not found', status: 404 };
  const biz = result.rows[0];
  if (requireOwner && biz.owner_id !== userId) {
    return { error: 'You do not own this business', status: 403 };
  }
  return { business: biz };
}

// ─── Businesses ────────────────────────────────────────────

// GET /api/businesses?q=
businesses.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').toString().trim();
    const result = q
      ? await db.query(
          `SELECT id, name, slug, description, timezone
           FROM businesses
           WHERE active = true AND (name ILIKE $1 OR description ILIKE $1)
           ORDER BY name ASC LIMIT 50`,
          [`%${q}%`]
        )
      : await db.query(
          `SELECT id, name, slug, description, timezone
           FROM businesses WHERE active = true
           ORDER BY created_at DESC LIMIT 50`
        );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/businesses failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch businesses' });
  }
});

// GET /api/businesses/mine/list
businesses.get('/mine/list', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, slug, description, subscription_status
       FROM businesses WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [req.user.sub]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/businesses/mine/list failed:', err);
    res.status(500).json({ error: err.message || 'Failed to load your businesses' });
  }
});

// GET /api/businesses/:slug  (also accepts numeric id)
businesses.get('/:slug', async (req, res) => {
  try {
    const isId = /^\d+$/.test(req.params.slug);
    const result = await db.query(
      `SELECT b.id, b.name, b.slug, b.description, b.timezone, b.slot_duration_minutes, b.owner_id,
              p.type AS plan_type
       FROM businesses b JOIN plans p ON p.id = b.plan_id
       WHERE ${isId ? 'b.id = $1' : 'b.slug = $1'} AND b.active = true`,
      [isId ? Number(req.params.slug) : req.params.slug]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/businesses/:slug failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch business' });
  }
});

// POST /api/businesses
businesses.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, planId, timezone, slotDurationMinutes } = req.body || {};
    if (!name || !planId) return res.status(400).json({ error: 'name and planId are required' });

    const baseSlug = slugify(name);
    if (!baseSlug) return res.status(400).json({ error: 'name must contain letters or numbers' });

    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      const existing = await db.query('SELECT id FROM businesses WHERE slug = $1', [slug]);
      if (existing.rowCount === 0) break;
      slug = `${baseSlug}-${suffix++}`;
    }

    const insert = await db.query(
      `INSERT INTO businesses
         (owner_id, plan_id, name, slug, description, timezone, slot_duration_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, slug, description, timezone, slot_duration_minutes, owner_id`,
      [req.user.sub, planId, name, slug, description || null, timezone || 'UTC', slotDurationMinutes || 30]
    );
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('POST /api/businesses failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create business' });
  }
});

// ─── Services (nested under :slug) ─────────────────────────

// GET /:slug/services — public
businesses.get('/:slug/services', async (req, res) => {
  try {
    const r = await loadBySlug(req.params.slug);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const result = await db.query(
      `SELECT id, name, duration_minutes, price_cents, description, active
       FROM services WHERE business_id = $1
       ORDER BY active DESC, name ASC`,
      [r.business.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET services failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch services' });
  }
});

// POST /:slug/services — owner only
businesses.post('/:slug/services', requireAuth, async (req, res) => {
  try {
    const r = await loadBySlug(req.params.slug, true, req.user.sub);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const { name, durationMinutes, priceCents, description } = req.body || {};
    if (!name || !durationMinutes) {
      return res.status(400).json({ error: 'name and durationMinutes are required' });
    }
    if (durationMinutes <= 0) {
      return res.status(400).json({ error: 'durationMinutes must be positive' });
    }

    const insert = await db.query(
      `INSERT INTO services (business_id, name, duration_minutes, price_cents, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, duration_minutes, price_cents, description, active`,
      [r.business.id, name, durationMinutes, priceCents ?? null, description || null]
    );
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('POST services failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create service' });
  }
});

// DELETE /:slug/services/:id — owner only
businesses.delete('/:slug/services/:id', requireAuth, async (req, res) => {
  try {
    const r = await loadBySlug(req.params.slug, true, req.user.sub);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const result = await db.query(
      'DELETE FROM services WHERE id = $1 AND business_id = $2',
      [req.params.id, r.business.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Service not found' });
    res.status(204).end();
  } catch (err) {
    console.error('DELETE service failed:', err);
    res.status(500).json({ error: err.message || 'Failed to delete service' });
  }
});

// ─── Employees (nested under :slug) ────────────────────────

// GET /:slug/employees — public
businesses.get('/:slug/employees', async (req, res) => {
  try {
    const r = await loadBySlug(req.params.slug);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const result = await db.query(
      `SELECT id, name, email, active
       FROM employees WHERE business_id = $1
       ORDER BY active DESC, name ASC`,
      [r.business.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET employees failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch employees' });
  }
});

// POST /:slug/employees — owner only
businesses.post('/:slug/employees', requireAuth, async (req, res) => {
  try {
    const r = await loadBySlug(req.params.slug, true, req.user.sub);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const { name, email } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name is required' });

    const insert = await db.query(
      `INSERT INTO employees (business_id, name, email)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, active`,
      [r.business.id, name, email || null]
    );
    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('POST employee failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create employee' });
  }
});

// DELETE /:slug/employees/:id — owner only
businesses.delete('/:slug/employees/:id', requireAuth, async (req, res) => {
  try {
    const r = await loadBySlug(req.params.slug, true, req.user.sub);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const result = await db.query(
      'DELETE FROM employees WHERE id = $1 AND business_id = $2',
      [req.params.id, r.business.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Employee not found' });
    res.status(204).end();
  } catch (err) {
    console.error('DELETE employee failed:', err);
    res.status(500).json({ error: err.message || 'Failed to delete employee' });
  }
});

// GET /:slug/staff — employees WITH their working hours nested (public)
businesses.get('/:slug/staff', async (req, res) => {
  try {
    const r = await loadBySlug(req.params.slug);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const result = await db.query(
      `SELECT
         e.id, e.name, e.email, e.active,
         COALESCE(
           json_agg(
             json_build_object(
               'day_of_week', wh.day_of_week,
               'start_time', wh.start_time,
               'end_time', wh.end_time
             ) ORDER BY wh.day_of_week, wh.start_time
           ) FILTER (WHERE wh.employee_id IS NOT NULL),
           '[]'::json
         ) AS working_hours
       FROM employees e
       LEFT JOIN working_hours wh ON wh.employee_id = e.id
       WHERE e.business_id = $1
       GROUP BY e.id
       ORDER BY e.active DESC, e.name ASC`,
      [r.business.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET staff failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch staff' });
  }
});

// ─── Working Hours (per employee) ──────────────────────────

// GET /:slug/employees/:id/working-hours
businesses.get('/:slug/employees/:id/working-hours', async (req, res) => {
  try {
    const r = await loadBySlug(req.params.slug);
    if (r.error) return res.status(r.status).json({ error: r.error });

    const result = await db.query(
      `SELECT wh.day_of_week, wh.start_time, wh.end_time
       FROM working_hours wh
       JOIN employees e ON e.id = wh.employee_id
       WHERE e.id = $1 AND e.business_id = $2
       ORDER BY wh.day_of_week ASC, wh.start_time ASC`,
      [req.params.id, r.business.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET working hours failed:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch hours' });
  }
});

// PUT /:slug/employees/:id/working-hours — replace whole schedule
// Body: { hours: [{ dayOfWeek: 0-6, startTime: 'HH:MM', endTime: 'HH:MM' }, ...] }
businesses.put('/:slug/employees/:id/working-hours', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    const r = await loadBySlug(req.params.slug, true, req.user.sub);
    if (r.error) {
      client.release();
      return res.status(r.status).json({ error: r.error });
    }

    const empCheck = await client.query(
      'SELECT id FROM employees WHERE id = $1 AND business_id = $2',
      [req.params.id, r.business.id]
    );
    if (empCheck.rowCount === 0) {
      client.release();
      return res.status(404).json({ error: 'Employee not found' });
    }

    const hours = Array.isArray(req.body?.hours) ? req.body.hours : [];
    for (const h of hours) {
      if (
        typeof h.dayOfWeek !== 'number' ||
        h.dayOfWeek < 0 || h.dayOfWeek > 6 ||
        !/^\d{2}:\d{2}$/.test(h.startTime) ||
        !/^\d{2}:\d{2}$/.test(h.endTime) ||
        h.startTime >= h.endTime
      ) {
        client.release();
        return res.status(400).json({ error: 'Invalid hours payload' });
      }
    }

    await client.query('BEGIN');
    await client.query('DELETE FROM working_hours WHERE employee_id = $1', [req.params.id]);
    for (const h of hours) {
      await client.query(
        `INSERT INTO working_hours (employee_id, day_of_week, start_time, end_time)
         VALUES ($1, $2, $3, $4)`,
        [req.params.id, h.dayOfWeek, h.startTime, h.endTime]
      );
    }
    await client.query('COMMIT');

    const result = await client.query(
      `SELECT day_of_week, start_time, end_time
       FROM working_hours WHERE employee_id = $1
       ORDER BY day_of_week ASC, start_time ASC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('PUT working hours failed:', err);
    res.status(500).json({ error: err.message || 'Failed to update hours' });
  } finally {
    client.release();
  }
});

// GET /:slug/employees/:id/availability?date=YYYY-MM-DD&serviceId=...
businesses.get('/:slug/employees/:id/availability', async (req, res) => {
  try {
    const { slug, id: empId } = req.params;
    const date = req.query.date;
    const serviceId = req.query.serviceId ? Number(req.query.serviceId) : null;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
    }

    const bizResult = await db.query(
      `SELECT b.id, b.timezone, b.slot_duration_minutes
       FROM businesses b WHERE b.slug = $1 AND b.active = true`,
      [slug]
    );
    if (bizResult.rowCount === 0) return res.status(404).json({ error: 'Business not found' });
    const biz = bizResult.rows[0];
    const tz = safeTz(biz.timezone);

    const empResult = await db.query(
      'SELECT id FROM employees WHERE id = $1 AND business_id = $2 AND active = true',
      [empId, biz.id]
    );
    if (empResult.rowCount === 0) return res.status(404).json({ error: 'Employee not found' });

    // If serviceId provided, use the service's duration for the booking width
    let bookingWidth = biz.slot_duration_minutes;
    if (serviceId) {
      const svcRes = await db.query(
        'SELECT duration_minutes FROM services WHERE id = $1 AND business_id = $2 AND active = true',
        [serviceId, biz.id]
      );
      if (svcRes.rowCount === 0) return res.status(404).json({ error: 'Service not found' });
      bookingWidth = svcRes.rows[0].duration_minutes;
    }

    const [y, m, d] = date.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();

    const hoursResult = await db.query(
      'SELECT start_time::text, end_time::text FROM working_hours WHERE employee_id = $1 AND day_of_week = $2',
      [empId, dayOfWeek]
    );
    if (hoursResult.rowCount === 0) return res.json({ slots: [] });

    // Get unavailability blocks overlapping this date (results in business local time)
    const overlapQuery = `
      SELECT
        to_char(starts_at AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI') AS starts_local,
        to_char(ends_at   AT TIME ZONE $1, 'YYYY-MM-DD HH24:MI') AS ends_local
      FROM {TABLE}
      WHERE employee_id = $2
        AND starts_at < (($3::date + INTERVAL '1 day')::timestamp AT TIME ZONE $1)
        AND ends_at   >  ($3::date::timestamp AT TIME ZONE $1)`;

    const unavailResult = await db.query(
      overlapQuery.replace('{TABLE}', 'unavailability'),
      [tz, empId, date]
    );
    const apptResult = await db.query(
      overlapQuery.replace('{TABLE}', 'appointments') + ` AND status != 'canceled'`,
      [tz, empId, date]
    );

    const blockedRanges = [...unavailResult.rows, ...apptResult.rows].map(r => blockMinutes(r, date));

    const slotMin = biz.slot_duration_minutes;
    const slots = [];
    for (const wh of hoursResult.rows) {
      const workStart = toMinutes(wh.start_time);
      const workEnd   = toMinutes(wh.end_time);
      // Step at slot granularity, but require the full bookingWidth to be free.
      for (let t = workStart; t + bookingWidth <= workEnd; t += slotMin) {
        const slotEnd = t + bookingWidth;
        const blocked = blockedRanges.some(b => t < b.endMins && slotEnd > b.startMins);
        if (!blocked) slots.push(fromMinutes(t));
      }
    }

    res.json({ slots });
  } catch (err) {
    console.error('GET availability failed:', err);
    res.status(500).json({ error: err.message || 'Failed to compute availability' });
  }
});

// POST /:slug/appointments — guest-friendly, but stamps customer_id if logged in
businesses.post('/:slug/appointments', tryAuth, async (req, res) => {
  try {
    const { slug } = req.params;
    const { employeeId, date, startTime, customerName, customerEmail, customerPhone, notes, serviceId } = req.body || {};

    if (!employeeId || !date || !startTime || !customerName || !customerEmail) {
      return res.status(400).json({ error: 'employeeId, date, startTime, customerName, customerEmail are required' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD and startTime HH:MM' });
    }

    const bizResult = await db.query(
      `SELECT b.id, b.timezone, b.slot_duration_minutes
       FROM businesses b WHERE b.slug = $1 AND b.active = true`,
      [slug]
    );
    if (bizResult.rowCount === 0) return res.status(404).json({ error: 'Business not found' });
    const biz = bizResult.rows[0];
    const tz = safeTz(biz.timezone);

    const empResult = await db.query(
      'SELECT id FROM employees WHERE id = $1 AND business_id = $2 AND active = true',
      [employeeId, biz.id]
    );
    if (empResult.rowCount === 0) return res.status(404).json({ error: 'Employee not found' });

    // Determine appointment duration from the service (if any) or fall back to slot_duration_minutes
    let durationMinutes = biz.slot_duration_minutes;
    if (serviceId) {
      const svcRes = await db.query(
        'SELECT duration_minutes FROM services WHERE id = $1 AND business_id = $2 AND active = true',
        [serviceId, biz.id]
      );
      if (svcRes.rowCount === 0) return res.status(404).json({ error: 'Service not found' });
      durationMinutes = svcRes.rows[0].duration_minutes;
    }

    const startsRow = await db.query(
      `SELECT ($1::date + $2::time)::timestamp AT TIME ZONE $3 AS ts`,
      [date, startTime, tz]
    );
    const endsRow = await db.query(
      `SELECT ($1::date + $2::time + ($3 || ' minutes')::interval)::timestamp AT TIME ZONE $4 AS ts`,
      [date, startTime, String(durationMinutes), tz]
    );

    const customerId = req.user?.sub || null;

    const insert = await db.query(
      `INSERT INTO appointments
         (business_id, employee_id, service_id, customer_id, customer_name, customer_email, customer_phone, starts_at, ends_at, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, starts_at, ends_at, customer_name, customer_email, status`,
      [biz.id, employeeId, serviceId || null, customerId, customerName, customerEmail,
       customerPhone || null, startsRow.rows[0].ts, endsRow.rows[0].ts, notes || null]
    );

    res.status(201).json(insert.rows[0]);
  } catch (err) {
    console.error('POST appointment failed:', err);
    res.status(500).json({ error: err.message || 'Failed to create appointment' });
  }
});

export default businesses;
