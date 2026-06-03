/* ============================================================
   ILUMIX — Dashboard
   ============================================================ */
const DashboardPage = (() => {

  let _filterRoom   = 'todos';
  let _filterOnline = false;

  function _filteredBulbs() {
    return Data.bulbs
      .filter(b => _filterRoom === 'todos' || String(b.roomId) === String(_filterRoom))
      .filter(b => !_filterOnline || b.on);
  }

  function render() {
    _renderFilters();
    stats();
    rooms();
    scenes();
  }

  function _renderFilters() {
    const el = document.getElementById('page-dashboard');
    if (!el) return;

    let bar = document.getElementById('dash-filter-bar');
    if (bar) return; // já renderizado; não duplicar

    bar = document.createElement('div');
    bar.id = 'dash-filter-bar';
    bar.style.cssText = `
      display:flex;align-items:center;gap:10px;flex-wrap:wrap;
      padding:12px 0 20px;`;

    const roomOpts = [{ id: 'todos', name: 'Todos os cômodos' }, ...Data.rooms]
      .map(r => `<option value="${r.id}" ${String(r.id) === String(_filterRoom) ? 'selected' : ''}>${r.name}</option>`)
      .join('');

    bar.innerHTML = `
      <div style="font-size:12px;color:var(--text-lo);font-weight:500">Filtrar:</div>
      <select id="df-room" style="
        background:var(--dark-2);border:1px solid var(--border);
        color:var(--text-hi);font-size:12px;padding:5px 10px;
        border-radius:var(--r-md);cursor:pointer">
        ${roomOpts}
      </select>
      <button id="df-online" style="
        background:${_filterOnline ? 'var(--amber)' : 'var(--dark-2)'};
        border:1px solid ${_filterOnline ? 'var(--amber)' : 'var(--border)'};
        color:${_filterOnline ? '#0d0d0f' : 'var(--text-mid)'};
        font-size:12px;padding:5px 12px;border-radius:var(--r-md);cursor:pointer;
        transition:all .2s">
        Apenas ligados
      </button>
    `;

    const pageInner = el.querySelector('.page-inner');
    pageInner.insertBefore(bar, pageInner.firstChild);

    document.getElementById('df-room').addEventListener('change', e => {
      _filterRoom = e.target.value;
      _refresh();
    });

    document.getElementById('df-online').addEventListener('click', () => {
      _filterOnline = !_filterOnline;
      // Remove a barra para recriar com o novo estado visual
      bar.remove();
      _renderFilters();
      _refresh();
    });
  }

  function _refresh() {
    stats();
    rooms();
  }

  function stats() {
    const filtered = _filteredBulbs();
    const activeCount = filtered.filter(b => b.on).length;
    const totalPower  = filtered.reduce((s, b) => s + (b.on ? (b.power || 0) : 0), 0);
    const sc = Data.activeScene();

    const id = key => document.getElementById(key);
    id('stat-lights') && (id('stat-lights').textContent = `${activeCount} / ${filtered.length}`);
    id('stat-power')  && (id('stat-power').textContent  = `${totalPower}W`);
    if (sc && id('stat-scene-name')) {
      id('stat-scene-icon').innerHTML = sceneIcon(sc.icon, 22);
      id('stat-scene-name').textContent = sc.name;
    } else if (id('stat-scene-name')) {
      id('stat-scene-name').textContent = '—';
    }
  }

  function rooms() {
    const el = document.getElementById('dash-rooms');
    if (!el) return;

    const filteredBulbs = _filteredBulbs();
    const visibleRooms = _filterRoom === 'todos'
      ? Data.rooms.slice(0, 3)
      : Data.rooms.filter(r => String(r.id) === String(_filterRoom));

    if (!visibleRooms.length) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-3)">Nenhum cômodo encontrado para este filtro.</div>`;
      return;
    }

    el.innerHTML = visibleRooms.map(r => {
      const roomBulbs = filteredBulbs.filter(b => String(b.roomId) === String(r.id));
      const active    = roomBulbs.filter(b => b.on);
      const s = {
        total:  roomBulbs.length,
        active: active.length,
        avgBri: active.length ? Math.round(active.reduce((s, b) => s + b.brightness, 0) / active.length) : 0,
      };
      return `<div class="room-card${s.active ? ' is-on' : ''}" data-room="${r.id}">
        <div class="room-card__icon">${roomIcon(r.icon, 20)}</div>
        <div class="room-card__name">${r.name}</div>
        <div class="room-card__meta">${s.total} luzes · ${s.active > 0 ? s.avgBri + '% brilho' : 'desligado'}</div>
        <div class="room-card__footer">
          <span class="badge ${s.active ? 'badge--on' : 'badge--off'}">${s.active ? s.active + ' on' : 'off'}</span>
          <div class="toggle ${s.active ? 'is-on' : ''}" data-room="${r.id}"></div>
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('.toggle[data-room]').forEach(t => {
      t.addEventListener('click', async e => {
        e.stopPropagation();
        await Data.toggleRoom(t.dataset.room);
        rooms();
        stats();
      });
    });
  }

  function _sceneDashSub(s) {
    const n = s.deviceCount || 0;
    const items = s.deviceSettings || [];
    if (!items.length) return `${n} disp.`;

    const capKeys = items.map(ds => {
      const b = Data._resolveBulbByKey(ds.deviceUserId);
      if (!b) return '';
      const c = Data.getDeviceCapabilities(b);
      return [c.hasOn, c.hasBri, c.hasColor, c.hasTemp, c.hasAutoDimmer].join('');
    });
    if (new Set(capKeys).size > 1) return `${n} disp. · Cena mista`;

    const st = items[0].settings || {};
    const b  = Data._resolveBulbByKey(items[0].deviceUserId);
    const c  = b ? Data.getDeviceCapabilities(b) : {};
    if (st.powerOn === false) return `${n} disp. · Desligado`;
    if (c.hasBri && st.brightness != null) return `${n} disp. · ${st.brightness}%`;
    if (c.hasColor && st.color) return `${n} disp. · Cor`;
    if (c.hasTemp && st.temp) return `${n} disp. · ${st.temp}`;
    return `${n} disp. · Ligado`;
  }

  function scenes() {
    const el = document.getElementById('dash-scenes');
    if (!el) return;
    if (!Data.scenes.length) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-3)">Nenhuma cena ainda. <span style="color:var(--amber);cursor:pointer" data-nav="scenes">Criar cena</span>.</div>`;
      el.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', () => Router.navigate('scenes')));
      return;
    }
    el.innerHTML = Data.scenes.map(s => `
      <div class="scene-card${s.active ? ' is-active' : ''}" data-scene="${s.id}">
        <div class="scene-card__icon">${sceneIcon(s.icon, 20)}</div>
        <div class="scene-card__name">${s.name}</div>
        <div class="scene-card__sub">${_sceneDashSub(s)}</div>
      </div>`).join('');
    el.querySelectorAll('[data-scene]').forEach(c => {
      c.addEventListener('click', async () => {
        await Data.activateScene(c.dataset.scene);
        scenes();
        stats();
        toast('Cena ativada!');
      });
    });
  }

  document.addEventListener('deviceStateChanged', () => {
    if (document.getElementById('dash-rooms')) { stats(); rooms(); }
  });

  return { render };
})();
