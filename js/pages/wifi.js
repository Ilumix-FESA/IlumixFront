/* ============================================================
   ILUMIX — WiFi page
   Lista os dispositivos cadastrados e permite adicionar novos
   via DeviceId (topicPrefix do ESP32) ou geração automática.
   ============================================================ */
const WifiPage = (() => {

  function render() {
    renderNetwork();
    renderDevices();
    renderRoomSelect();
  }

  /* Resumo de conectividade no topo */
  function renderNetwork() {
    const el = document.getElementById('wifi-network-info');
    if (!el) return;
    const online  = Data.bulbs.filter(b => b.status === 'online').length;
    const offline = Data.bulbs.length - online;
    el.innerHTML = `
      <div class="drow"><span class="drow__key">Lâmpadas cadastradas</span><span class="drow__val">${Data.bulbs.length}</span></div>
      <div class="drow"><span class="drow__key">Online</span><span class="drow__val text-green">${online}</span></div>
      <div class="drow"><span class="drow__key">Offline</span><span class="drow__val text-lo">${offline}</span></div>
      <div class="drow"><span class="drow__key">Acesas agora</span><span class="drow__val text-amber">${Data.activeBulbs()}</span></div>`;
  }

  /* Lista de dispositivos */
  function renderDevices() {
    const el = document.getElementById('wifi-devices');
    if (!el) return;

    if (!Data.bulbs.length) {
      el.innerHTML = `
        <div class="empty-hint">
          Nenhuma lâmpada cadastrada ainda.<br>
          <span class="text-amber" style="cursor:pointer" onclick="Router.navigate('rooms')">Adicionar lâmpada →</span>
        </div>`;
      return;
    }

    el.innerHTML = Data.bulbs.map(b => {
      const room = Data.rooms.find(r => r.id === b.roomId);
      return `
        <div class="wifi-card">
          <div class="wifi-card__dot ${b.status}"></div>
          <div class="wifi-card__info">
            <div class="wifi-card__name">
              ${b.name}
              <span class="text-lo" style="font-size:11px">· ${room?.name || 'sem cômodo'}</span>
            </div>
            <div class="wifi-card__ip">ID: ${b._apiId || b.id || '—'}</div>
          </div>
          <div class="text-flex">
            <span class="badge ${b.on ? 'badge--on' : 'badge--off'}">${b.on ? 'Acesa' : 'Apagada'}</span>
            <span class="badge ${b.status === 'online' ? 'badge--wifi' : 'badge--off'}">${b.status}</span>
          </div>
        </div>`;
    }).join('');
  }

  /* Popula o select de cômodos no formulário */
  function renderRoomSelect() {
    const sel = document.getElementById('nw-room');
    if (!sel) return;
    sel.innerHTML = `<option value="">— Sem cômodo —</option>` +
      Data.rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  }

  /* Bindings do formulário — chamado uma vez em main.js */
  function init() {
    document.getElementById('btn-add-wifi-bulb')?.addEventListener('click', async () => {
      const btn    = document.getElementById('btn-add-wifi-bulb');
      const name   = document.getElementById('nw-name').value.trim();
      const roomId = document.getElementById('nw-room').value || null;

      if (!name) return toast('Informe o nome da lâmpada');

      btn.disabled    = true;
      btn.textContent = 'Adicionando...';
      try {
        await Data.addBulb(name, roomId);
        document.getElementById('nw-name').value = '';
        toast('Lâmpada adicionada!');
        WifiPage.render();
      } catch(e) {
        toast('❌ ' + e.message);
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Adicionar';
      }
    });

    document.getElementById('btn-scan')?.addEventListener('click', () => {
      toast('Escaneando rede...');
    });
  }

  return { render, init };
})();
