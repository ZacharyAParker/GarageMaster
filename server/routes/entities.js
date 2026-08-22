// Generic entity CRUD over the JSONB entities table.
// Mirrors the old localStorage client: list(orderBy), filter(query, orderBy,
// limit), get(id), create(data), update(id, patch), delete(id).
import { Router } from 'express';
import { pgPool, nextId, notifyChange } from '../db.js';
import { requireUser } from './auth.js';

const router = Router();
router.use(requireUser);

const ENTITY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

function orderBySql(orderBy) {
  if (!orderBy) return 'ORDER BY created_date DESC';
  const desc = orderBy.startsWith('-');
  const key = desc ? orderBy.slice(1) : orderBy;
  if (!ENTITY_RE.test(key)) return 'ORDER BY created_date DESC';
  // created_date/updated_date live as real columns; everything else in payload
  const col = key === 'created_date' ? 'created_date' : key === 'updated_date' ? 'updated_date' : `payload->>'${key}'`;
  return `ORDER BY ${col} ${desc ? 'DESC' : 'ASC'} NULLS LAST`;
}

router.param('name', (req, res, next, name) => {
  if (!ENTITY_RE.test(name)) return res.status(400).json({ error: 'Invalid entity name' });
  req.entityName = name;
  next();
});

// list(orderBy)
router.get('/:name', async (req, res) => {
  const r = await pgPool.query(
    `SELECT id, payload, created_date FROM entities WHERE name = $1 ${orderBySql(req.query.orderBy)}`,
    [req.entityName]
  );
  res.json(r.rows.map((row) => ({ ...row.payload })));
});

// filter(query, orderBy, limit) - query is JSON, values matched exactly or by
// case-insensitive substring for strings (same behavior as the old client)
router.post('/:name/filter', async (req, res) => {
  const { query = {}, orderBy, limit } = req.body || {};
  const where = ['name = $1'];
  const params = [req.entityName];
  let n = 2;
  for (const [k, v] of Object.entries(query)) {
    if (v == null) continue;
    if (!ENTITY_RE.test(k)) continue;
    params.push(v);
    const isString = typeof v === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(v);
    if (isString && !['status', 'priority'].includes(k)) {
      where.push(`payload->>'${k}' ILIKE '%' || $${n} || '%'`);
    } else {
      where.push(`payload->>'${k}' = $${n}`);
    }
    n++;
    if (n > 20) break;
  }
  let sql = `SELECT id, payload FROM entities WHERE ${where.join(' AND ')} ${orderBySql(orderBy)}`;
  if (limit != null) sql += ` LIMIT ${Math.max(1, Math.min(Number(limit) || 50, 500))}`;
  const r = await pgPool.query(sql, params);
  res.json(r.rows.map((row) => ({ ...row.payload })));
});

// get(id)
router.get('/:name/:id', async (req, res) => {
  const r = await pgPool.query(
    `SELECT payload FROM entities WHERE name = $1 AND id = $2`,
    [req.entityName, req.params.id]
  );
  if (!r.rows[0]) return res.status(404).json({ error: `${req.entityName} not found` });
  res.json({ ...r.rows[0].payload });
});

// create(data)
router.post('/:name', async (req, res) => {
  const data = { ...(req.body || {}) };
  // These fields are server-owned. Clients do not get a vote.
  for (const k of ['id', 'created_date', 'updated_date']) delete data[k];
  const id = await nextId(req.entityName.toLowerCase());
  const now = new Date().toISOString();
  const payload = { ...data, id, created_date: now, updated_date: now };
  await pgPool.query(
    `INSERT INTO entities (name, id, payload) VALUES ($1, $2, $3)`,
    [req.entityName, id, JSON.stringify(payload)]
  );
  notifyChange();
  res.status(201).json(payload);
});

// update(id, patch)
const IMMUTABLE_FIELDS = ['id', 'created_date'];
router.put('/:name/:id', async (req, res) => {
  const patch = { ...(req.body || {}) };
  // id and created_date are immutable; updated_date is set by the server
  for (const k of IMMUTABLE_FIELDS) delete patch[k];
  delete patch.updated_date;
  const r = await pgPool.query(
    `UPDATE entities SET payload = jsonb_strip_nulls(payload || $3::jsonb) || jsonb_build_object('updated_date', to_jsonb(now()::text)), updated_date = now()
     WHERE name = $1 AND id = $2 RETURNING payload`,
    [req.entityName, req.params.id, JSON.stringify(patch)]
  );
  if (!r.rows[0]) return res.status(404).json({ error: `${req.entityName} not found` });
  notifyChange();
  res.json({ ...r.rows[0].payload });
});

// delete(id)
router.delete('/:name/:id', async (req, res) => {
  const r = await pgPool.query(
    `DELETE FROM entities WHERE name = $1 AND id = $2`,
    [req.entityName, req.params.id]
  );
  if (!r.rowCount) return res.status(404).json({ error: `${req.entityName} not found` });
  notifyChange();
  res.json({ id: req.params.id });
});

export default router;
