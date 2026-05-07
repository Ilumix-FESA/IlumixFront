/* ============================================================
   ILUMIX — Rooms page — completo com await nas operações de API
   ============================================================ */
const RoomsPage = (() => {

  let selRoom = null;
  let selBulb = null;
  let partyTimers = {};

  function render() {
    selRoom = selRoom || (Data.rooms[0]?.id ?? null);
    renderRoomList();
    renderBulbList();
    renderBulbDetail();
  }

  /* ── Room list ── */
  function renderRoomList() {
    const el = document.getElementById('room-list');
    if (!el) return;
    el.innerHTML = Data.rooms.map(r => {
      const s = Data.roomStats(r.id);
      return `<div class="room-card${s.active?' is-on':''}${r.id===selRoom?' is-selected-room':''}" data-room="${r.id}" style="margin-bottom:var(--sp-2);padding:var(--sp-3)">
        <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2)">
          <div style="width:32px;height:32px;border-radius:var(--r-sm);background:${r.color}22;display:flex;align-items:center;justify-content:center;color:${r.color};flex-shrink:0">${roomIcon(r.icon,16)}</div>
          <div style="flex:1;min-width:0"><div class="room-card__name" style="font-size:12px">${r.name}</div><div class="room-card__meta" style="font-size:10px">${s.total} luzes · ${s.power}W</div></div>
          <div style="display:flex;gap:4px;flex-shrink:0">
            <button class="btn btn--icon btn--sm btn-edit-room" data-room="${r.id}">${icon('edit',12)}</button>
            <button class="btn btn--icon btn--sm btn-del-room is-danger" data-room="${r.id}">${icon('trash',12)}</button>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="badge ${s.active?'badge--on':'badge--off'}">${s.active?s.active+' ligadas':'desligado'}</span>
          <div class="toggle ${s.active?'is-on':''} toggle-room" data-room="${r.id}"></div>
        </div>
      </div>`;
    }).join('') + `<button class="btn btn--ghost btn--full" id="btn-add-room" style="margin-top:var(--sp-2)">${icon('plus',13)} Novo Cômodo</button>`;

    el.querySelectorAll('[data-room]').forEach(c => {
      c.addEventListener('click', e => {
        if (e.target.closest('button') || e.target.closest('.toggle')) return;
        selRoom = c.dataset.room; selBulb = null;
        renderRoomList(); renderBulbList(); renderBulbDetail();
      });
    });
    el.querySelectorAll('.toggle-room').forEach(t => {
      t.addEventListener('click', e => {
        e.stopPropagation();
        Data.toggleRoom(t.dataset.room);
        renderRoomList(); renderBulbList(); renderBulbDetail();
      });
    });
    el.querySelectorAll('.btn-edit-room').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); openEditRoom(b.dataset.room); });
    });
    el.querySelectorAll('.btn-del-room').forEach(b => {
      b.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('Excluir cômodo e todas as lâmpadas?')) return;
        b.disabled = true;
        if (selRoom === b.dataset.room) { selRoom = Data.rooms.find(r=>r.id!==b.dataset.room)?.id ?? null; selBulb = null; }
        await Data.deleteRoom(b.dataset.room);
        toast('Cômodo excluído');
        render();
      });
    });
    document.getElementById('btn-add-room')?.addEventListener('click', openAddRoom);
  }

  /* ── Bulb list ── */
  function renderBulbList() {
    const el = document.getElementById('bulb-list');
    if (!el) return;
    const room = Data.rooms.find(r => r.id === selRoom);
    const rbl  = selRoom ? Data.getBulbs(selRoom) : [];
    document.getElementById('bulb-list-title').textContent = room ? room.name : 'Lâmpadas';

    const partyBtn = document.getElementById('btn-party');
    if (partyBtn) {
      const on = selRoom && Data.isParty(selRoom);
      partyBtn.textContent = on ? 'Parar festa' : 'Modo festa';
      partyBtn.classList.toggle('is-active', !!on);
      partyBtn.onclick = () => toggleParty(selRoom);
    }

    el.innerHTML = rbl.map(b => `
      <div class="bulb-card${b.id===selBulb?' is-active':''}" data-bulb="${b.id}">
        <div class="bulb-card__orb" style="background:${b.on?b.color:'var(--dark-5)'};box-shadow:${b.on?`0 0 8px ${b.color}88`:'none'};opacity:${b.on?(0.3+b.brightness/100*0.7):0.25}"></div>
        <div class="bulb-card__info">
          <div class="bulb-card__name">${b.name}</div>
          <div class="bulb-card__meta">${b.on ? b.brightness+'% · '+b.temp : 'desligada'} · <span class="badge ${b.status==='online'?'badge--wifi':'badge--off'}" style="font-size:9px">${b.status}</span></div>
        </div>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="btn btn--icon btn--sm btn-del-bulb is-danger" data-bulb="${b.id}">${icon('trash',12)}</button>
          <div class="toggle ${b.on?'is-on':''} toggle-bulb" data-bulb="${b.id}"></div>
        </div>
      </div>`).join('') + (selRoom ? `<button class="btn btn--ghost btn--full" id="btn-add-bulb" style="margin-top:var(--sp-2)">${icon('plus',13)} Nova Lâmpada</button>` : '');

    el.querySelectorAll('[data-bulb]').forEach(c => {
      c.addEventListener('click', e => {
        if (e.target.closest('button') || e.target.closest('.toggle')) return;
        selBulb = c.dataset.bulb; renderBulbList(); renderBulbDetail();
      });
    });
    el.querySelectorAll('.toggle-bulb').forEach(t => {
      t.addEventListener('click', e => {
        e.stopPropagation();
        Data.toggleBulb(t.dataset.bulb);
        renderBulbList(); renderBulbDetail();
      });
    });
    el.querySelectorAll('.btn-del-bulb').forEach(b => {
      b.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('Excluir esta lâmpada?')) return;
        b.disabled = true;
        if (selBulb === b.dataset.bulb) selBulb = null;
        await Data.deleteBulb(b.dataset.bulb);
        toast('Lâmpada excluída');
        renderBulbList(); renderBulbDetail();
      });
    });
    document.getElementById('btn-add-bulb')?.addEventListener('click', () => openAddBulb(selRoom));
    if (!selBulb && rbl.length) { selBulb = rbl[0].id; renderBulbList(); renderBulbDetail(); }
  }

  /* ── Bulb detail ── */
  function renderBulbDetail() {
    const el = document.getElementById('bulb-detail');
    if (!el) return;
    const b = Data.bulbs.find(x => x.id === selBulb);
    if (!b) { el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-4)">Selecione uma lâmpada</div>`; return; }

    el.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3)">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text-hi)">${b.name}</div>
          <div style="font-size:11px;color:var(--text-mid);margin-top:2px">${b.ip || 'sem IP'} · ${b.status}</div>
        </div>
        <button class="btn btn--ghost btn--sm btn-edit-bulb" data-bulb="${b.id}">${icon('edit',12)} Editar</button>
      </div>
      <div class="orb-wrap" style="padding:var(--sp-3) 0 var(--sp-4)">
        <div class="orb${!b.on?' is-off':b.brightness<35?' is-dim':''}" id="bulb-orb">
          <div class="orb__ring"></div><div class="orb__ring2"></div>
        </div>
      </div>
      <div class="drow"><span class="drow__key">Liga / Desliga</span><div class="toggle ${b.on?'is-on':''}" id="tog-onoff"></div></div>
      <div style="margin:var(--sp-4) 0">
        <div style="display:flex;justify-content:space-between;margin-bottom:var(--sp-2)">
          <span style="font-size:11px;color:var(--text-mid)">Luminosidade</span>
          <span style="font-size:12px;font-weight:600;color:var(--amber)" id="bri-label">${b.brightness}%</span>
        </div>
        <div class="slider-track" id="bri-track">
          <div class="slider-fill" id="bri-fill" style="width:${b.brightness}%"></div>
          <div class="slider-thumb" id="bri-thumb" style="left:${b.brightness}%"></div>
        </div>
      </div>
      <div style="margin-bottom:var(--sp-4)">
        <div style="font-size:11px;color:var(--text-mid);margin-bottom:var(--sp-2)">Temperatura de Cor</div>
        <div class="temp-btns">
          <button class="temp-btn${b.temp==='2200K'?' is-active':''}" data-temp="2200K">Vela</button>
          <button class="temp-btn${b.temp==='2700K'?' is-active':''}" data-temp="2700K">Quente</button>
          <button class="temp-btn${b.temp==='4000K'?' is-active':''}" data-temp="4000K">Neutro</button>
          <button class="temp-btn${b.temp==='6500K'?' is-active':''}" data-temp="6500K">Frio</button>
        </div>
      </div>
      <div style="margin-bottom:var(--sp-4)">
        <div style="font-size:11px;color:var(--text-mid);margin-bottom:var(--sp-2)">Cor da Luz</div>
        ${colorPickerHtml(b.color)}
      </div>
      <div class="drow"><span class="drow__key">Consumo</span><span class="drow__val">${b.power}W</span></div>
      <div class="drow"><span class="drow__key">IP</span><span class="drow__val" style="font-family:monospace;font-size:11px">${b.ip || '—'}</span></div>
      <div class="drow"><span class="drow__key">Sinal</span><span class="drow__val">${b.rssi ? signalHtml(b.rssi)+' '+b.rssi+' dBm' : '—'}</span></div>`;

    updateOrb(el.querySelector('#bulb-orb'), b);

    el.querySelector('#tog-onoff').addEventListener('click', () => {
      Data.toggleBulb(b.id); renderBulbList(); renderBulbDetail();
    });
    bindSlider(el.querySelector('#bri-track'), el.querySelector('#bri-fill'),
      el.querySelector('#bri-thumb'), el.querySelector('#bri-label'), b.brightness,
      val => { Data.setBrightness(b.id, val); updateOrb(el.querySelector('#bulb-orb'), b); renderBulbList(); });
    el.querySelectorAll('.temp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        Data.setTemp(b.id, btn.dataset.temp);
        el.querySelectorAll('.temp-btn').forEach(x=>x.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });
    bindColorPicker(el, c => {
      Data.setColor(b.id, c); updateOrb(el.querySelector('#bulb-orb'), b); renderBulbList();
    });
    el.querySelector('.btn-edit-bulb')?.addEventListener('click', () => openEditBulb(b.id));
  }

  /* ── Party ── */
  function toggleParty(roomId) {
    if (!roomId) return;
    const isOn = Data.isParty(roomId);
    Data.setParty(roomId, !isOn);
    if (!isOn) {
      const bulbsInRoom = Data.getBulbs(roomId);
      partyTimers[roomId] = setInterval(() => {
        bulbsInRoom.forEach(b => { b.on=true; b.color=PARTY_COLORS[Math.floor(Math.random()*PARTY_COLORS.length)]; b.brightness=80+Math.floor(Math.random()*20); });
        renderBulbList();
        if (selBulb && bulbsInRoom.find(b=>b.id===selBulb)) updateOrb(document.getElementById('bulb-orb'), Data.bulbs.find(b=>b.id===selBulb));
      }, 500);
    } else { clearInterval(partyTimers[roomId]); delete partyTimers[roomId]; }
    renderBulbList(); renderRoomList();
  }

  /* ── Modals ── */
  function openAddRoom() {
    Modal.open(`
      <div class="modal__title">Novo Cômodo</div>
      <div class="input-wrap"><label>Nome</label><input class="input" id="m-room-name" placeholder="Ex: Varanda"></div>
      <div class="input-wrap"><label>Cor de destaque</label><input type="color" class="input" id="m-room-color" value="#E2B84A" style="height:40px;padding:4px"></div>
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-room">Salvar</button>
      </div>`, () => render());

    document.getElementById('m-save-room').addEventListener('click', async () => {
      const btn   = document.getElementById('m-save-room');
      const name  = document.getElementById('m-room-name').value.trim();
      if (!name) return toast('Informe o nome do cômodo');
      const color = document.getElementById('m-room-color').value;
      btn.disabled = true; btn.textContent = 'Salvando...';
      await Data.addRoom(name, 'bulb', color);
      toast('Cômodo criado!');
      Modal.close();
    });
  }

  function openEditRoom(roomId) {
    const r = Data.rooms.find(x => x.id === roomId);
    Modal.open(`
      <div class="modal__title">Editar Cômodo</div>
      <div class="input-wrap"><label>Nome</label><input class="input" id="m-room-name" value="${r.name}"></div>
      <div class="input-wrap"><label>Cor de destaque</label><input type="color" class="input" id="m-room-color" value="${r.color}" style="height:40px;padding:4px"></div>
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-room">Salvar</button>
      </div>`, () => render());

    document.getElementById('m-save-room').addEventListener('click', async () => {
      const btn  = document.getElementById('m-save-room');
      const name = document.getElementById('m-room-name').value.trim();
      if (!name) return toast('Informe o nome');
      btn.disabled = true; btn.textContent = 'Salvando...';
      await Data.editRoom(roomId, { name, color: document.getElementById('m-room-color').value });
      toast('Cômodo atualizado!');
      Modal.close();
    });
  }

  function openAddBulb(roomId) {
    Modal.open(`
      <div class="modal__title">Nova Lâmpada</div>
      <div class="input-wrap"><label>Nome</label><input class="input" id="m-bulb-name" placeholder="Ex: Spot Teto"></div>
      <div class="input-wrap"><label>Endereço IP (opcional)</label><input class="input" id="m-bulb-ip" placeholder="192.168.1.xxx"></div>
      <div class="input-wrap"><label>Potência (W)</label><input class="input" type="number" id="m-bulb-power" value="5" min="1" max="60"></div>
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-bulb">Adicionar</button>
      </div>`, () => { renderBulbList(); renderBulbDetail(); });

    document.getElementById('m-save-bulb').addEventListener('click', async () => {
      const btn   = document.getElementById('m-save-bulb');
      const name  = document.getElementById('m-bulb-name').value.trim();
      if (!name) return toast('Informe o nome');
      const ip    = document.getElementById('m-bulb-ip').value.trim() || null;
      const power = parseInt(document.getElementById('m-bulb-power').value) || 5;
      btn.disabled = true; btn.textContent = 'Salvando...';
      await Data.addBulb(roomId, name, { ip, power, status: ip ? 'online' : 'offline' });
      toast('Lâmpada adicionada!');
      Modal.close();
    });
  }

  function openEditBulb(bulbId) {
    const b = Data.bulbs.find(x => x.id === bulbId);
    Modal.open(`
      <div class="modal__title">Editar Lâmpada</div>
      <div class="input-wrap"><label>Nome</label><input class="input" id="m-bulb-name" value="${b.name}"></div>
      <div class="input-wrap"><label>Endereço IP</label><input class="input" id="m-bulb-ip" value="${b.ip||''}" placeholder="192.168.1.xxx"></div>
      <div class="input-wrap"><label>Potência (W)</label><input class="input" type="number" id="m-bulb-power" value="${b.power}" min="1" max="60"></div>
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-bulb">Salvar</button>
      </div>`, () => { renderBulbList(); renderBulbDetail(); });

    document.getElementById('m-save-bulb').addEventListener('click', () => {
      const name = document.getElementById('m-bulb-name').value.trim();
      if (!name) return toast('Informe o nome');
      Data.editBulb(bulbId, {
        name,
        ip:    document.getElementById('m-bulb-ip').value.trim() || null,
        power: parseInt(document.getElementById('m-bulb-power').value) || b.power,
      });
      toast('Lâmpada atualizada!');
      Modal.close();
    });
  }

  return { render };
})();
