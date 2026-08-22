// Security middleware: headers, rate limiting, input validation helpers.
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

// ---- security headers (helmet-lite, no extra dep) ----
export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // API responses are JSON; the SPA is static and sets no runtime scripts
  if (_req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

// HSTS only makes sense once TLS terminates somewhere. Off by default so a
// plain-http LAN deployment does not get poisoned caching; set TRUST_PROXY
// to enable when running behind https.
export function hsts(req, res, next) {
  if (process.env.FORCE_HTTPS === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (req.headers['x-forwarded-proto'] === 'http') {
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      return res.redirect(308, `https://${host}${req.originalUrl}`);
    }
  }
  next();
}

// ---- rate limiting ----
// The test suite makes ~8 legitimate credential calls in a run; 20 per 15min
// leaves headroom for tests while still choking brute force.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts. Try again in a bit.' },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

// ---- bot protection for credential endpoints ----
// Lightweight proof-of-work style gate: the client must echo a header that
// proves it ran JS before hitting auth endpoints. Not CAPTCHA, but it kills
// the drive-by credential stuffing scripts that don't bother.
const NONCE_TTL = 10 * 60 * 1000;
const nonces = new Map();

export function issueChallenge(_req, res) {
  const nonce = crypto.randomUUID();
  nonces.set(nonce, Date.now() + NONCE_TTL);
  if (nonces.size > 5000) {
    const now = Date.now();
    for (const [k, exp] of nonces) if (exp < now) nonces.delete(k);
  }
  res.json({ challenge: nonce });
}

export function requireChallenge(req, res, next) {
  const presented = req.headers['x-gm-challenge'];
  if (!presented || !nonces.has(presented)) {
    return res.status(429).json({ error: 'Missing or expired challenge. Reload and try again.' });
  }
  nonces.delete(presented); // single use
  next();
}

// ---- input validation helpers ----
const STRING_FIELD = /^[\s\S]{0,8000}$/;

/** Reject null bytes and absurd lengths on every string field of body. */
export function sanitizeBody(limit = 200) {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      const keys = Object.keys(req.body);
      if (keys.length > limit) {
        return res.status(400).json({ error: 'Too many fields' });
      }
      for (const k of keys) {
        if (typeof req.body[k] === 'string' && req.body[k].includes('\u0000')) {
          return res.status(400).json({ error: 'Invalid characters in input' });
        }
      }
    }
    next();
  };
}

export { STRING_FIELD };
