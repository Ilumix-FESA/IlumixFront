/* ============================================================
   ILUMIX — Router
   ============================================================ */
const Router = (() => {
  const pages = new Map();
  const navEls = [];

  function register(id, onEnter) {
    const el = document.getElementById('page-' + id);
    if (!el) return;
    pages.set(id, { el, onEnter: onEnter || null });
  }

  function navigate(id) {
    if (!pages.has(id)) return;
    pages.forEach(({el}) => el.classList.remove('is-active'));
    const {el, onEnter} = pages.get(id);
    el.classList.add('is-active');
    if (onEnter) onEnter();
    navEls.forEach(n => n.el.classList.toggle('is-active', n.page === id));
    history.replaceState(null, '', '#' + id);
    window.scrollTo(0, 0);
  }

  function bindNav(el, pageId) {
    navEls.push({el, page: pageId});
    el.addEventListener('click', () => navigate(pageId));
  }

  function init(def) {
    const h = location.hash.replace('#','');
    navigate(pages.has(h) ? h : def);
  }

  return { register, navigate, bindNav, init };
})();
