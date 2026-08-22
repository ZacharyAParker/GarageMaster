// GarageMaster data client. Same interface as before, but backed by the
// Express + PostgreSQL server instead of localStorage. Every entity gets
// list/filter/get/create/update/delete; auth and settings work the same way
// they always did from the UI's point of view.

const API = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'same-origin',
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

function normalizeOrderBy(orderBy) {
  return orderBy || undefined;
}

function entityAPI(name) {
  return {
    list: async (orderBy) => {
      const orderByNorm = normalizeOrderBy(orderBy);
      const qs = orderByNorm ? `?orderBy=${encodeURIComponent(orderByNorm)}` : '';
      const arr = await request(`/entities/${name}${qs}`);
      // Server returns payload documents that already carry id/created_date
      return Array.isArray(arr) ? arr : [];
    },
    filter: async (query, orderBy, limit) => {
      const rows = await request(`/entities/${name}/filter`, {
        method: 'POST',
        body: { query: query || {}, orderBy: normalizeOrderBy(orderBy), limit },
      });
      return Array.isArray(rows) ? rows : [];
    },
    get: async (id) => {
      if (!id) return null;
      try {
        return await request(`/entities/${name}/${encodeURIComponent(id)}`);
      } catch (e) {
        if (/not found/i.test(e.message)) return null;
        throw e;
      }
    },
    create: async (data) => request(`/entities/${name}`, { method: 'POST', body: data || {} }),
    update: async (id, updates) => {
      if (!id) throw new Error(`${name} id is required`);
      return request(`/entities/${name}/${encodeURIComponent(id)}`, { method: 'PUT', body: updates || {} });
    },
    delete: async (id) => request(`/entities/${name}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}

export const entitiesProxy = new Proxy({}, { get: (_t, prop) => entityAPI(String(prop)) });

// ---- auth ----
const auth = {
  me: () => request('/auth/me'),
  isSetupComplete: () => request('/auth/is-setup-complete'),
  registerFirstAdmin: (payload) => request('/auth/register-first-admin', { method: 'POST', body: payload }),
  login: ({ email, password }) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  updateMe: (updates) => request('/auth/update-me', { method: 'PUT', body: updates }),
  changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: payload }),
  /** Sanitized user records only - hashes stay on the server. */
  listUsers: () => request('/auth/list-users'),
  adminCreateUser: (payload) => request('/auth/admin/create-user', { method: 'POST', body: payload }),
  adminResetPassword: (payload) => request('/auth/admin/reset-password', { method: 'POST', body: payload }),
  adminUpdateUser: (payload) => request('/auth/admin/update-user', { method: 'POST', body: payload }),
  adminDeleteUser: (payload) => request('/auth/admin/delete-user', { method: 'POST', body: payload }),
};

// ---- shop settings ----
const settingsAPI = {
  get: () => request('/settings'),
  set: (updates) => request('/settings', { method: 'PUT', body: updates }),
  /** Record counts + database size for the data management screen. */
  getStats: () => request('/settings/stats'),
};

// ---- backup / restore ----
async function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

const backupAPI = {
  /** Download a JSON backup of everything (password hashes stripped server-side). */
  async downloadBackup() {
    const payload = await request('/backup/export');
    await downloadJson(payload, `garagemaster-backup-${timestamp()}.json`);
    return { ok: true };
  },
  /** Raw export for scripted backups. */
  async exportJson() {
    return JSON.stringify(await request('/backup/export'), null, 2);
  },
  /**
   * Restore from a backup file (old localStorage exports work too).
   * Users come back without passwords; each claims theirs on next login.
   */
  async restore(json) {
    const payload = typeof json === 'string' ? JSON.parse(json) : json;
    return request('/backup/restore', { method: 'POST', body: payload });
  },
  /** Danger zone: wipe every table. Admin only. */
  async resetAll() {
    return request('/backup/reset', { method: 'POST' });
  },
};

// ---- files ----
const integrations = {
  Core: {
    async UploadFile({ file }) {
      if (!file) throw new Error('file is required');
      const content = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return request('/files', { method: 'POST', body: { file_name: file.name, mime_type: file.type, content } });
    },
    async CreateFileSignedUrl({ id }) {
      return request(`/files/${encodeURIComponent(id)}`);
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

// ---- live updates across tabs/devices via SSE ----
let sseSource = null;
function ensureLiveUpdates() {
  if (sseSource || typeof EventSource === 'undefined') return;
  sseSource = new EventSource(`${API}/events`);
  sseSource.onmessage = () => {
    window.dispatchEvent(new CustomEvent('garagemaster:data-changed'));
  };
}

if (typeof window !== 'undefined') {
  // Start listening once the app boots (first import happens at boot anyway)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureLiveUpdates);
  } else {
    ensureLiveUpdates();
  }
}

const api = { entities: entitiesProxy, auth, integrations, settings: settingsAPI, backup: backupAPI };
export default api;
