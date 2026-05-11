/* ============================================================
   ILUMIX — Main Bootstrap v3
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {

  /* ── Auth guard ── */
  if (!Api.requireAuth()) return;

  const loggedUser = Api.getUser();

  /* ── Mostra loading enquanto carrega da API ── */
  _showLoader(true);

  try {
    await Data.loadFromApi();
  } catch(e) {
    console.error('Falha no loadFromApi:', e);
  }

  _showLoader(false);

  /* ── Nome do usuário na sidebar ── */
  if (loggedUser) {
    const nameEl = document.getElementById('topbar-user-name');
    if (nameEl) nameEl.textContent = loggedUser.name?.split(' ')[0] || 'Conta';
  }

  /* ── Registra páginas ── */
  Router.register('dashboard', DashboardPage.render);
  Router.register('lamps',     LampsPage.render);
  Router.register('rooms',     RoomsPage.render);
  Router.register('scenes',    ScenesPage.render);
  Router.register('schedule',  SchedulePage.render);
  Router.register('commands',  CommandsPage.render);
  Router.register('energy',    EnergyPage.render);
  Router.register('history',   HistoryPage.render);
  Router.register('wifi',      WifiPage.render);
  Router.register('account',   AccountPage.render);

  /* ── Navegação ── */
  document.querySelectorAll('[data-nav]').forEach(el => {
    Router.bindNav(el, el.dataset.nav);
  });

  /* ── Sidebar mobile ── */
  const menuBtn = document.querySelector('.btn-menu');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  const openSidebar  = () => { sidebar.classList.add('is-open');    overlay.classList.add('is-visible'); };
  const closeSidebar = () => { sidebar.classList.remove('is-open'); overlay.classList.remove('is-visible'); };
  menuBtn?.addEventListener('click', openSidebar);
  overlay?.addEventListener('click', closeSidebar);
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', closeSidebar));

  /* ── Clock ── */
  function clock() {
    const now = new Date(), h = now.getHours();
    const greeting = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const name = loggedUser?.name?.split(' ')[0] || 'Casa';
    const greetEl = document.getElementById('greeting');
    const subEl   = document.getElementById('topbar-sub');
    if (greetEl) greetEl.textContent = `${greeting}, ${name}`;
    if (subEl)   subEl.textContent   = now.toLocaleString('pt-BR',{weekday:'long',day:'2-digit',month:'long',hour:'2-digit',minute:'2-digit'});
  }
  clock(); setInterval(clock, 30_000);

  /* ── Notification bell ── */
  _initNotifications();

  /* ── Handle cross-page lamp selection ── */
  document.addEventListener('selectLamp', e => {
    if (typeof LampsPage !== 'undefined') {
      LampsPage._selectLamp?.(e.detail.id);
    }
  });

  /* ── Init router ── */
  const hash = location.hash.replace('#','');
  Router.init(hash || 'dashboard');
});

/* ── Loading overlay ─────────────────────────────────────── */
function _showLoader(show) {
  let el = document.getElementById('app-loader');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-loader';
    el.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:var(--dark-1,#0d0d0f);
      display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;
      transition:opacity .3s;`;
    el.innerHTML = `
      <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" stroke="#E2B84A" stroke-width="1.5" opacity=".3"/>
        <path d="M16 2a14 14 0 0114 14" stroke="#E2B84A" stroke-width="2" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 16 16" to="360 16 16" dur=".8s" repeatCount="indefinite"/>
        </path>
      </svg>
      <div style="font-size:13px;color:#888;letter-spacing:.5px">Carregando...</div>`;
    document.body.appendChild(el);
  }
  if (show) {
    el.style.opacity = '1';
    el.style.display = 'flex';
  } else {
    el.style.opacity = '0';
    setTimeout(() => el.style.display = 'none', 300);
  }
}

/* ── Notification bell ───────────────────────────────────── */
function _initNotifications() {
  const bell    = document.querySelector('.topbar__actions .btn--icon');
  const dot     = document.querySelector('.notif-dot');
  if (!bell) return;

  // Cria painel dropdown
  const panel = document.createElement('div');
  panel.id    = 'notif-panel';
  panel.style.cssText = `
    display:none;position:absolute;top:calc(100% + 8px);right:0;
    width:300px;background:var(--dark-2);border:1px solid var(--border);
    border-radius:var(--r-lg);box-shadow:0 8px 32px rgba(0,0,0,.5);
    z-index:1000;overflow:hidden;`;
  bell.style.position = 'relative';
  bell.parentElement.style.position = 'relative';
  bell.parentElement.appendChild(panel);

  let open = false;

  bell.addEventListener('click', e => {
    e.stopPropagation();
    open = !open;
    panel.style.display = open ? 'block' : 'none';
    if (open) {
      _renderNotifPanel(panel);
      if (dot) dot.style.display = 'none';
    }
  });

  document.addEventListener('click', () => {
    open = false;
    panel.style.display = 'none';
  });

  // Mostra dot se há histórico
  if (dot && Data.commandHistory.length > 0) dot.style.display = 'block';
}

function _renderNotifPanel(panel) {
  const history = Data.commandHistory.slice(0, 8);
  const stats   = {
    lamps:  Data.bulbs.length,
    on:     Data.activeBulbs(),
    rooms:  Data.rooms.length,
    scenes: Data.scenes.length,
  };
  panel.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;font-weight:600;color:var(--text-hi)">Notificações</span>
      <span style="font-size:10px;color:var(--text-lo)">${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
    </div>
    <div style="padding:12px 16px;border-bottom:1px solid var(--border);display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="background:var(--dark-3);border-radius:8px;padding:8px 10px">
        <div style="font-size:18px;font-weight:300;color:var(--amber)">${stats.on}<span style="font-size:11px;color:var(--text-lo)">/${stats.lamps}</span></div>
        <div style="font-size:10px;color:var(--text-mid);margin-top:2px">Luzes acesas</div>
      </div>
      <div style="background:var(--dark-3);border-radius:8px;padding:8px 10px">
        <div style="font-size:18px;font-weight:300;color:var(--amber)">${stats.rooms}</div>
        <div style="font-size:10px;color:var(--text-mid);margin-top:2px">Cômodos</div>
      </div>
    </div>
    <div style="padding:8px 0;max-height:200px;overflow-y:auto">
      ${history.length ? history.map(h=>`
        <div style="padding:8px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)11">
          <div style="width:6px;height:6px;border-radius:50%;background:var(--amber);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;color:var(--text-hi);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${h.cmd}</div>
            <div style="font-size:10px;color:var(--text-lo)">${h.time} · ${h.source}</div>
          </div>
        </div>`).join('') : `<div style="padding:16px;text-align:center;font-size:12px;color:var(--text-lo)">Nenhuma atividade ainda</div>`}
    </div>`;
}
