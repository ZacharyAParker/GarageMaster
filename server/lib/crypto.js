// Shared helpers for route modules.
import crypto from 'crypto';

/** PBKDF2-SHA256 with per-user salt. */
export function hashPassword(password, saltBuf) {
  const salt = saltBuf || crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(String(password), salt, 100000, 32, 'sha256');
  return { hashB64: hash.toString('base64'), saltB64: salt.toString('base64') };
}

export function verifyPassword(password, storedHashB64, storedSaltB64) {
  try {
    const { hashB64 } = hashPassword(password, Buffer.from(storedSaltB64, 'base64'));
    const a = Buffer.from(hashB64, 'base64');
    const b = Buffer.from(storedHashB64, 'base64');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
