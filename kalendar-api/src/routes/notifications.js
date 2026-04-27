import { Router } from 'express';
import { db } from '../dbConn.js';
import { requireAuth } from '../middleware/auth.js';

const notifications = Router();

// GET /api/notifications — list current user's notifications, newest first
notifications.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, type, title, body, payload, read_at, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.sub]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET notifications failed:', err);
    res.status(500).json({ error: err.message || 'Failed to load notifications' });
  }
});

// GET /api/notifications/unread-count
notifications.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count
       FROM notifications
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.sub]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    console.error('GET unread count failed:', err);
    res.status(500).json({ error: err.message || 'Failed to load unread count' });
  }
});

// POST /api/notifications/:id/read
notifications.post('/:id/read', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE id = $1 AND user_id = $2 AND read_at IS NULL
       RETURNING id, read_at`,
      [req.params.id, req.user.sub]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Notification not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('POST notification read failed:', err);
    res.status(500).json({ error: err.message || 'Failed to mark read' });
  }
});

// POST /api/notifications/read-all
notifications.post('/read-all', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.sub]
    );
    res.json({ updated: result.rowCount });
  } catch (err) {
    console.error('POST notifications read-all failed:', err);
    res.status(500).json({ error: err.message || 'Failed to mark all read' });
  }
});

export default notifications;
