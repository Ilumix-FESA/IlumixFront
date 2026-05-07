/* ============================================================
   ILUMIX — API Service Layer v2
   Troque API_BASE_URL pela URL de produção (Railway/Render).
   ============================================================ */

const API_BASE_URL = 'http://localhost:5145'; // ← troque para produção

const Api = (() => {

  /* ── Token helpers ───────────────────────────────────────── */
  function getToken()        { return localStorage.getItem('ilumix_token'); }
  function getRefreshToken() { return localStorage.getItem('ilumix_refresh'); }
  function saveTokens(a, r)  {
    localStorage.setItem('ilumix_token', a);
    if (r) localStorage.setItem('ilumix_refresh', r);
  }
  function clearTokens() {
    ['ilumix_token','ilumix_refresh','ilumix_user'].forEach(k => localStorage.removeItem(k));
  }
  function requireAuth() {
    if (!getToken()) { window.location.href = 'login.html'; return false; }
    return true;
  }
  function getUser()      { try { return JSON.parse(localStorage.getItem('ilumix_user')||'null'); } catch { return null; } }
  function saveUser(u)    { localStorage.setItem('ilumix_user', JSON.stringify(u)); }

  /* ── Base fetch + auto-refresh ───────────────────────────── */
  async function request(path, options = {}, retry = true) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

    if (res.status === 401 && retry) {
      const ok = await tryRefresh();
      if (ok) return request(path, options, false);
      clearTokens();
      window.location.href = 'login.html';
      return null;
    }
    return res;
  }

  async function tryRefresh() {
    const rt = getRefreshToken();
    if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rt),
      });
      if (!res.ok) return false;
      const data = await res.json();
      saveTokens(data.accessToken, data.refreshToken);
      return true;
    } catch { return false; }
  }

  /* ── JSON helpers ────────────────────────────────────────── */
  async function getJson(path) {
    const res = await request(path);
    if (!res || !res.ok) throw new Error(`Erro ${res?.status} em GET ${path}`);
    return res.json();
  }
  async function postJson(path, body) {
    const res = await request(path, { method: 'POST', body: JSON.stringify(body) });
    if (!res || !res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.message || `Erro ${res?.status}`); }
    return res.json();
  }
  async function putJson(path, body) {
    const res = await request(path, { method: 'PUT', body: JSON.stringify(body) });
    if (!res || !res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.message || `Erro ${res?.status}`); }
    return res.json();
  }
  async function patchJson(path, body) {
    const res = await request(path, { method: 'PATCH', body: JSON.stringify(body) });
    if (!res || !res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.message || `Erro ${res?.status}`); }
    return res.json();
  }
  async function deleteReq(path) {
    const res = await request(path, { method: 'DELETE' });
    if (!res || !res.ok) { const e = await res.json().catch(()=>({})); throw new Error(e.message || `Erro ${res?.status}`); }
    return res.json();
  }

  /* ══════════════════════════════════════════════════════════
     AUTH
  ══════════════════════════════════════════════════════════ */
  const auth = {
    async login(email, password) {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Email ou senha inválidos.');
      saveTokens(data.accessToken, data.refreshToken);
      saveUser(data.user);
      return data;
    },

    async register(name, email, password, confirmPassword) {
      const res = await fetch(`${API_BASE_URL}/api/user/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao criar conta.');
      return data;
    },

    logout() { clearTokens(); window.location.href = 'login.html'; },
    isLoggedIn() { return !!getToken(); },
    getUser,
  };

  /* ══════════════════════════════════════════════════════════
     LÂMPADAS  /api/lamp
  ══════════════════════════════════════════════════════════ */
  const lamps = {
    getAll()                    { return getJson('/api/lamp'); },
    getById(id)                 { return getJson(`/api/lamp/${id}`); },
    getStatus(id)               { return getJson(`/api/lamp/${id}/status`); },
    create()                    { return postJson('/api/lamp', {}); },
    configure(id, name, locationId, ico) {
      return putJson(`/api/lamp/${id}/configure`, { name, locationId, ico });
    },
    // commandName = nome do comando (ex: 'on', 'off', 'setBrightness')
    command(id, commandName, value) {
      return patchJson(`/api/lamp/${id}/command`, { CommandId: commandName, Value: value });
    },
    delete(id) { return deleteReq(`/api/lamp/${id}`); },
  };

  /* ══════════════════════════════════════════════════════════
     LOCALIZAÇÕES  /api/location
  ══════════════════════════════════════════════════════════ */
  const locations = {
    getAll()              { return getJson('/api/location'); },
    getById(id)           { return getJson(`/api/location/${id}`); },
    create(name, ico='')  { return postJson('/api/location', { name, ico }); },
    update(id, name, ico) { return putJson(`/api/location/${id}`, { name, ico: ico||'' }); },
    delete(id)            { return deleteReq(`/api/location/${id}`); },
  };

  /* ══════════════════════════════════════════════════════════
     CENAS  /api/scene
  ══════════════════════════════════════════════════════════ */
  const scenes = {
    getAll()   { return getJson('/api/scene'); },
    getById(id){ return getJson(`/api/scene/${id}`); },
    create(data) {
      return postJson('/api/scene', {
        name:        data.name,
        description: data.desc || '',
        ico:         data.ico  || data.icon || '',
        brightness:  data.brightness || 80,
        temp:        data.temp  || '2700K',
        color:       data.color || '#E2B84A',
      });
    },
    update(id, data) {
      return putJson(`/api/scene/${id}`, {
        name:        data.name,
        description: data.desc || '',
        ico:         data.ico  || data.icon || '',
        brightness:  data.brightness || 80,
        temp:        data.temp  || '2700K',
        color:       data.color || '#E2B84A',
      });
    },
    activate(id) { return postJson(`/api/scene/${id}/activate`, {}); },
    delete(id)   { return deleteReq(`/api/scene/${id}`); },
  };

  /* ══════════════════════════════════════════════════════════
     USUÁRIO  /api/user
  ══════════════════════════════════════════════════════════ */
  const user = {
    updateEmail(id, newEmail) {
      return putJson(`/api/user/${id}/update-email`, { newEmail });
    },
    changePassword(id, currentPassword, newPassword, confirmNewPassword) {
      return putJson(`/api/user/${id}/change-password`, { currentPassword, newPassword, confirmNewPassword });
    },
    delete(id) { return deleteReq(`/api/user/${id}`); },
  };

  /* Public */
  return { auth, lamps, locations, scenes, user, requireAuth, getToken, getUser, saveUser, clearTokens };
})();
