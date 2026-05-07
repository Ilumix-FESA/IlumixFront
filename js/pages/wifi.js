/* ============================================================
   ILUMIX — WiFi page — dados reais das lâmpadas
   ============================================================ */
const WifiPage = (() => {

  function render() { renderNetwork(); renderDevices(); }

  function renderNetwork() {
    const el = document.getElementById('wifi-network-info');
    if (!el) return;
    const online  = Data.bulbs.filter(b=>b.status==='online').length;
    const offline = Data.bulbs.length - online;
    el.innerHTML = `
      <div class="drow"><span class="drow__key">Lâmpadas cadastradas</span><span class="drow__val">${Data.bulbs.length}</span></div>
      <div class="drow"><span class="drow__key">Online</span><span class="drow__val" style="color:var(--green)">${online}</span></div>
      <div class="drow"><span class="drow__key">Offline</span><span class="drow__val" style="color:var(--text-lo)">${offline}</span></div>
      <div class="drow"><span class="drow__key">Acesas agora</span><span class="drow__val" style="color:var(--amber)">${Data.activeBulbs()}</span></div>`;
  }

  function renderDevices() {
    const el = document.getElementById('wifi-devices');
    if (!el) return;
    if (!Data.bulbs.length) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-4);text-align:center">Nenhuma lâmpada cadastrada ainda.<br><span style="color:var(--amber);cursor:pointer" onclick="Router.navigate('rooms')">Adicionar lâmpada →</span></div>`;
      return;
    }
    el.innerHTML = Data.bulbs.map(b => {
      const room = Data.rooms.find(r=>r.id===b.roomId);
      return `<div class="wifi-card">
        <div class="wifi-card__dot ${b.status}"></div>
        <div class="wifi-card__info">
          <div class="wifi-card__name">${b.name} <span style="color:var(--text-lo);font-size:11px">· ${room?.name||'sem cômodo'}</span></div>
          <div class="wifi-card__ip">${b.ip||'ID: '+(b._apiId||b.id||'—')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          <span class="badge ${b.on?'badge--on':'badge--off'}">${b.on?'Acesa':'Apagada'}</span>
          <span class="badge ${b.status==='online'?'badge--wifi':'badge--off'}">${b.status}</span>
        </div>
      </div>`;
    }).join('');
  }

  return { render };
})();
