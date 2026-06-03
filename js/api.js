/* ============================================================
   ILUMIX — API Service Layer v4
   Rotas e DTOs sincronizados com o backend (commit b47c24d).
   ============================================================ */
const API_BASE_URL = 'http://localhost:5145';

const Api = (() => {

  /* ── Token helpers ───────────────────────────────────────── */
  const getToken        = () => localStorage.getItem('ilumix_token');
  const getRefreshToken = () => localStorage.getItem('ilumix_refresh');
  const saveTokens = (a, r) => {
    localStorage.setItem('ilumix_token', a);
    if (r) localStorage.setItem('ilumix_refresh', r);
  };
  const clearTokens = () =>
    ['ilumix_token','ilumix_refresh','ilumix_user'].forEach(k => localStorage.removeItem(k));

  const requireAuth = () => { if (!getToken()) { window.location.href='login.html'; return false; } return true; };
  const getUser  = () => { try { return JSON.parse(localStorage.getItem('ilumix_user')||'null'); } catch { return null; } };
  const saveUser = u => localStorage.setItem('ilumix_user', JSON.stringify(u));

  /* ── Fetch base ──────────────────────────────────────────── */
  async function request(path, opts={}, retry=true) {
    const token      = getToken();
    const isFormData = opts.body instanceof FormData;
    const headers = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers||{}),
    };
    const res = await fetch(`${API_BASE_URL}${path}`, {...opts, headers});
    if (res.status === 401 && retry) {
      if (await tryRefresh()) return request(path, opts, false);
      clearTokens(); window.location.href='login.html'; return null;
    }
    return res;
  }

  async function tryRefresh() {
    const rt = getRefreshToken(); if (!rt) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/refresh`,
        { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(rt) });
      if (!res.ok) return false;
      const d = await res.json(); saveTokens(d.accessToken, d.refreshToken); return true;
    } catch { return false; }
  }

  /* ── JSON helpers ────────────────────────────────────────── */
  async function _json(res) {
    const ct = res.headers.get('content-type')||'';
    if (!ct.includes('application/json')) return {};
    return res.json();
  }
  async function call(path, opts={}) {
    const res = await request(path, opts);
    if (!res) throw new Error('Sem resposta da API');
    if (!res.ok) { const e = await _json(res); throw new Error(e.message || `Erro ${res.status}`); }
    return _json(res);
  }
  const GET    = p      => call(p);
  const POST   = (p,b)  => call(p, { method:'POST',   body: JSON.stringify(b??{}) });
  const PUT    = (p,b)  => call(p, { method:'PUT',    body: JSON.stringify(b)     });
  const PATCH  = (p,b)  => call(p, { method:'PATCH',  body: JSON.stringify(b)     });
  const DELETE = p      => call(p, { method:'DELETE'                               });

  /* ══════════════════════════════════════════════════════════
     AUTH
     POST /api/auth/login  → { accessToken, refreshToken, user:{Id,Name,Email} }
     POST /api/user/register → { message }
  ══════════════════════════════════════════════════════════ */
  const auth = {
    async login(email, password) {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`,
        { method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({email,password}) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message||'Email ou senha inválidos.');
      saveTokens(d.accessToken, d.refreshToken);
      const u = { id: d.user.Id||d.user.id, name: d.user.Name||d.user.name, email: d.user.Email||d.user.email };
      saveUser(u); return d;
    },
    async register(name, email, password, confirmPassword) {
      const res = await fetch(`${API_BASE_URL}/api/Users/register`,
        { method:'POST', headers:{'Content-Type':'application/json'},
          body:JSON.stringify({name,email,password,confirmPassword}) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.message||'Erro ao criar conta.');
      return d;
    },
    logout() { clearTokens(); window.location.href='login.html'; },
    isLoggedIn: () => !!getToken(),
    getUser,
  };

  /* ══════════════════════════════════════════════════════════
     LÂMPADAS  →  /api/DevicesUsers
     GET    /api/DevicesUsers        → [DevicesUsersViewModel]
       Cada item: { id, idDevice, name, idFiware, idLocation, deviceName, commands:[{id,idDevice,name}] }
     GET    /api/DevicesUsers/{id}   → DevicesUsersViewModel
     POST   /api/DevicesUsers        → { message, fiwareId }
       body: { name, deviceId:int, idLocation:int|null }
       deviceId = tipo de hardware (hardcoded 1 = ESP32 Ilumix)
     PUT    /api/DevicesUsers/{id}/configure → { message }
       body: { name, locationId:int|null }
     PATCH  /api/DevicesUsers/{id}/command  → { message }
       body: { commandId:int, value:string }
       commandId = ID inteiro da Commands table (retornado em Commands[].id)
     DELETE /api/DevicesUsers/{id}
     GET    /api/DevicesUsers/{id}/historical?lastN=N&attribute=luminosity
  ══════════════════════════════════════════════════════════ */
  const lamps = {
    getAll:    ()                      => GET(`/api/DevicesUsers`),
    getById:   id                      => GET(`/api/DevicesUsers/${id}`),

    // deviceId=1 é o único tipo de hardware Ilumix cadastrado no sistema
    create:    (name, locationId)      => POST(`/api/DevicesUsers`, {
                                           name, deviceId: 1, idLocation: locationId || null }),

    configure: (id, name, locationId)  => PUT(`/api/DevicesUsers/${id}/configure`, {
                                           name, locationId: locationId || null }),

    // commandId deve ser inteiro (Commands.Id) — obtido de device.Commands[]
    command:   (id, commandId, value)  => PATCH(`/api/DevicesUsers/${id}/command`, {
                                           commandId, value: String(value) }),

    history:   (id, lastN=20)          => GET(`/api/DevicesUsers/${id}/historical?lastN=${lastN}&attribute=luminosity`),
    delete:    id                      => DELETE(`/api/DevicesUsers/${id}`),
  };

  /* ══════════════════════════════════════════════════════════
     LOCALIZAÇÕES  →  /api/Locations
     GET    /api/Locations        → [LocationsViewModel]
     GET    /api/Locations/{id}   → LocationsViewModel
     POST   /api/Locations        → multipart/form-data  { Name }
     PUT    /api/Locations/{id}   → { name }
     DELETE /api/Locations/{id}
  ══════════════════════════════════════════════════════════ */
  const locations = {
    getAll:  ()         => GET(`/api/Locations/all`),
    getById: id         => GET(`/api/Locations/${id}`),

    // Endpoint usa [FromForm] — precisa de FormData, não JSON
    create:  (name)     => {
      const fd = new FormData();
      fd.append('name', name);
      return call(`/api/Locations`, { method:'POST', body: fd });
    },

    // Agora aceita JSON { name } — ico foi removido do DTO
    update:  (id, name) => PUT(`/api/Locations/${id}`, { name }),
    delete:  id         => DELETE(`/api/Locations/${id}`),
  };

  /* ══════════════════════════════════════════════════════════
     CENAS  →  /api/Scenes
     GET    /api/Scenes/my-scenes   → [ScenesViewModel]
       Cada item: { id, idUser, name, description, active, devices:[{deviceUserId, commands:[{commandId,value}]}] }
     POST   /api/Scenes             → { message }
       body: { name, description, devices:[{deviceUserId, commands:[{commandId,value}]}] }
     POST   /api/Scenes/{id}/activate → { message }
     DELETE /api/Scenes/{id}
  ══════════════════════════════════════════════════════════ */
  const scenes = {
    getAll:   ()     => GET(`/api/Scenes/my-scenes`),
    getById:  id     => GET(`/api/Scenes/${id}`),

    create:   (d)    => POST(`/api/Scenes`, {
                          name:        d.name,
                          description: d.description || '',
                          devices:     d.devices || [],
                        }),

    activate: id     => POST(`/api/Scenes/${id}/activate`),
    delete:   id     => DELETE(`/api/Scenes/${id}`),
  };

  /* ══════════════════════════════════════════════════════════
     USUÁRIO  →  /api/Users
     PUT  /api/Users/{id}/update-email    → { message }
     PUT  /api/Users/{id}/change-password → { message }
     DELETE /api/Users/{id}
  ══════════════════════════════════════════════════════════ */
  const user = {
    updateEmail:    (id, newEmail)                                    => PUT(`/api/Users/${id}/update-email`, {newEmail}),
    changePassword: (id, currentPassword, newPassword, confirmNewPassword) =>
                      PUT(`/api/Users/${id}/change-password`, {currentPassword, newPassword, confirmNewPassword}),
    delete:         id => DELETE(`/api/Users/${id}`),
  };

  return { auth, lamps, locations, scenes, user, requireAuth, getUser, saveUser, clearTokens };
})();
