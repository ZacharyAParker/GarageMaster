// Functional verification of the GarageMaster data layer (src/api/client.js).
// Run: node scripts/verify-client.mjs
// Shims browser globals, then exercises auth, CRUD, settings, backup/restore.

// ---- Browser global shims (Node 24 has WebCrypto built in) ----
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
};
globalThis.BroadcastChannel = class {
  constructor() {}
  postMessage() {}
  close() {}
};
globalThis.window = globalThis;
globalThis.document = { createElement: () => ({ click() {}, remove() {} }), body: { appendChild() {} } };

const { default: api } = await import('../src/api/client.js');

let failures = 0;
function check(name, cond, extra = '') {
  if (cond) {
    console.log(`PASS  ${name}`);
  } else {
    failures++;
    console.log(`FAIL  ${name} ${extra}`);
  }
}

// ---- 1. Setup: first admin registration ----
const admin = await api.auth.registerFirstAdmin({
  full_name: 'Test Admin',
  email: 'admin@test.local',
  password: 'supersecret1',
});
check('registerFirstAdmin creates admin', !!admin.id && admin.role === 'admin');
check('me() returns session user', (await api.auth.me())?.email === 'admin@test.local');

// ---- 2. Credential hygiene ----
const users = await api.auth.listUsers();
check('listUsers strips password material', users.length === 1 && !('password_hash' in users[0]) && !('password_salt' in users[0]));

const rawUsers = (JSON.parse(localStorage.getItem('garagemaster_data_v1')).entities.User) || [];
check('raw storage still holds hash (auth needs it)', rawUsers.length === 1 && !!rawUsers[0].password_hash);

// ---- 3. Staff user lifecycle ----
const mech = await api.auth.adminCreateUser({
  full_name: 'Mecha Nix', email: 'mech@test.local', password: 'wrench99', role: 'staff', position: 'mechanic',
});
check('adminCreateUser works', !!mech.id && mech.position === 'mechanic');

let threw = false;
try { await api.auth.adminCreateUser({ full_name: 'Dup', email: 'MECH@test.local', password: 'x2wrench' }); } catch { threw = true; }
check('duplicate email rejected (case-insensitive)', threw);

// ---- 4. Login flows ----
api.auth.logout();
let loginErr = '';
try { await api.auth.login({ email: 'mech@test.local', password: 'wrongpass' }); } catch (e) { loginErr = String(e.message); }
check('wrong password rejected', loginErr === 'Invalid credentials');

const mechLogin = await api.auth.login({ email: 'mech@test.local', password: 'wrench99' });
check('staff login ok', mechLogin.id === mech.id);

// non-admin cannot adminResetPassword
threw = false;
try { await api.auth.adminResetPassword({ userId: admin.id, newPassword: 'hax123' }); } catch { threw = true; }
check('non-admin reset blocked', threw);

// self changePassword with wrong current
api.auth.logout();
await api.auth.login({ email: 'admin@test.local', password: 'supersecret1' });
threw = false;
try { await api.auth.changePassword({ currentPassword: 'nope', newPassword: 'newpass99' }); } catch { threw = true; }
check('changePassword rejects wrong current', threw);

await api.auth.changePassword({ currentPassword: 'supersecret1', newPassword: 'newpass99' });
api.auth.logout();
const relogin = await api.auth.login({ email: 'admin@test.local', password: 'newpass99' });
check('login works after password change', relogin.email === 'admin@test.local');

// ---- 5. Entity CRUD + query ----
const c1 = await api.entities.Customer.create({ full_name: 'Alice', phone: '555-1000', status: 'active' });
const c2 = await api.entities.Customer.create({ full_name: 'Bob', phone: '555-2000', status: 'vip' });
const v1 = await api.entities.Vehicle.create({ customer_id: c1.id, make: 'Toyota', model: 'Tacoma', year: 2020 });
const found = await api.entities.Vehicle.filter({ customer_id: c1.id });
check('filter by foreign key', found.length === 1 && found[0].id === v1.id);
const searched = await api.entities.Customer.filter({ full_name: 'ali' });
check('string filter is substring+case-insensitive', searched.length === 1 && searched[0].id === c1.id);
await api.entities.Customer.update(c1.id, { status: 'vip' });
check('update persists', (await api.entities.Customer.get(c1.id)).status === 'vip');

// ---- 6. Settings ----
await api.settings.set({ shop_name: 'Test Garage', tax_rate: 0.09 });
const s = await api.settings.get();
check('settings round-trip', s.shop_name === 'Test Garage' && s.tax_rate === 0.09);

// ---- 7. Backup export / restore ----
const json = await api.backup.exportJson();
const parsed = JSON.parse(json);
check('backup contains entities', !!parsed.data.entities.Customer && parsed.data.entities.Customer.length === 2);
check('backup strips hashes', parsed.data.entities.User.every((u) => !('password_hash' in u)));

// Wipe and restore
store.clear();
const restore = await api.backup.restore(json);
check('restore returns counts', restore.ok && restore.counts.Customer === 2);
check('restore forces re-login', (await api.auth.me()) === null);
const restoredCustomer = await api.entities.Customer.get(c1.id);
check('restored record intact', restoredCustomer.full_name === 'Alice');
const restoredSettings = await api.settings.get();
check('restored settings intact', restoredSettings.shop_name === 'Test Garage');

// ---- 8. First-claim login after restore (no hashes restored) ----
const claim = await api.auth.login({ email: 'admin@test.local', password: 'claimed123' });
check('first-claim login sets password', claim.email === 'admin@test.local');
api.auth.logout();
const reclaim = await api.auth.login({ email: 'admin@test.local', password: 'claimed123' });
check('claimed password persists', reclaim.email === 'admin@test.local');

// ---- 9. adminUpdateUser field allowlist ----
await api.auth.adminUpdateUser({ userId: mech.id, updates: { position: 'parts_specialist', password_hash: 'EVIL' } });
const afterUpdate = (await api.auth.listUsers()).find((u) => u.id === mech.id);
check('adminUpdateUser allows position', afterUpdate.position === 'parts_specialist');
const rawAfter = JSON.parse(localStorage.getItem('garagemaster_data_v1')).entities.User.find((u) => u.id === mech.id);
check('adminUpdateUser cannot inject password_hash', rawAfter.password_hash !== 'EVIL');

// ---- 9b. adminUpdateUser can update gamification counters (jobs_completed) ----
await api.auth.adminUpdateUser({ userId: mech.id, updates: { jobs_completed: 7, xp_points: 1500 } });
const afterCounters = JSON.parse(localStorage.getItem('garagemaster_data_v1')).entities.User.find((u) => u.id === mech.id);
check('adminUpdateUser persists jobs_completed/xp_points', afterCounters.jobs_completed === 7 && afterCounters.xp_points === 1500);

// ---- 10. Delete ----
await api.entities.Vehicle.delete(v1.id);
check('delete removes record', (await api.entities.Vehicle.get(v1.id)) === null);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
