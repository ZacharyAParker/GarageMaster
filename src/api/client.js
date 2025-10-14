// Self-hosted in-browser data client (no external SDK)
// Provides a minimal compatible surface: entities CRUD, auth, and basic integrations

const STORAGE_KEY = 'garagemaster_data_v1';

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
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

const auth = {
  async me() {
    const db = loadData();
    if (!db.currentUserId) return null;
    const user = getEntityArray('User').find((u) => u.id === db.currentUserId) || null;
    return user || null;
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
    return updated;
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

export const api = { entities, auth, integrations };
export default api;
