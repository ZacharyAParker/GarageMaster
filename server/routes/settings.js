// Shop settings: single JSONB row.
import { Router } from 'express';
import { pgPool, notifyChange } from '../db.js';

const router = Router();

const DEFAULTS = {
  shop_name: 'GarageMaster Shop',
  tax_rate: 0.0825,
  default_labor_rate: 85,
  currency: 'USD',
  address: '',
  phone: '',
  email: '',
};

router.get('/', async (_req, res) => {
  const r = await pgPool.query('SELECT payload FROM app_settings WHERE id = true');
  res.json({ ...DEFAULTS, ...(r.rows[0]?.payload || {}) });
});

router.put('/', async (req, res) => {
  const current = await pgPool.query('SELECT payload FROM app_settings WHERE id = true');
  const merged = { ...DEFAULTS, ...(current.rows[0]?.payload || {}), ...req.body };
  await pgPool.query(
    `INSERT INTO app_settings (id, payload) VALUES (true, $1)
     ON CONFLICT (id) DO UPDATE SET payload = $1, updated_at = now()`,
    [JSON.stringify(merged)]
  );
  notifyChange();
  res.json(merged);
});

// Shop stats for the data management screen.
router.get('/stats', async (_req, res) => {
  const counts = await pgPool.query(
    `SELECT 'users' AS label, COUNT(*)::int AS n FROM users
     UNION ALL SELECT name, COUNT(*)::int FROM entities GROUP BY name`
  );
  const size = await pgPool.query(`SELECT pg_database_size(current_database())::bigint AS bytes`);
  const out = { database_bytes: Number(size.rows[0].bytes) };
  for (const row of counts.rows) out[row.label] = row.n;
  res.json(out);
});

export default router;
