/* ============================================================
   ILUMIX — Main bootstrap
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* ── Register pages ── */
  Router.register('dashboard', DashboardPage.render);
  Router.register('rooms',     RoomsPage.render);
  Router.register('scenes',    ScenesPage.render);
  Router.register('schedule',  SchedulePage.render);
  Router.register('commands',  CommandsPage.render);
  Router.register('energy',    EnergyPage.render);
  Router.register('wifi',      WifiPage.render);

  /* ── Bind nav items ── */
  document.querySelectorAll('[data-nav]').forEach(el => {
    Router.bindNav(el, el.dataset.nav);
  });

  /* ── Mobile sidebar toggle ── */
  const menuBtn  = document.querySelector('.btn-menu');
  const sidebar  = document.querySelector('.sidebar');
  const overlay  = document.querySelector('.sidebar-overlay');

  function openSidebar()  { sidebar.classList.add('is-open'); overlay.classList.add('is-visible'); }
  function closeSidebar() { sidebar.classList.remove('is-open'); overlay.classList.remove('is-visible'); }

  menuBtn?.addEventListener('click', openSidebar);
  overlay?.addEventListener('click', closeSidebar);
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', closeSidebar));

  /* ── Clock ── */
  function clock() {
    const el = document.getElementById('topbar-sub');
    if (!el) return;
    const now = new Date();
    const h   = now.getHours();
    const greeting = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    el.textContent = greeting + ' · ' + now.toLocaleString('pt-BR', { weekday:'long', day:'2-digit', month:'long', hour:'2-digit', minute:'2-digit' });
    document.getElementById('greeting').textContent = greeting + ', Casa';
  }
  clock(); setInterval(clock, 30_000);

  /* ── Init ── */
  const hash = location.hash.replace('#','');
  Router.init(hash || 'dashboard');
});
