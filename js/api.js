/* ============================================================
   ILUMIX — API Service Layer v3
   Contrato exato com o backend documentado em cada método.
   ============================================================ */
const API_BASE_URL = 'http://localhost:5145'; // troque pela URL de produção

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
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
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
  const GET    = p        => call(p);
  const POST   = (p,b)   => call(p, { method:'POST',   body: JSON.stringify(b??{}) });
  const PUT    = (p,b)   => call(p, { method:'PUT',    body: JSON.stringify(b)     });
  const PATCH  = (p,b)   => call(p, { method:'PATCH',  body: JSON.stringify(b)     });
  const DELETE = p        => call(p, { method:'DELETE'                              });

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
      // backend retorna user.Id (maiúsculo) — normalizamos
      const u = { id: d.user.Id||d.user.id, name: d.user.Name||d.user.name, email: d.user.Email||d.user.email };
      saveUser(u); return d;
    },
    async register(name, email, password, confirmPassword) {
      const res = await fetch(`${API_BASE_URL}/api/user/register`,
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
     LÂMPADAS
     GET    /api/lamp              → [LampModel]
     GET    /api/lamp/{id}         → LampModel
     GET    /api/lamp/{id}/status  → { lampId, name, attributes:{Name:Value} }
     POST   /api/lamp              → { message, lamp: LampModel }
       LampModel.Commands = [{CommandId, Name, AttributeRef}]
       LampModel.Attributes = [{AttributeId, Name, Type, Value}]
     PUT    /api/lamp/{id}/configure → body: {Name, LocationId, Ico}
     PATCH  /api/lamp/{id}/command  → body: {commandId:"commandName", value:"value"}
       OBS: commandId aqui é o NOME do comando, não o GUID
     DELETE /api/lamp/{id}
  ══════════════════════════════════════════════════════════ */
  const lamps = {
    getAll:     ()              => GET(`/api/lamp`),
    getById:    id              => GET(`/api/lamp/${id}`),
    getStatus:  id              => GET(`/api/lamp/${id}/status`),
    create:     (deviceId)      => POST(`/api/lamp`, deviceId ? {deviceId} : {}),
    configure:  (id,name,locationId,ico) =>
                                   PUT(`/api/lamp/${id}/configure`, {name,locationId:locationId||'',ico:ico||''}),
    // commandName = Name do comando (ex: "on", "setBrightness", "setColor")
    // Cor: pode enviar hex (#FF0000) — o backend converte para "255,0,0" para o ESP32
    command:    (id,commandName,value) =>
                                   PATCH(`/api/lamp/${id}/command`, {commandId:commandName, value:String(value)}),
    history:    (id,lastN=20)  => GET(`/api/lamp/${id}/historical/luminosity?lastN=${Number(lastN)}`),
    delete:     id              => DELETE(`/api/lamp/${id}`),
  };

  /* ══════════════════════════════════════════════════════════
     LOCALIZAÇÕES (CÔMODOS)
     GET    /api/location         → [LocationModel]
     GET    /api/location/{id}    → LocationModel
     POST   /api/location         → body:{Name,Ico} → {message,location:LocationModel}
     PUT    /api/location/{id}    → body:{Id,Name,Ico}
     DELETE /api/location/{id}
  ══════════════════════════════════════════════════════════ */
  const locations = {
    getAll:  ()          => GET(`/api/location`),
    getById: id          => GET(`/api/location/${id}`),
    create:  (name,ico)  => POST(`/api/location`, {name,ico:ico||''}),
    update:  (id,name,ico) => PUT(`/api/location/${id}`, {id,name,ico:ico||''}),
    delete:  id          => DELETE(`/api/location/${id}`),
  };

  /* ══════════════════════════════════════════════════════════
     CENAS
     GET    /api/scene         → [SceneModel]
     GET    /api/scene/{id}    → SceneModel
     POST   /api/scene         → body:{Name,Description,Ico,Brightness,Temp,Color}
     PUT    /api/scene/{id}    → body:{Name,Description,Ico,Brightness,Temp,Color}
     POST   /api/scene/{id}/activate
     DELETE /api/scene/{id}
  ══════════════════════════════════════════════════════════ */
  const scenes = {
    getAll:   ()       => GET(`/api/scene`),
    getById:  id       => GET(`/api/scene/${id}`),
    create:  (d)       => POST(`/api/scene`, {
      name:d.name, description:d.description||'', ico:d.ico||'',
      brightness:d.brightness||80, temp:d.temp||'2700K', color:d.color||'#E2B84A' }),
    update:  (id,d)    => PUT(`/api/scene/${id}`, {
      name:d.name, description:d.description||'', ico:d.ico||'',
      brightness:d.brightness||80, temp:d.temp||'2700K', color:d.color||'#E2B84A' }),
    activate: id       => POST(`/api/scene/${id}/activate`),
    delete:   id       => DELETE(`/api/scene/${id}`),
  };

  /* ══════════════════════════════════════════════════════════
     USUÁRIO
     POST /api/user/register
     PUT  /api/user/{id}/update-email   → body:{newEmail}
     PUT  /api/user/{id}/change-password → body:{currentPassword,newPassword,confirmNewPassword}
     DELETE /api/user/{id}
  ══════════════════════════════════════════════════════════ */
  const user = {
    updateEmail:     (id,newEmail)                               => PUT(`/api/user/${id}/update-email`,    {newEmail}),
    changePassword:  (id,currentPassword,newPassword,confirmNewPassword) =>
                       PUT(`/api/user/${id}/change-password`, {currentPassword,newPassword,confirmNewPassword}),
    delete:          id => DELETE(`/api/user/${id}`),
  };

  return { auth, lamps, locations, scenes, user, requireAuth, getUser, saveUser, clearTokens };
})();
