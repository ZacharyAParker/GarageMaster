// Backup export/restore. Export strips password hashes; restore keeps the
// same guarantee and returns per-entity counts (matches old behavior).
import { Router } from 'express';
import { pgPool, notifyChange } from '../db.js';
import { requireAdmin } from './auth.js';

const router = Router();

// Full wipe. Used by the danger zone in settings.
router.post('/reset', requireAdmin, async (_req, res) => {
  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM sessions');
    await client.query('DELETE FROM entities');
    await client.query('DELETE FROM users CASCADE');
    await client.query('DELETE FROM files');
    await client.query('DELETE FROM app_settings');
    await client.query('DELETE FROM id_counters');
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  notifyChange();
  res.json({ ok: true });
});

async function backupPayload() {
  const users = await pgPool.query('SELECT id, payload FROM users');
  const entities = await pgPool.query('SELECT name, id, payload FROM entities');
  const settings = await pgPool.query('SELECT payload FROM app_settings WHERE id = true');
  const byName = {};
  for (const row of entities.rows) {
    (byName[row.name] = byName[row.name] || []).push(row.payload);
  }
  return {
    version: 2,
    exported_at: new Date().toISOString(),
    data: {
      settings: settings.rows[0]?.payload || null,
      currentUserId: null,
      seq: 1,
      files: {},
      entities: {
        ...byName,
        User: users.rows.map((row) => {
          const { password_hash, password_salt, ...rest } = row.payload;
          // id lives as a column for users; put it in the doc so restores work
          return { id: row.id, ...rest };
        }),
      },
    },
    user_count: users.rowCount,
  };
}

router.get('/export', requireAdmin, async (_req, res) => {
  res.json(await backupPayload());
});

router.post('/restore', requireAdmin, async (req, res) => {
  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (!payload?.data?.entities) return res.status(400).json({ error: 'Invalid backup file' });

  const client = await pgPool.connect();
  const counts = {};
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM entities');
    await client.query('DELETE FROM users CASCADE');
    for (const [name, arr] of Object.entries(payload.data.entities)) {
      if (!Array.isArray(arr) || name === 'User') continue;
      for (const item of arr) {
        if (!item?.id) continue;
        const { id, created_date, updated_date, ...doc } = item;
        await client.query(
          `INSERT INTO entities (name, id, payload, created_date, updated_date)
           VALUES ($1, $2, $3::jsonb, COALESCE($4::timestamptz, now()), COALESCE($5::timestamptz, now()))
           ON CONFLICT (name, id) DO NOTHING`,
          [name, id, JSON.stringify({ ...doc, id, created_date, updated_date }), created_date || null, updated_date || null]
        );
      }
      counts[name] = arr.length;
    }
    // Users restored without hashes: each claims their password on next login
    for (const u of payload.data.entities.User || []) {
      if (!u?.id) continue;
      const { password_hash, password_salt, ...rest } = u;
      await client.query(
        `INSERT INTO users (id, payload) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING`,
        [u.id, JSON.stringify(rest)]
      );
    }
    counts.User = (payload.data.entities.User || []).length;
    if (payload.data.settings) {
      await client.query(
        `INSERT INTO app_settings (id, payload) VALUES (true, $1::jsonb)
         ON CONFLICT (id) DO UPDATE SET payload = $1::jsonb, updated_at = now()`,
        [JSON.stringify(payload.data.settings)]
      );
    }
    await client.query('DELETE FROM sessions'); // everyone signs in fresh
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  notifyChange();
  res.json({ ok: true, counts });
});

export default router;
