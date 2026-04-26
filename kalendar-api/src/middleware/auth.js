import jwt from 'jsonwebtoken';

// Best-effort auth: sets req.user if a valid token is present, otherwise continues anonymously.
export function tryAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch { /* ignore — fall through as anonymous */ }
  }
  next();
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { sub: <user id>, email }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
