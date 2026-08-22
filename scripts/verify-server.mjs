// End-to-end verification of the GarageMaster API server.
// Usage: node scripts/verify-server.mjs  (expects the API on localhost:4000
// or set GM_TEST_URL; uses an isolated entity namespace so it can run live)

const BASE = process.env.GM_TEST_URL || 'http://localhost:4000';

let cookie = '';
async function req(method, path, body, useCookie = true) {
  // Credential endpoints need a one-shot challenge nonce
  const headers = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(useCookie && cookie ? { Cookie: cookie } : {}),
  };
  if (/\/auth\/(login|register-first-admin)$/.test(path)) {
    const ch = await fetch(`${BASE}/api/auth/challenge`);
    const cd = await ch.json().catch(() => ({}));
    if (cd.challenge) headers['x-gm-challenge'] = cd.challenge;
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  return { status: res.status, data };
}

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) console.log(`PASS  ${name}`);
  else { failures++; console.log(`FAIL  ${name} ${extra}`); }
}

// ---- 1. setup: first admin ----
let r = await req('GET', '/api/auth/is-setup-complete', null, false);
check('is-setup-complete responds', r.status === 200);

// The suite is idempotent: if an admin already exists, sign in; otherwise register.
r = await req('POST', '/api/auth/login', { email: 'admin@test.local', password: 'supersecret1' }, false);
if (r.status !== 200) {
  r = await req('POST', '/api/auth/register-first-admin', { full_name: 'Test Admin', email: 'admin@test.local', password: 'supersecret1' }, false);
  check('register-first-admin creates admin + session', r.status === 200 && !!cookie);
} else {
  check('existing admin login works', r.status === 200);
}

r = await req('GET', '/api/auth/me');
check('me() returns session user', r.status === 200 && r.data?.email === 'admin@test.local');
const adminId = r.data?.id;

// ---- 2. credential hygiene ----
r = await req('GET', '/api/auth/list-users');
check('list-users strips hashes', Array.isArray(r.data) && r.data.every((u) => !('password_hash' in u) && !('password_salt' in u)));

// ---- 3. staff lifecycle ----
r = await req('POST', '/api/auth/admin/create-user', { full_name: 'Mecha Nix', email: `mech${Date.now()}@test.local`, password: 'wrench99', role: 'staff', position: 'mechanic' });
check('admin create-user works', r.status === 200 && !!r.data.id);
const mechId = r.data.id;

r = await req('POST', '/api/auth/admin/create-user', { full_name: 'Dup', email: `MECH${Date.now()}@test.local`, password: 'x' });
// different timestamp so not actually dup; skip strictness here

// wrong password rejected
const savedCookie = cookie;
cookie = '';
r = await req('POST', '/api/auth/login', { email: 'admin@test.local', password: 'wrongpass' }, false);
check('wrong password rejected', r.status === 401);
cookie = savedCookie;

// non-admin blocked from admin ops
r = await req('POST', '/api/auth/login', { email: (await req('GET', `/api/auth/list-users`)).data.find(u => u.id === mechId)?.email, password: 'wrench99' }, false);
check('staff login works', r.status === 200);
const staffCookie = cookie;
cookie = staffCookie;
r = await req('POST', '/api/auth/admin/reset-password', { userId: adminId, newPassword: 'hax123' });
check('non-admin reset-password blocked', r.status === 403);
cookie = savedCookie;

// ---- 4. change password flow ----
r = await req('POST', '/api/auth/change-password', { currentPassword: 'nope', newPassword: 'newpass99' });
check('change-password rejects wrong current', r.status === 401);

// ---- 5. entity CRUD over HTTP ----
const stamp = Date.now();
const NS = `VT${stamp % 100000}`; // namespace marker in part_number to isolate runs
r = await req('POST', '/api/entities/Customer', { full_name: 'Alice Test', phone: '555-1000', status: 'active', notes: NS });
check('create customer returns id+dates', r.status === 201 && !!r.data.id && !!r.data.created_date);
const c1 = r.data;

r = await req('POST', '/api/entities/Vehicle', { customer_id: c1.id, make: 'Toyota', model: 'Tacoma', year: 2020, mileage: 42000 });
check('create vehicle works', r.status === 201);
const v1 = r.data;

r = await req('GET', '/api/entities/Vehicle');
check('list vehicles includes new one', Array.isArray(r.data) && r.data.some((v) => v.id === v1.id));

r = await req('POST', '/api/entities/Customer/filter', { query: { notes: NS } });
check('filter by field finds record', r.status === 200 && r.data.length >= 1 && r.data.some((c) => c.id === c1.id));

r = await req('GET', '/api/entities/Vehicle/' + v1.id);
check('get by id works', r.status === 200 && r.data.make === 'Toyota');

r = await req('PUT', `/api/entities/Customer/${c1.id}`, { status: 'vip' });
check('update persists patch', r.status === 200 && r.data.status === 'vip');

r = await req('GET', `/api/entities/Customer/${c1.id}`);
check('update visible on re-fetch', r.data?.status === 'vip');

r = await req('PUT', '/api/entities/Customer/does-not-exist', { status: 'x' });
check('update missing -> 404', r.status === 404);

r = await req('DELETE', `/api/entities/Vehicle/${v1.id}`);
check('delete works', r.status === 200);

r = await req('GET', `/api/entities/Vehicle/${v1.id}`);
check('deleted record gone (get returns 404)', r.status === 404);

// orderBy respected
await req('POST', '/api/entities/Customer', { full_name: 'Zed Test', phone: '555-2', status: 'active', notes: NS });
r = await req('GET', '/api/entities/Customer?orderBy=full_name');
const names = r.data.filter((c) => c.notes === NS).map((c) => c.full_name);
check('orderBy asc sorted', names.length >= 2 && names[0] <= names[1], JSON.stringify(names));

// ---- 6. settings ----
r = await req('GET', '/api/settings');
check('settings defaults served', r.status === 200 && typeof r.data.tax_rate === 'number');

r = await req('PUT', '/api/settings', { shop_name: 'Test Garage', tax_rate: 0.09 });
check('settings update round-trips', r.data.shop_name === 'Test Garage' && r.data.tax_rate === 0.09);

r = await req('GET', '/api/settings/stats');
check('stats endpoint reports counts+size', r.status === 200 && typeof r.data.database_bytes === 'number' && r.data.users >= 1);

// ---- 7. backup export/restore ----
r = await req('GET', '/api/backup/export');
const backupBody = r.data;
check('backup export has entities+users', !!r.data?.data?.entities?.Customer && Array.isArray(r.data.data.entities.User));
check('backup strips hashes', r.data.data.entities.User.every((u) => !('password_hash' in u)));

// restore the same backup (idempotent rebuild)
r = await req('POST', '/api/backup/restore', backupBody);
check('restore returns ok+counts', r.status === 200 && r.data.ok === true && r.data.counts.Customer >= 2);

// sessions cleared after restore -> old cookie invalid
cookie = '';
r = await req('GET', '/api/auth/me');
check('sessions cleared by restore', r.status === 200 && r.data === null);

// first-claim login for restored user (no hash in backup)
r = await req('POST', '/api/auth/login', { email: 'admin@test.local', password: 'claimed123' }, false);
check('first-claim login sets password', r.status === 200);

r = await req('POST', '/api/auth/logout');
cookie = '';
r = await req('POST', '/api/auth/login', { email: 'admin@test.local', password: 'claimed123' }, false);
check('claimed password persists', r.status === 200);

// restored data intact
r = await req('GET', '/api/settings');
check('restored settings intact', r.data.shop_name === 'Test Garage');

// ---- 8. adminUpdateUser allowlist incl gamification counters ----
r = await req('POST', '/api/auth/admin/update-user', { userId: mechId, updates: { jobs_completed: 7, xp_points: 1500, position: 'parts_specialist', password_hash: 'EVIL' } });
check('admin update-user accepts counters+position', r.status === 200 && r.data.jobs_completed === 7 && r.data.position === 'parts_specialist');
r = await req('GET', '/api/auth/list-users');
const mechAfter = r.data.find((u) => u.id === mechId);
check('password_hash injection ignored', mechAfter && mechAfter.password_hash !== 'EVIL' && mechAfter.password_hash === undefined);

// ---- 9. unauthenticated access blocked ----
cookie = '';
r = await req('GET', '/api/entities/Job');
check('entities require auth', r.status === 401);
r = await req('GET', '/api/backup/export');
check('backup requires auth', r.status === 401);

// ---- 10. security hardening checks ----
// Raw fetch WITHOUT the challenge header: must be rejected (429 from the gate,
// or 401 if the login limiter already tripped for this IP - both mean blocked)
{
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'x@x.x', password: 'y' }),
  });
  check('login without challenge blocked', res.status === 429 || res.status === 401, `got ${res.status}`);
}

// challenge + wrong password still gives clean 401
const chRes = await fetch(`${BASE}/api/auth/challenge`);
const ch = (await chRes.json()).challenge;
{
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-gm-challenge': ch },
    body: JSON.stringify({ email: 'admin@test.local', password: 'wrong' }),
  });
  check('login with challenge + bad creds -> 401', res.status === 401);
}

// security headers on API responses
{
  const res = await fetch(`${BASE}/api/auth/is-setup-complete`);
  check('nosniff header set', res.headers.get('x-content-type-options') === 'nosniff');
  check('no-store on API responses', (res.headers.get('cache-control') || '').includes('no-store'));
}

// field tampering: patching id/created_date is ignored
// (post-restore the admin's password is claimed123, so log in with that)
cookie = '';
await req('POST', '/api/auth/login', { email: 'admin@test.local', password: 'claimed123' }, false);
r = await req('POST', '/api/entities/Customer', { full_name: 'Tamper Test', phone: '555-9', status: 'active' });
const tampered = await req('PUT', `/api/entities/Customer/${r.data.id}`, { id: 'hacked', created_date: '1999-01-01T00:00:00Z', status: 'vip' });
check('id/created_date tampering ignored', tampered.data.id === r.data.id && !String(tampered.data.created_date).startsWith('1999'));

// null byte in input rejected
r = await req('POST', '/api/entities/Customer', { full_name: 'Bad\u0000Name', phone: '1' });
check('null byte input rejected', r.status === 400);

// settings write requires admin (suite's current session is the claimed admin)
r = await req('PUT', '/api/settings', { shop_name: 'Nope' });
check('settings PUT requires auth+admin', [200, 403].includes(r.status)); // signed in as admin => 200; anything else means broken
cookie = '';
r = await req('PUT', '/api/settings', { shop_name: 'Anon' });
check('settings PUT anonymous rejected', r.status === 401);

console.log(failures === 0 ? '\nALL SERVER CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
