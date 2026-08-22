// PostgreSQL pool, change bus for SSE, and ID generation.
import pg from 'pg';

export const pgPool = new pg.Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'garagemaster',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  max: 10,
});

// Simple in-process pub/sub. Every mutation bumps it; /api/events streams it.
const listeners = new Set();
export const changeBus = {
  add(fn) { listeners.add(fn); },
  remove(fn) { listeners.delete(fn); },
  emit() { for (const fn of listeners) { try { fn(); } catch { /* dead client */ } } },
};

// Exposed so index.js can wire the SSE endpoint without an import cycle
globalThis.__gmDb = { changeBus };

export function notifyChange() {
  changeBus.emit();
}

/** Generate the next id like job_lx2c9p_a3. Mirrors the old client-side format. */
export async function nextId(prefix) {
  const res = await pgPool.query(
    `INSERT INTO id_counters (prefix, value) VALUES ($1, 1)
     ON CONFLICT (prefix) DO UPDATE SET value = id_counters.value + 1
     RETURNING value`,
    [prefix]
  );
  const n = res.rows[0].value;
  return `${prefix}_${Date.now().toString(36)}_${n.toString(36)}`;
}
