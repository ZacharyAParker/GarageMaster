// Self-hosted in-browser data client (no external SDK)
// Provides a minimal compatible surface: entities CRUD, auth, and basic integrations

const STORAGE_KEY = 'garagemaster_data_v1';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {
    // Corrupt storage falls through to a fresh database.
  }
  return { entities: {}, files: {}, currentUserId: null, seq: 1 };
}

function saveData(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Storage save failed', e);
  }
}

function genId(prefix = 'id') {
  const db = loadData();
  const id = `${prefix}_${Date.now().toString(36)}_${(db.seq++).toString(36)}`;
  saveData(db);
  return id;
}

function getEntityArray(name) {
  const db = loadData();
  if (!db.entities[name]) db.entities[name] = [];
  return db.entities[name];
}

function setEntityArray(name, arr) {
  const db = loadData();
  db.entities[name] = arr;
  saveData(db);
}

function sortBy(arr, orderBy) {
  if (!orderBy) return arr.slice();
  const desc = orderBy.startsWith('-');
  const key = desc ? orderBy.slice(1) : orderBy;
  return arr.slice().sort((a, b) => {
    const va = a && a[key];
    const vb = b && b[key];
    if (va == null && vb == null) return 0;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va < vb) return desc ? 1 : -1;
    if (va > vb) return desc ? -1 : 1;
    return 0;
  });
}

function matchesQuery(item, query) {
  if (!query) return true;
  return Object.entries(query).every(([k, v]) => {
    const val = item && item[k];
    if (v == null) return true;
    if (typeof v === 'string' && typeof val === 'string') return val.toLowerCase().includes(v.toLowerCase());
    if (Array.isArray(v)) return v.includes(val);
    return val === v;
  });
}

function entityAPI(name) {
  return {
    list: async (orderBy) => sortBy(getEntityArray(name), orderBy),
    filter: async (query, orderBy, limit) => {
      const arr = getEntityArray(name).filter((i) => matchesQuery(i, query));
      const sorted = sortBy(arr, orderBy);
      return limit != null ? sorted.slice(0, limit) : sorted;
    },
    get: async (id) => getEntityArray(name).find((i) => i.id === id) || null,
    create: async (data) => {
      const now = new Date().toISOString();
      const item = { id: genId(name), created_date: now, updated_date: now, ...data };
      const arr = getEntityArray(name);
      arr.push(item);
      setEntityArray(name, arr);
      return item;
    },
    update: async (id, updates) => {
      const arr = getEntityArray(name);
      const idx = arr.findIndex((i) => i.id === id);
      if (idx === -1) throw new Error(name + ' not found');
      const now = new Date().toISOString();
      const updated = { ...arr[idx], ...updates, updated_date: now };
      arr[idx] = updated;
      setEntityArray(name, arr);
      return updated;
    },
    delete: async (id) => {
      const arr = getEntityArray(name);
      const next = arr.filter((i) => i.id !== id);
      setEntityArray(name, next);
      return { id };
    },
  };
}

const entities = new Proxy({}, { get: (_t, prop) => entityAPI(String(prop)) });

// ---- Cross-tab sync: notify other tabs when data changes ----
const BROADCAST_CHANNEL = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('garagemaster_sync') : null;
if (BROADCAST_CHANNEL) {
  BROADCAST_CHANNEL.onmessage = () => {
    // Any tab can re-read fresh data; pages using react-query pick it up via the
    // queryClient invalidation in App.jsx listening to this event.
    window.dispatchEvent(new CustomEvent('garagemaster:data-changed'));
  };
}

// ---- Shop settings (tax rate, labor rate, shop name, address) ----
const settingsAPI = {
  async get() {
    const db = loadData();
    return db.settings || {
      shop_name: 'GarageMaster Shop',
      tax_rate: 0.0825,
      default_labor_rate: 85,
      currency: 'USD',
      address: '',
      phone: '',
      email: '',
    };
  },
  async set(updates) {
    const db = loadData();
    db.settings = { ...(db.settings || {}), ...updates };
    saveData(db);
    if (BROADCAST_CHANNEL) BROADCAST_CHANNEL.postMessage({ type: 'settings' });
    return db.settings;
  },
};

// ---- Backup / restore / export ----
async function backupPayload() {
  const db = loadData();
  const users = db.entities.User || [];
  return {
    version: 1,
    exported_at: new Date().toISOString(),
    data: {
      ...db,
      entities: Object.fromEntries(
        Object.entries(db.entities).map(([k, arr]) => [k, k === 'User' ? arr.map(safeUser) : arr])
      ),
    },
    user_count: users.length,
  };
}

const backupAPI = {
  /** Download a JSON backup of all data (password hashes stripped from User records). */
  async downloadBackup() {
    const payload = await backupPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garagemaster-backup-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return { ok: true };
  },
  /** Return the JSON string (for copy/paste backups). */
  async exportJson() {
    const payload = await backupPayload();
    return JSON.stringify(payload, null, 2);
  },
  /**
   * Restore from a JSON string or parsed object produced by exportJson/downloadBackup.
   * Users are restored WITHOUT password hashes; each must use "claim account" on login
   * to set their password again. Returns counts.
   */
  async restore(json) {
    let payload = typeof json === 'string' ? JSON.parse(json) : json;
    if (!payload || !payload.data || !payload.data.entities) throw new Error('Invalid backup file');
    const db = loadData();
    db.entities = {};
    let counts = {};
    for (const [name, arr] of Object.entries(payload.data.entities)) {
      db.entities[name] = arr.map((item) => {
        if (name === 'User') {
          const { password_hash, password_salt, ...rest } = item;
          return rest;
        }
        return item;
      });
      counts[name] = arr.length;
    }
    // Restore the non-entity payload too: settings, uploaded files, id sequence.
    if (payload.data.settings) db.settings = payload.data.settings;
    if (payload.data.files) db.files = payload.data.files;
    if (payload.data.seq) db.seq = Math.max(db.seq || 1, payload.data.seq);
    db.currentUserId = null; // force re-login after restore
    saveData(db);
    if (BROADCAST_CHANNEL) BROADCAST_CHANNEL.postMessage({ type: 'restore' });
    return { ok: true, counts };
  },
};

function format(d, fmt) {
  // Local minimal formatter to avoid importing date-fns here
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, '0');
  if (fmt === 'yyyy-MM-dd-HHmm') return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}-${pad(dt.getHours())}${pad(dt.getMinutes())}`;
  return dt.toISOString();
}

// Password hashing using Web Crypto
async function hashPassword(password, salt) {
  const cryptoObj = (typeof window !== 'undefined' ? window.crypto : undefined);
  if (!cryptoObj || !cryptoObj.subtle) throw new Error('Crypto not available');
  const enc = new TextEncoder();
  const s = salt || cryptoObj.getRandomValues(new Uint8Array(16));
  const keyMaterial = await cryptoObj.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await cryptoObj.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100000, salt: s }, keyMaterial, 256);
  const hashArr = new Uint8Array(bits);
  return { hash: btoa(String.fromCharCode.apply(null, Array.from(hashArr))), salt: btoa(String.fromCharCode.apply(null, Array.from(s))) };
}

function b64ToBytes(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

/** Strip credential material from a user record before it leaves the data layer. */
function safeUser(user) {
  if (!user) return null;
  const { password_hash, password_salt, ...rest } = user;
  return rest;
}

const auth = {
  async me() {
    const db = loadData();
    if (!db.currentUserId) return null;
    const user = getEntityArray('User').find((u) => u.id === db.currentUserId) || null;
    return user || null;
  },
  /**
   * List users with credential material stripped. Use this in UI code.
   * (Raw api.entities.User.list still exists for internal data-layer use,
   * but pages should prefer auth.listUsers.)
   */
  async listUsers() {
    return getEntityArray('User').map(safeUser);
  },
  async isSetupComplete() {
    const users = getEntityArray('User');
    return users.length > 0;
  },
  async registerFirstAdmin({ full_name, email, password }) {
    const users = getEntityArray('User');
    if (users.length > 0) throw new Error('Setup already completed');
    const { hash, salt } = await hashPassword(password);
    const now = new Date().toISOString();
    const user = {
      id: genId('user'),
      full_name: full_name || 'Administrator',
      email: email || 'admin@localhost',
      role: 'admin',
      position: 'admin',
      password_hash: hash,
      password_salt: salt,
      created_date: now,
      updated_date: now,
    };
    const arr = getEntityArray('User');
    arr.push(user);
    setEntityArray('User', arr);
    const db = loadData();
    db.currentUserId = user.id;
    saveData(db);
    return user;
  },
  async login({ email, password }) {
    const users = getEntityArray('User');
    const user = users.find((u) => (u.email || '').toLowerCase() === (email || '').toLowerCase());
    if (!user) throw new Error('Invalid credentials');
    // If the account does not have a password yet, set it now (first-claim flow)
    if (!user.password_hash || !user.password_salt) {
      const { hash, salt } = await hashPassword(password);
      const arr = getEntityArray('User');
      const idx = arr.findIndex((u) => u.id === user.id);
      const updated = { ...user, password_hash: hash, password_salt: salt, updated_date: new Date().toISOString() };
      if (idx !== -1) {
        arr[idx] = updated;
        setEntityArray('User', arr);
      }
    } else {
      const { hash } = await hashPassword(password, b64ToBytes(user.password_salt));
      if (hash !== user.password_hash) throw new Error('Invalid credentials');
    }
    const db = loadData();
    // Use possibly updated user record's id
    const finalUser = getEntityArray('User').find((u) => (u.email || '').toLowerCase() === (email || '').toLowerCase()) || user;
    db.currentUserId = finalUser.id;
    saveData(db);
    return finalUser;
  },
  async adminCreateUser({ full_name, email, password, role = 'mechanic', position = 'mechanic' }) {
    // Only admin can create users
    const db = loadData();
    const me = getEntityArray('User').find((u) => u.id === db.currentUserId);
    if (!me || me.role !== 'admin') throw new Error('Admin privileges required');
    const users = getEntityArray('User');
    if (users.find((u) => (u.email || '').toLowerCase() === (email || '').toLowerCase())) {
      throw new Error('Email already in use');
    }
    const { hash, salt } = await hashPassword(password);
    const now = new Date().toISOString();
    const user = {
      id: genId('user'),
      full_name,
      email,
      role,
      position,
      password_hash: hash,
      password_salt: salt,
      created_date: now,
      updated_date: now,
    };
    const arr = getEntityArray('User');
    arr.push(user);
    setEntityArray('User', arr);
    return user;
  },
  async logout() {
    const db = loadData();
    db.currentUserId = null;
    saveData(db);
    return true;
  },
  async updateMe(updates) {
    const db = loadData();
    if (!db.currentUserId) return null;
    const users = getEntityArray('User');
    const idx = users.findIndex((u) => u.id === db.currentUserId);
    if (idx === -1) return null;
    const updated = { ...users[idx], ...updates, updated_date: new Date().toISOString() };
    users[idx] = updated;
    setEntityArray('User', users);
    return safeUser(updated);
  },

  /** Change the current user's password (requires current password). */
  async changePassword({ currentPassword, newPassword }) {
    const db = loadData();
    if (!db.currentUserId) throw new Error('Not signed in');
    const users = getEntityArray('User');
    const idx = users.findIndex((u) => u.id === db.currentUserId);
    if (idx === -1) throw new Error('Not signed in');
    const user = users[idx];
    if (user.password_hash && user.password_salt) {
      const { hash } = await hashPassword(currentPassword, b64ToBytes(user.password_salt));
      if (hash !== user.password_hash) throw new Error('Current password is incorrect');
    }
    if (!newPassword || String(newPassword).length < 6) throw new Error('New password must be at least 6 characters');
    const { hash, salt } = await hashPassword(newPassword);
    users[idx] = { ...user, password_hash: hash, password_salt: salt, updated_date: new Date().toISOString() };
    setEntityArray('User', users);
    return { ok: true };
  },

  /**
   * Admin resets a user's password to a temporary one. The target account's next
   * login with that temp password claims it (first-claim flow in login()).
   */
  async adminResetPassword({ userId, newPassword }) {
    const db = loadData();
    const me = getEntityArray('User').find((u) => u.id === db.currentUserId);
    if (!me || me.role !== 'admin') throw new Error('Admin privileges required');
    const users = getEntityArray('User');
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    if (!newPassword || String(newPassword).length < 6) throw new Error('Password must be at least 6 characters');
    const { hash, salt } = await hashPassword(newPassword);
    users[idx] = { ...users[idx], password_hash: hash, password_salt: salt, updated_date: new Date().toISOString() };
    setEntityArray('User', users);
    return safeUser(users[idx]);
  },

  /** Admin sets a user's role/position and other profile fields. */
  async adminUpdateUser({ userId, updates }) {
    const db = loadData();
    const me = getEntityArray('User').find((u) => u.id === db.currentUserId);
    if (!me || me.role !== 'admin') throw new Error('Admin privileges required');
    const users = getEntityArray('User');
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    const allowed = {};
    for (const k of ['full_name', 'email', 'role', 'position', 'phone', 'specialties', 'skills', 'certifications', 'hourly_wage', 'hire_date', 'avatar_url', 'jobs_completed', 'xp_points']) {
      if (k in updates) allowed[k] = updates[k];
    }
    users[idx] = { ...users[idx], ...allowed, updated_date: new Date().toISOString() };
    setEntityArray('User', users);
    return safeUser(users[idx]);
  },
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const integrations = {
  Core: {
    async UploadFile({ file }) {
      if (!file) throw new Error('file is required');
      const dataUrl = await fileToDataUrl(file);
      const id = genId('file');
      const db = loadData();
      db.files[id] = { id, name: file.name, type: file.type, size: file.size, dataUrl, created_date: new Date().toISOString() };
      saveData(db);
      return { file_url: dataUrl, id };
    },
    async CreateFileSignedUrl({ id }) {
      const db = loadData();
      const f = db.files && db.files[id];
      if (!f) throw new Error('file not found');
      return { url: f.dataUrl };
    },
    async UploadPrivateFile(args) { return this.UploadFile(args); },
    async SendEmail({ to, subject, body }) { console.info('Email (stub):', { to, subject, body }); return { ok: true }; },
    async InvokeLLM({ prompt }) { return { text: 'LLM stub response to: ' + prompt }; },
    async GenerateImage({ prompt }) {
      const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='320'>"+
        "<rect width='100%' height='100%' fill='#0ea5e9'/>"+
        "<text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='sans-serif' font-size='20'>" + (prompt || 'Image') + "</text></svg>";
      const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
      return { image_url: dataUrl };
    },
  },
};

export const api = { entities, auth, integrations, settings: settingsAPI, backup: backupAPI };
export default api;
