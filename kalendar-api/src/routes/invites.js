import { Router } from 'express';
import { db } from '../dbConn.js';
import { requireAuth } from '../middleware/auth.js';

const invites = Router();

// GET /api/invites/mine — current user's pending invites (with business + inviter info)
invites.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT i.id, i.business_id, i.email, i.name, i.status, i.created_at,
              b.slug AS business_slug, b.name AS business_name,
              u.full_name AS invited_by_name
       FROM employee_invites i
       JOIN businesses b ON b.id = i.business_id
       JOIN users u ON u.id = i.invited_by
       WHERE i.user_id = $1 AND i.status = 'pending'
       ORDER BY i.created_at DESC`,
      [req.user.sub]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /invites/mine failed:', err);
    res.status(500).json({ error: err.message || 'Failed to load invites' });
  }
});

// POST /api/invites/:id/accept
invites.post('/:id/accept', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const invRes = await client.query(
      `SELECT id, business_id, user_id, email, name
       FROM employee_invites
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       FOR UPDATE`,
      [req.params.id, req.user.sub]
    );
    if (invRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending invite not found' });
    }
    const invite = invRes.rows[0];

    const userRes = await client.query(
      'SELECT full_name FROM users WHERE id = $1',
      [req.user.sub]
    );
    const employeeName = invite.name || userRes.rows[0]?.full_name || invite.email;

    // Reuse an existing employee row (same email, no user link) if present, else insert.
    const existing = await client.query(
      `SELECT id FROM employees
       WHERE business_id = $1 AND user_id IS NULL AND LOWER(email) = LOWER($2)
       LIMIT 1`,
      [invite.business_id, invite.email]
    );
    let employeeId;
    if (existing.rowCount > 0) {
      employeeId = existing.rows[0].id;
      await client.query(
        'UPDATE employees SET user_id = $1, name = COALESCE(NULLIF($2, \'\'), name) WHERE id = $3',
        [req.user.sub, employeeName, employeeId]
      );
    } else {
      const ins = await client.query(
        `INSERT INTO employees (business_id, user_id, name, email)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [invite.business_id, req.user.sub, employeeName, invite.email]
      );
      employeeId = ins.rows[0].id;
    }

    await client.query(
      `UPDATE employee_invites
       SET status = 'accepted', responded_at = NOW()
       WHERE id = $1`,
      [invite.id]
    );

    await client.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE user_id = $1
         AND type = 'employee_invite'
         AND (payload->>'invite_id')::int = $2`,
      [req.user.sub, invite.id]
    );

    await client.query('COMMIT');
    res.json({ employee_id: employeeId, business_id: invite.business_id });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST invite accept failed:', err);
    res.status(500).json({ error: err.message || 'Failed to accept invite' });
  } finally {
    client.release();
  }
});

// POST /api/invites/:id/decline
invites.post('/:id/decline', requireAuth, async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const upd = await client.query(
      `UPDATE employee_invites
       SET status = 'declined', responded_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING id`,
      [req.params.id, req.user.sub]
    );
    if (upd.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending invite not found' });
    }
    await client.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE user_id = $1
         AND type = 'employee_invite'
         AND (payload->>'invite_id')::int = $2`,
      [req.user.sub, upd.rows[0].id]
    );
    await client.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('POST invite decline failed:', err);
    res.status(500).json({ error: err.message || 'Failed to decline invite' });
  } finally {
    client.release();
  }
});

export default invites;
