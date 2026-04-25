/* ============================================================
   ILUMIX — UI Utilities
   Modal, toast, smooth slider, icon system, emoji picker
   ============================================================ */

/* ── ICON SYSTEM ─────────────────────────────────────────── */
/* SVG icons via id — no emojis for structural icons */
const Icons = {
  sun:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  moon:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  bulb:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21h6m-6-3h6m-3-15a7 7 0 017 7c0 2.5-1.3 4.7-3 6H8c-1.7-1.3-3-3.5-3-6a7 7 0 017-7z"/></svg>`,
  home:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  grid:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  clock:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  mic:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 1a3 3 0 013 3v8a3 3 0 01-6 0V4a3 3 0 013-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8"/></svg>`,
  wifi:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
  zap:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
  scene:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`,
  plus:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  edit:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  play:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  close:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  menu:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  bell:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
  signal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>`,
  check:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  arrow:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>`,
  refresh:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>`,
};

function icon(name, size=16) {
  const svg = Icons[name] || Icons.bulb;
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
}

/* ── ROOM ICON RENDER ─────────────────────────────────────── */
const ROOM_ICONS = {
  sofa:    Icons.home,  bed:     Icons.moon,  desk:    Icons.bulb,
  kitchen: Icons.sun,   bath:    Icons.bulb,  garage:  Icons.zap,
  bulb:    Icons.bulb,  default: Icons.home,
};
function roomIcon(iconKey, size=18) {
  const svg = ROOM_ICONS[iconKey] || ROOM_ICONS.default;
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
}

/* ── SCENE ICON ───────────────────────────────────────────── */
const SCENE_ICONS = {
  sun:    Icons.sun,   moon:   Icons.moon,  focus:  Icons.bulb,
  film:   Icons.scene, dinner: Icons.sun,   party:  Icons.zap,
  bulb:   Icons.bulb,  default:Icons.scene,
};
function sceneIcon(iconKey, size=18) {
  const svg = SCENE_ICONS[iconKey] || SCENE_ICONS.default;
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
}

/* ── TOAST ────────────────────────────────────────────────── */
function toast(msg, duration=2600) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('is-on');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('is-on'), duration);
}

/* ── MODAL ────────────────────────────────────────────────── */
const Modal = (() => {
  let backdrop, modal, onClose;

  function _ensure() {
    if (backdrop) return;
    backdrop = document.getElementById('modal-backdrop');
    modal    = backdrop?.querySelector('.modal');
  }

  function open(html, closeCb) {
    _ensure();
    if (!backdrop) return;
    modal.innerHTML = `<div class="modal__handle"></div>` + html;
    backdrop.classList.add('is-open');
    onClose = closeCb || null;
    // close on backdrop click
    backdrop.onclick = e => { if (e.target === backdrop) close(); };
    // bind close btn inside modal
    modal.querySelectorAll('[data-modal-close]').forEach(b => b.addEventListener('click', close));
  }

  function close() {
    _ensure();
    if (!backdrop) return;
    backdrop.classList.remove('is-open');
    if (onClose) onClose();
    onClose = null;
  }

  function getModal() { _ensure(); return modal; }

  return { open, close, getModal };
})();

/* ── SMOOTH SLIDER ────────────────────────────────────────── */
function bindSlider(trackEl, fillEl, thumbEl, labelEl, initVal, onChange) {
  if (!trackEl) return;
  let pct = initVal || 0;
  let dragging = false;

  function update(newPct) {
    pct = Math.max(0, Math.min(100, newPct));
    fillEl.style.width  = pct + '%';
    thumbEl.style.left  = pct + '%';
    if (labelEl) labelEl.textContent = Math.round(pct) + '%';
    if (onChange) onChange(Math.round(pct));
  }

  function clientX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }

  function calc(e) {
    const rect = trackEl.getBoundingClientRect();
    return ((clientX(e) - rect.left) / rect.width) * 100;
  }

  trackEl.addEventListener('mousedown',  e => { dragging=true; trackEl.classList.add('is-dragging'); update(calc(e)); });
  trackEl.addEventListener('touchstart', e => { dragging=true; trackEl.classList.add('is-dragging'); update(calc(e)); }, {passive:true});
  document.addEventListener('mousemove',  e => { if(dragging) update(calc(e)); });
  document.addEventListener('touchmove',  e => { if(dragging) update(calc(e)); }, {passive:true});
  document.addEventListener('mouseup',   () => { dragging=false; trackEl.classList.remove('is-dragging'); });
  document.addEventListener('touchend',  () => { dragging=false; trackEl.classList.remove('is-dragging'); });

  // init position
  fillEl.style.width = pct + '%';
  thumbEl.style.left = pct + '%';
  if (labelEl) labelEl.textContent = Math.round(pct) + '%';
}

/* ── EMOJI PICKER ─────────────────────────────────────────── */
const EMOJIS = [
  '💡','🔆','🌟','✨','⚡','🔦','🕯️','🪔',
  '🏠','🛋️','🛏️','🪑','🍳','🚿','🚗','🏢',
  '🌅','🌙','🌞','🌈','🌊','🔥','❄️','🌿',
  '🎬','🎵','🎉','🎮','📚','💼','🎨','🏆',
];
function emojiPicker(current, onPick) {
  return `<div class="emoji-grid" id="emoji-grid">
    ${EMOJIS.map(e => `<div class="emoji-opt${e===current?' is-active':''}" data-emoji="${e}">${e}</div>`).join('')}
  </div>`;
}
function bindEmojiPicker(container, onPick) {
  container.querySelectorAll('.emoji-opt').forEach(el => {
    el.addEventListener('click', () => {
      container.querySelectorAll('.emoji-opt').forEach(x => x.classList.remove('is-active'));
      el.classList.add('is-active');
      onPick(el.dataset.emoji);
    });
  });
}

/* ── DAY-DOTS (interactive) ───────────────────────────────── */
const DAY_LABELS = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
const DAY_SHORT  = ['S','T','Q','Q','S','S','D'];

function dayDotsHtml(days, id='') {
  return `<div class="day-dots" ${id?`id="${id}"`:''}>
    ${DAY_SHORT.map((d,i)=>`<div class="day-dot${days[i]?' is-active':''}" data-day="${i}">${d}</div>`).join('')}
  </div>`;
}
function bindDayDots(container) {
  container.querySelectorAll('.day-dot[data-day]').forEach(d => {
    d.addEventListener('click', () => d.classList.toggle('is-active'));
  });
}
function readDays(container) {
  return [...container.querySelectorAll('.day-dot[data-day]')].map(d => d.classList.contains('is-active') ? 1 : 0);
}

/* ── WIFI SIGNAL STRENGTH ─────────────────────────────────── */
function signalStrength(rssi) {
  if (rssi === null) return 0;
  if (rssi > -55) return 3;
  if (rssi > -70) return 2;
  return 1;
}
function signalHtml(rssi) {
  const s = signalStrength(rssi);
  return `<div class="wifi-signal s${s}"><span></span><span></span><span></span></div>`;
}

/* ── ORB STATE ────────────────────────────────────────────── */
function updateOrb(orbEl, bulb) {
  if (!orbEl) return;
  orbEl.classList.remove('is-dim','is-off');
  if (!bulb || !bulb.on || bulb.brightness === 0) {
    orbEl.classList.add('is-off');
    orbEl.style.background = '';
    orbEl.style.boxShadow  = '';
  } else {
    const light = lighten(bulb.color, 35);
    orbEl.style.background = `radial-gradient(circle at 38% 33%, ${light}, ${bulb.color} 65%)`;
    orbEl.style.boxShadow  = `0 0 ${14+bulb.brightness/3}px ${bulb.color}66, 0 0 64px ${bulb.color}1A`;
    if (bulb.brightness < 35) orbEl.classList.add('is-dim');
  }
}

function lighten(hex, amt) {
  try {
    const n = parseInt(hex.replace('#',''), 16);
    const r = Math.min(255, (n>>16) + amt);
    const g = Math.min(255, ((n>>8)&0xFF) + amt);
    const b = Math.min(255, (n&0xFF) + amt);
    return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
  } catch { return hex; }
}

/* ── COLOR PRESETS ────────────────────────────────────────── */
const COLOR_PRESETS = [
  {hex:'#FFFFFF',name:'Branco'},    {hex:'#F0E8D0',name:'Linho'},
  {hex:'#FFD700',name:'Dourado'},   {hex:'#E2B84A',name:'Âmbar'},
  {hex:'#FFB347',name:'Laranja'},   {hex:'#FF6B35',name:'Coral'},
  {hex:'#FF3CAC',name:'Rosa'},      {hex:'#FF0080',name:'Magenta'},
  {hex:'#9B59FF',name:'Roxo'},      {hex:'#5B9FD4',name:'Azul'},
  {hex:'#00FF88',name:'Verde'},     {hex:'#FF3131',name:'Vermelho'},
];

function colorPickerHtml(current) {
  return `<div class="color-row">
    ${COLOR_PRESETS.map(c=>`<div class="swatch${c.hex===current?' is-active':''}" data-color="${c.hex}" style="background:${c.hex}" title="${c.name}"></div>`).join('')}
    <label class="swatch swatch--custom" title="Cor personalizada">
      <input type="color" id="custom-color" value="${current||'#ffffff'}">
    </label>
  </div>`;
}

function bindColorPicker(container, onChange) {
  container.querySelectorAll('.swatch[data-color]').forEach(sw => {
    sw.addEventListener('click', () => {
      container.querySelectorAll('.swatch[data-color]').forEach(x => x.classList.remove('is-active'));
      sw.classList.add('is-active');
      const ci = container.querySelector('#custom-color');
      if (ci) ci.value = sw.dataset.color;
      onChange(sw.dataset.color);
    });
  });
  const ci = container.querySelector('#custom-color');
  if (ci) ci.addEventListener('input', () => {
    container.querySelectorAll('.swatch[data-color]').forEach(x => x.classList.remove('is-active'));
    onChange(ci.value);
  });
}

/* ── PARTY COLORS ─────────────────────────────────────────── */
const PARTY_COLORS = ['#FF0080','#FF6B35','#FFD700','#00FF88','#00CFFF','#9B59FF','#FF3CAC','#E2B84A'];
