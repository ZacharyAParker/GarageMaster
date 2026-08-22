// File uploads (avatars etc). Stored as base64 text in Postgres, served
// back as data URLs - same shape the UI already consumes.
import { Router } from 'express';
import { pgPool, nextId } from '../db.js';
import { requireUser } from './auth.js';

const router = Router();

router.post('/', requireUser, async (req, res) => {
  const { file_name, mime_type, content } = req.body || {};
  if (!content) return res.status(400).json({ error: 'content is required' });
  const byteSize = Math.floor((content.length * 3) / 4);
  if (byteSize > 10 * 1024 * 1024) return res.status(413).json({ error: 'File too large' });
  const id = await nextId('file');
  await pgPool.query(
    `INSERT INTO files (id, file_name, mime_type, byte_size, content) VALUES ($1, $2, $3, $4, $5)`,
    [id, file_name || 'upload', mime_type || 'application/octet-stream', byteSize, content]
  );
  res.json({ file_url: content, id });
});

router.get('/:id', requireUser, async (req, res) => {
  const r = await pgPool.query('SELECT content FROM files WHERE id = $1', [req.params.id]);
  if (!r.rows[0]) return res.status(404).json({ error: 'file not found' });
  res.json({ url: r.rows[0].content });
});

export default router;
