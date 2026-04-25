/* ============================================================
   ILUMIX — WiFi page
   ============================================================ */
const WifiPage = (() => {

  let scanning = false;
  let scanInterval = null;

  function render() {
    renderNetwork();
    renderDevices();
  }

  function renderNetwork() {
    const el = document.getElementById('wifi-network-info');
    if (!el) return;
    const net = Data.wifiNetwork;
    el.innerHTML = `
      <div class="drow"><span class="drow__key">Rede</span><span class="drow__val">${net.ssid}</span></div>
      <div class="drow"><span class="drow__key">Gateway</span><span class="drow__val" style="font-family:monospace;font-size:12px">${net.gateway}</span></div>
      <div class="drow"><span class="drow__key">Lâmpadas online</span><span class="drow__val">${Data.bulbs.filter(b=>b.status==='online').length} / ${Data.bulbs.length}</span></div>`;
  }

  function renderDevices() {
    const el = document.getElementById('wifi-devices');
    if (!el) return;
    el.innerHTML = Data.bulbs.map(b => {
      const room = Data.rooms.find(r => r.id === b.roomId);
      const sig  = b.rssi ? signalStrength(b.rssi) : 0;
      return `<div class="wifi-card">
        <div class="wifi-card__dot ${b.status}"></div>
        <div class="wifi-card__info">
          <div class="wifi-card__name">${b.name} <span style="color:var(--text-lo);font-size:11px">· ${room?.name||''}</span></div>
          <div class="wifi-card__ip">${b.ip || 'não conectada'}</div>
        </div>
        <div style="display:flex;align-items:center;gap:var(--sp-3)">
          ${b.rssi ? `<div style="display:flex;align-items:center;gap:4px">${signalHtml(b.rssi)}<span style="font-size:10px;color:var(--text-lo)">${b.rssi}dBm</span></div>` : ''}
          <span class="badge ${b.status==='online'?'badge--wifi':b.status==='pairing'?'badge--amber':'badge--off'}">${b.status==='online'?'Online':b.status==='pairing'?'Pareando':'Offline'}</span>
          ${b.status==='offline'?`<button class="btn btn--ghost btn--sm btn-pair-bulb" data-bulb="${b.id}">${icon('wifi',12)} Parear</button>`:''}
        </div>
      </div>`;
    }).join('');

    el.querySelectorAll('.btn-pair-bulb').forEach(b => {
      b.addEventListener('click', () => openPairModal(b.dataset.bulb));
    });
  }

  function openPairModal(bulbId) {
    const b = Data.bulbs.find(x => x.id === bulbId);
    Modal.open(`
      <div class="modal__title">Parear Lâmpada</div>
      <div style="text-align:center;padding:var(--sp-4) 0">
        <div style="width:64px;height:64px;background:var(--amber-dim);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto var(--sp-4);color:var(--amber)">${icon('wifi',28)}</div>
        <div style="font-size:14px;font-weight:600;margin-bottom:var(--sp-2)">${b.name}</div>
        <div style="font-size:12px;color:var(--text-mid);margin-bottom:var(--sp-4)">Coloque a lâmpada no modo de pareamento (pisque 3x) e informe as configurações da rede.</div>
      </div>
      <div class="input-wrap"><label>SSID da rede (2.4 GHz)</label><input class="input" id="m-w-ssid" value="${Data.wifiNetwork.ssid}" placeholder="Nome da rede Wi-Fi"></div>
      <div class="input-wrap"><label>Senha</label><input class="input" type="password" id="m-w-pass" placeholder="Senha da rede"></div>
      <div class="input-wrap"><label>IP a atribuir (opcional)</label><input class="input" id="m-w-ip" placeholder="192.168.1.xxx"></div>
      <div id="pair-status" style="font-size:12px;color:var(--text-mid);text-align:center;min-height:20px;margin-bottom:var(--sp-3)"></div>
      <div style="display:flex;gap:var(--sp-2)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-btn-pair">${icon('wifi',13)} Iniciar Pareamento</button>
      </div>`, () => renderDevices());

    document.getElementById('m-btn-pair').addEventListener('click', () => {
      const status = document.getElementById('pair-status');
      const ip     = document.getElementById('m-w-ip').value.trim();
      const btn    = document.getElementById('m-btn-pair');
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Pareando...`;
      status.textContent = 'Procurando lâmpada...';
      // Simulate pairing
      Data.editBulb(bulbId, { status: 'pairing' });
      renderDevices();
      setTimeout(() => {
        Data.editBulb(bulbId, { status: 'online', ip: ip || '192.168.1.' + (100 + Math.floor(Math.random()*50)), rssi: -58 });
        status.textContent = 'Lâmpada pareada com sucesso!';
        btn.innerHTML = icon('check',13) + ' Concluído';
        setTimeout(() => Modal.close(), 1200);
      }, 2500);
    });
  }

  return { render };
})();
