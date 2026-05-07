/* ============================================================
   ILUMIX — Dashboard
   ============================================================ */
const DashboardPage = (() => {

  function render() { stats(); rooms(); scenes(); }

  function stats() {
    const sc = Data.activeScene();
    const el = id => document.getElementById(id);
    el('stat-lights') && (el('stat-lights').textContent = `${Data.activeBulbs()} / ${Data.bulbs.length}`);
    el('stat-power')  && (el('stat-power').textContent  = `${Data.totalPower()}W`);
    if (sc && el('stat-scene-name')) {
      el('stat-scene-icon').innerHTML = sceneIcon(sc.icon, 22);
      el('stat-scene-name').textContent = sc.name;
    } else if (el('stat-scene-name')) {
      el('stat-scene-name').textContent = '—';
    }
  }

  function rooms() {
    const el = document.getElementById('dash-rooms');
    if (!el) return;
    if (!Data.rooms.length) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-3)">Nenhum cômodo ainda. <a href="#rooms" data-nav="rooms" style="color:var(--amber)">Adicione um</a>.</div>`;
      el.querySelectorAll('[data-nav]').forEach(a => a.addEventListener('click', () => Router.navigate('rooms')));
      return;
    }
    el.innerHTML = Data.rooms.slice(0,3).map(r => {
      const s = Data.roomStats(r.id);
      return `<div class="room-card${s.active?' is-on':''}" data-room="${r.id}">
        <div class="room-card__icon">${roomIcon(r.icon,20)}</div>
        <div class="room-card__name">${r.name}</div>
        <div class="room-card__meta">${s.total} luzes · ${s.active>0?s.avgBri+'% brilho':'desligado'}</div>
        <div class="room-card__footer">
          <span class="badge ${s.active?'badge--on':'badge--off'}">${s.active?s.active+' on':'off'}</span>
          <div class="toggle ${s.active?'is-on':''}" data-room="${r.id}"></div>
        </div>
      </div>`;
    }).join('');
    el.querySelectorAll('.toggle[data-room]').forEach(t => {
      t.addEventListener('click', e => { e.stopPropagation(); Data.toggleRoom(t.dataset.room); rooms(); stats(); });
    });
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
      <div class="scene-card${s.active?' is-active':''}" data-scene="${s.id}">
        <div class="scene-card__icon">${sceneIcon(s.icon,20)}</div>
        <div class="scene-card__name">${s.name}</div>
        <div class="scene-card__sub">${s.brightness}% · ${s.temp}</div>
      </div>`).join('');
    el.querySelectorAll('[data-scene]').forEach(c => {
      c.addEventListener('click', async () => { await Data.activateScene(c.dataset.scene); scenes(); stats(); toast('Cena ativada!'); });
    });
  }

  return { render };
})();
