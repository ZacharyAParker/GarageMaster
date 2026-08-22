// Authentication: register first admin, login (with first-claim flow),
// sessions, password changes and admin user management.
import { Router } from 'express';
import crypto from 'crypto';
import { pgPool, nextId, notifyChange } from '../db.js';
import { hashPassword, verifyPassword } from '../lib/crypto.js';

const router = Router();

const SESSION_COOKIE = 'gm_session';
const SESSION_DAYS = 30;

// ---- session helpers ----
export async function requireUser(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return res.status(401).json({ error: 'Not signed in' });
  const r = await pgPool.query(
    `SELECT u.id, u.payload FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token]
  );
  if (!r.rows[0]) return res.status(401).json({ error: 'Not signed in' });
  req.user = { id: r.rows[0].id, ...r.rows[0].payload };
  next();
}

export async function requireAdmin(req, res, next) {
  await requireUser(req, res, () => {
    if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin privileges required' });
    next();
  });
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true',
    maxAge: SESSION_DAYS * 86400000,
    path: '/',
  });
}

async function createSession(res, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  await pgPool.query(
    `INSERT INTO sessions (token, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [token, userId, String(SESSION_DAYS)]
  );
  setSessionCookie(res, token);
}

function safeUser(row) {
  if (!row) return null;
  const { password_hash, password_salt, ...rest } = row.payload;
  return rest;
}

router.use((req, res, next) => {
  // cookie parsing without the cookie-parser dep
  const raw = req.headers.cookie || '';
  req.cookies = Object.fromEntries(
    raw.split(';').filter(Boolean).map((c) => {
      const i = c.indexOf('=');
      return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1).trim())];
    })
  );
  next();
});

router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (!token) return res.json(null);
    const r = await pgPool.query(
      `SELECT u.id, u.payload FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > now()`,
      [token]
    );
    if (!r.rows[0]) return res.json(null);
    res.json({ id: r.rows[0].id, ...safeUser({ payload: r.rows[0].payload }) });
  } catch (e) {
    res.status(500).json({ error: 'me failed' });
  }
});

router.get('/is-setup-complete', async (_req, res) => {
  const r = await pgPool.query('SELECT COUNT(*)::int AS n FROM users');
  res.json(r.rows[0].n > 0);
});

router.post('/register-first-admin', async (req, res) => {
  const { full_name, email, password } = req.body || {};
  if (!password || String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const count = await pgPool.query('SELECT COUNT(*)::int AS n FROM users');
  if (count.rows[0].n > 0) return res.status(400).json({ error: 'Setup already completed' });
  const { hashB64, saltB64 } = hashPassword(password);
  const id = await nextId('user');
  const now = new Date().toISOString();
  const payload = {
    full_name: full_name || 'Administrator',
    email: email || 'admin@localhost',
    role: 'admin',
    position: 'admin',
    password_hash: hashB64,
    password_salt: saltB64,
    created_date: now,
    updated_date: now,
  };
  await pgPool.query('INSERT INTO users (id, payload) VALUES ($1, $2)', [id, payload]);
  await createSession(res, id);
  notifyChange();
  res.json({ id, ...safeUser({ payload }) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const r = await pgPool.query(`SELECT id, payload FROM users WHERE lower(payload->>'email') = lower($1)`, [email || '']);
  const row = r.rows[0];
  if (!row) return res.status(401).json({ error: 'Invalid credentials' });

  let payload = row.payload;
  // First-claim flow: no hash yet means this login sets the password
  if (!payload.password_hash) {
    if (!password || String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const { hashB64, saltB64 } = hashPassword(password);
    payload = { ...payload, password_hash: hashB64, password_salt: saltB64, updated_date: new Date().toISOString() };
    await pgPool.query('UPDATE users SET payload = $2, updated_at = now() WHERE id = $1', [row.id, payload]);
  } else if (!verifyPassword(password || '', payload.password_hash, payload.password_salt)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await createSession(res, row.id);
  res.json({ id: row.id, ...safeUser({ payload }) });
});

router.post('/logout', async (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) await pgPool.query('DELETE FROM sessions WHERE token = $1', [token]);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json(true);
});

router.put('/update-me', requireUser, async (req, res) => {
  const allowed = {};
  for (const k of ['full_name', 'phone', 'avatar_url']) {
    if (k in req.body) allowed[k] = req.body[k];
  }
  const r = await pgPool.query('SELECT payload FROM users WHERE id = $1', [req.user.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'User not found' });
  const p = r.rows[0].payload;
  Object.assign(p, allowed);
  p.updated_date = new Date().toISOString();
  await pgPool.query('UPDATE users SET payload = $2, updated_at = now() WHERE id = $1', [req.user.id, p]);
  notifyChange();
  res.json({ id: req.user.id, ...safeUser({ payload: p }) });
});

router.post('/change-password', requireUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' });
  }
  const r = await pgPool.query('SELECT payload FROM users WHERE id = $1', [req.user.id]);
  const p = r.rows[0]?.payload;
  if (!p) return res.status(404).json({ error: 'User not found' });
  if (p.password_hash && !verifyPassword(currentPassword || '', p.password_hash, p.password_salt)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  const { hashB64, saltB64 } = hashPassword(newPassword);
  p.password_hash = hashB64;
  p.password_salt = saltB64;
  p.updated_date = new Date().toISOString();
  await pgPool.query('UPDATE users SET payload = $2, updated_at = now() WHERE id = $1', [req.user.id, p]);
  res.json({ ok: true });
});

router.get('/list-users', requireUser, async (_req, res) => {
  const r = await pgPool.query('SELECT id, payload FROM users ORDER BY payload->>\'full_name\'');
  res.json(r.rows.map((row) => ({ id: row.id, ...safeUser({ payload: row.payload }) })));
});

router.post('/admin/create-user', requireAdmin, async (req, res) => {
  const { full_name, email, password, role = 'staff', position = 'mechanic' } = req.body || {};
  if (!full_name || !email) return res.status(400).json({ error: 'Name and email are required' });
  const dup = await pgPool.query(`SELECT 1 FROM users WHERE lower(payload->>'email') = lower($1)`, [email]);
  if (dup.rows[0]) return res.status(400).json({ error: 'Email already in use' });
  const { hashB64, saltB64 } = hashPassword(password || '');
  const id = await nextId('user');
  const now = new Date().toISOString();
  const payload = {
    full_name, email, role, position,
    password_hash: hashB64, password_salt: saltB64,
    created_date: now, updated_date: now,
  };
  await pgPool.query('INSERT INTO users (id, payload) VALUES ($1, $2)', [id, payload]);
  notifyChange();
  res.json({ id, ...safeUser({ payload }) });
});

router.post('/admin/reset-password', requireAdmin, async (req, res) => {
  const { userId, newPassword } = req.body || {};
  if (!newPassword || String(newPassword).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const r = await pgPool.query('SELECT payload FROM users WHERE id = $1', [userId]);
  if (!r.rows[0]) return res.status(404).json({ error: 'User not found' });
  const p = r.rows[0].payload;
  const { hashB64, saltB64 } = hashPassword(newPassword);
  p.password_hash = hashB64;
  p.password_salt = saltB64;
  p.updated_date = new Date().toISOString();
  await pgPool.query('UPDATE users SET payload = $2, updated_at = now() WHERE id = $1', [userId, p]);
  // Kill existing sessions so the temp password is the only way in
  await pgPool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  notifyChange();
  res.json({ id: userId, ...safeUser({ payload: p }) });
});

const USER_FIELDS = ['full_name', 'email', 'role', 'position', 'phone', 'specialties', 'skills',
  'certifications', 'hourly_wage', 'hire_date', 'avatar_url', 'jobs_completed', 'xp_points'];

router.post('/admin/update-user', requireAdmin, async (req, res) => {
  const { userId, updates } = req.body || {};
  const r = await pgPool.query('SELECT payload FROM users WHERE id = $1', [userId]);
  if (!r.rows[0]) return res.status(404).json({ error: 'User not found' });
  const p = r.rows[0].payload;
  const allowed = {};
  for (const k of USER_FIELDS) if (k in (updates || {})) allowed[k] = updates[k];
  Object.assign(p, allowed);
  p.updated_date = new Date().toISOString();
  await pgPool.query('UPDATE users SET payload = $2, updated_at = now() WHERE id = $1', [userId, p]);
  notifyChange();
  res.json({ id: userId, ...safeUser({ payload: p }) });
});

router.post('/admin/delete-user', requireAdmin, async (req, res) => {
  const { userId } = req.body || {};
  if (userId === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  await pgPool.query('DELETE FROM users WHERE id = $1', [userId]);
  notifyChange();
  res.json({ ok: true });
});

export default router;
