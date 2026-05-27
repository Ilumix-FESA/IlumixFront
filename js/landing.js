/* ============================================================
   ILUMIX — Landing page interactivity
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {

  /* ── Scroll reveal ── */
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });

  /* ── How it works steps ── */
  var steps = document.querySelectorAll('.how-step');
  steps.forEach(function (step, i) {
    step.addEventListener('click', function () {
      steps.forEach(function (s, j) { s.classList.toggle('is-active', j === i); });
    });
  });

  /* ── Scene rows ── */
  var rows = document.querySelectorAll('.scene-row');
  rows.forEach(function (row) {
    row.addEventListener('click', function () {
      rows.forEach(function (s) { s.classList.remove('is-active'); });
      row.classList.add('is-active');
    });
  });

  /* ── Nav background on scroll ── */
  var nav = document.getElementById('nav');
  window.addEventListener('scroll', function () {
    nav.style.background = window.scrollY > 40 ? 'rgba(13,12,7,0.96)' : 'rgba(13,12,7,0.85)';
  });

  /* ── Mobile menu ── */
  var toggle = document.querySelector('.nav-mobile-toggle');
  var menu   = document.getElementById('mobile-menu');
  if (toggle && menu) {
    toggle.addEventListener('click', function () { menu.classList.toggle('is-open'); });
    menu.querySelectorAll('.mobile-menu__link').forEach(function (link) {
      link.addEventListener('click', function () { menu.classList.remove('is-open'); });
    });
  }
});
