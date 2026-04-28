import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../dbConn.js';
import { requireAuth } from '../middleware/auth.js';

const auth = Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone,
    avatarUrl: row.avatar_url ?? null,
  };
}

// POST /api/auth/register
auth.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body || {};

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'fullName, email, password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const insert = await db.query(
      `INSERT INTO users (email, password_hash, full_name, phone)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, full_name, phone, avatar_url`,
      [email, passwordHash, fullName, phone || null]
    );

    const user = insert.rows[0];
    res.status(201).json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('POST /api/auth/register failed:', err);
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
auth.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const result = await db.query(
      'SELECT id, email, full_name, phone, avatar_url, password_hash FROM users WHERE email = $1',
      [email]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('POST /api/auth/login failed:', err);
    res.status(500).json({ error: err.message || 'Login failed' });
  }
});

// GET /api/auth/me — current user from token
auth.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, full_name, phone, avatar_url FROM users WHERE id = $1',
      [req.user.sub]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: publicUser(result.rows[0]) });
  } catch (err) {
    console.error('GET /api/auth/me failed:', err);
    res.status(500).json({ error: err.message || 'Failed to load user' });
  }
});

export default auth;
