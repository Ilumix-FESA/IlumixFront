/* ============================================================
   ILUMIX — Main bootstrap v2
   ============================================================ */
document.addEventListener('DOMContentLoaded', async () => {

  /* ── Auth guard ── */
  if (!Api.requireAuth()) return;

  /* ── Exibe nome do usuário ── */
  const loggedUser = Api.getUser();
  if (loggedUser) {
    const nameEl = document.getElementById('topbar-user-name');
    if (nameEl) nameEl.textContent = loggedUser.name?.split(' ')[0] || loggedUser.email;
  }

  /* ── Carrega dados da API ── */
  await Data.loadFromApi();

  /* ── Registra páginas ── */
  Router.register('dashboard', DashboardPage.render);
  Router.register('rooms',     RoomsPage.render);
  Router.register('scenes',    ScenesPage.render);
  Router.register('schedule',  SchedulePage.render);
  Router.register('commands',  CommandsPage.render);
  Router.register('energy',    EnergyPage.render);
  Router.register('wifi',      WifiPage.render);
  Router.register('account',   AccountPage.render);

  /* ── Binds de navegação ── */
  document.querySelectorAll('[data-nav]').forEach(el => {
    Router.bindNav(el, el.dataset.nav);
  });

  /* ── Sidebar mobile ── */
  const menuBtn = document.querySelector('.btn-menu');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('.sidebar-overlay');

  function openSidebar()  { sidebar.classList.add('is-open');    overlay.classList.add('is-visible'); }
  function closeSidebar() { sidebar.classList.remove('is-open'); overlay.classList.remove('is-visible'); }

  menuBtn?.addEventListener('click', openSidebar);
  overlay?.addEventListener('click', closeSidebar);
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', closeSidebar));

  /* ── Clock + saudação ── */
  function clock() {
    const now = new Date();
    const h   = now.getHours();
    const greeting = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const name = loggedUser?.name?.split(' ')[0] || 'Casa';

    const greetEl = document.getElementById('greeting');
    const subEl   = document.getElementById('topbar-sub');
    if (greetEl) greetEl.textContent = `${greeting}, ${name}`;
    if (subEl)   subEl.textContent   = now.toLocaleString('pt-BR', {
      weekday:'long', day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit'
    });
  }
  clock(); setInterval(clock, 30_000);

  /* ── Init router ── */
  const hash = location.hash.replace('#','');
  Router.init(hash || 'dashboard');
});
