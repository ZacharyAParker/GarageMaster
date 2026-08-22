// GarageMaster API server.
// Express + PostgreSQL. One JSONB table per entity, cookie sessions,
// SSE for live updates across browsers and devices.

import express from 'express';
import cookieParser from 'cookie-parser';
import { sep } from 'path';
import { pgPool } from './db.js';
import { securityHeaders, hsts, apiLimiter, sanitizeBody } from './lib/security.js';
import authRoutes from './routes/auth.js';
import entityRoutes from './routes/entities.js';
import settingsRoutes from './routes/settings.js';
import backupRoutes from './routes/backup.js';
import fileRoutes from './routes/files.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(hsts);
app.use(securityHeaders);
app.use(apiLimiter);
app.use(express.json({ limit: '15mb' }));
app.use(cookieParser());
app.use(sanitizeBody());

app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/files', fileRoutes);

// Live change stream. Any mutation pings every open browser instantly.
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('retry: 3000\n\n');
  const listener = () => {
    try { res.write('data: changed\n\n'); } catch { /* client gone */ }
  };
  onChange(listener);
  req.on('close', () => offChange(listener));
});

import { changeBus } from './db.js';
function onChange(fn) { changeBus.add(fn); }
function offChange(fn) { changeBus.remove(fn); }

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Static SPA with client-side routing fallback.
// In production the layout is /app/dist + /app/server, i.e. ../dist from here;
// fall back to ./dist for running from the repo root.
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const distDir = process.env.DIST_DIR || path.resolve(here, '../dist');
app.use(express.static(distDir, { index: 'index.html', maxAge: '1h', setHeaders: (res, path) => {
  if (path.includes(`${sep}assets${sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
}}));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile('index.html', { root: distDir });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler: keep internals out of responses
app.use((err, req, res, _next) => {
  console.error(err.stack || err.message);
  if (res.headersSent) return;
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 4000);

async function ensureSchema() {
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS entities (
      name TEXT NOT NULL,
      id TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_date TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_date TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (name, id)
    );
    CREATE INDEX IF NOT EXISTS entities_name_idx ON entities (name);
    CREATE INDEX IF NOT EXISTS entities_payload_gin ON entities USING GIN (payload jsonb_path_ops);
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      mime_type TEXT,
      byte_size BIGINT,
      content TEXT NOT NULL,
      created_date TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS id_counters (
      prefix TEXT PRIMARY KEY,
      value BIGINT NOT NULL DEFAULT 1
    );
  `);
}

pgPool.query('SELECT 1')
  .then(() => ensureSchema())
  .then(() => {
    app.listen(PORT, () => console.log(`GarageMaster API listening on :${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
