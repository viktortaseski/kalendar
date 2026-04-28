import { Router } from 'express';
import { db } from '../dbConn.js';
import { requireAuth } from '../middleware/auth.js';

const users = Router();

users.get('/', async (req, res) => {
  const result = await db.query('SELECT * FROM users');
  res.json(result.rows);
});

// PUT /api/users/me/avatar — set the current user's avatar_url (pass null to clear)
users.put('/me/avatar', requireAuth, async (req, res) => {
  try {
    const { avatarUrl } = req.body || {};
    if (avatarUrl === undefined) {
      return res.status(400).json({ error: 'avatarUrl required (or null to clear)' });
    }
    const result = await db.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2
       RETURNING id, avatar_url`,
      [avatarUrl, req.user.sub]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/users/me/avatar failed:', err);
    res.status(500).json({ error: err.message || 'Failed to update avatar' });
  }
});

export default users;
