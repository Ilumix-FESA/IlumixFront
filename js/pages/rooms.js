/* ============================================================
   ILUMIX — Rooms page
   Cômodos apenas AGRUPAM dispositivos já cadastrados.
   Para registrar/controlar dispositivos, use a página "Dispositivos".
============================================================ */
const RoomsPage = (() => {

  let selRoom = null;

  const _sameId = (a, b) => String(a) === String(b);

  function _findRoom(id) {
    return Data.rooms.find(r => _sameId(r.id, id));
  }

  function _roomThumb(r, size = 32) {
    if (r.imageUrl) {
      return `<img src="${r.imageUrl}" alt="" class="room-thumb" style="width:${size}px;height:${size}px">`;
    }
    return `<div class="room-thumb room-thumb--icon" style="width:${size}px;height:${size}px">
      ${roomIcon(r.icon, Math.round(size * 0.5))}</div>`;
  }

  /** free | here | other — cada dispositivo só pode estar em um cômodo */
  function _devicePlacement(b, roomId) {
    if (!b.roomId) return 'free';
    if (roomId != null && roomId !== '' && _sameId(b.roomId, roomId)) return 'here';
    return 'other';
  }

  function _devicePickerHtml(roomId, mode) {
    if (!Data.bulbs.length) {
      return `<div style="color:var(--text-lo);font-size:11px;padding:10px;background:var(--dark-3);
                border-radius:8px;text-align:center">
        Nenhum dispositivo cadastrado.<br>
        <span style="color:var(--amber);cursor:pointer" id="m-go-devices">Cadastrar em Dispositivos →</span>
      </div>`;
    }

    const selectable = Data.bulbs.filter(b => {
      const p = _devicePlacement(b, roomId);
      return mode === 'create' ? p === 'free' : (p === 'free' || p === 'here');
    });
    const blocked = mode === 'manage'
      ? Data.bulbs.filter(b => _devicePlacement(b, roomId) === 'other')
      : Data.bulbs.filter(b => _devicePlacement(b, roomId) === 'other');

    let html = '';

    if (mode === 'create' && blocked.length) {
      html += `<p style="font-size:10px;color:var(--text-lo);margin-bottom:8px;line-height:1.4">
        ${blocked.length} dispositivo(s) já estão em outro cômodo e não podem ser adicionados aqui.
        Remova-os do outro cômodo antes, ou use <strong>Gerenciar</strong> no cômodo de destino para movê-los.
      </p>`;
    }

    if (!selectable.length && mode === 'create') {
      html += `<p style="font-size:11px;color:var(--text-lo);padding:8px 0">
        Não há dispositivos disponíveis (todos já pertencem a um cômodo).
      </p>`;
    } else if (selectable.length) {
      html += `<div class="device-picker-list" id="room-lamp-checks">
        ${selectable.map(b => {
          const checked = mode === 'manage' && _devicePlacement(b, roomId) === 'here';
          return `
            <label class="device-picker-row${checked ? ' is-selected' : ''}">
              <input type="checkbox" data-device-key="${b._apiId}" ${checked ? 'checked' : ''}>
              <span class="device-picker-dot" style="background:${b.on ? b.color : '#444'}"></span>
              <span class="device-picker-name">${b.name}</span>
              ${checked ? '<span class="device-picker-tag device-picker-tag--here">neste cômodo</span>' : ''}
            </label>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-top:6px">
        <button type="button" class="btn btn--ghost btn--sm" id="m-sel-all">Marcar disponíveis</button>
        <button type="button" class="btn btn--ghost btn--sm" id="m-sel-none">Limpar</button>
      </div>`;
    }

    if (mode === 'manage' && blocked.length) {
      html += `<p style="font-size:10px;color:var(--text-lo);margin:12px 0 6px;text-transform:uppercase;letter-spacing:.5px">
        Em outros cômodos (não podem ser adicionados aqui)
      </p>
      <div class="device-picker-list device-picker-list--blocked">
        ${blocked.map(b => {
          const otherName = _findRoom(b.roomId)?.name || 'outro cômodo';
          return `<div class="device-picker-row device-picker-row--disabled">
            <span class="device-picker-dot" style="background:${b.on ? b.color : '#444'};opacity:.5"></span>
            <span class="device-picker-name">${b.name}</span>
            <span class="device-picker-tag">em: ${otherName}</span>
          </div>`;
        }).join('')}
      </div>`;
    }

    return html;
  }

  function _bindDevicePicker() {
    document.getElementById('m-go-devices')?.addEventListener('click', () => {
      Modal.close(); Router.navigate('devices');
    });
    document.getElementById('m-sel-all')?.addEventListener('click', () => {
      document.querySelectorAll('#room-lamp-checks input').forEach(cb => {
        cb.checked = true;
        cb.closest('label')?.classList.add('is-selected');
      });
    });
    document.getElementById('m-sel-none')?.addEventListener('click', () => {
      document.querySelectorAll('#room-lamp-checks input').forEach(cb => {
        cb.checked = false;
        cb.closest('label')?.classList.remove('is-selected');
      });
    });
    document.querySelectorAll('#room-lamp-checks input').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.closest('label')?.classList.toggle('is-selected', cb.checked);
      });
    });
  }

  function render() {
    if (!selRoom && Data.rooms.length) selRoom = Data.rooms[0].id;
    _renderRoomList();
    _renderRoomDetail();
  }

  /* ══════════════════════════════════════════════════════════
     LISTA DE CÔMODOS
  ══════════════════════════════════════════════════════════ */
  function _renderRoomList() {
    const el = document.getElementById('room-list');
    if (!el) return;

    if (!Data.rooms.length) {
      el.innerHTML = `
        <div style="color:var(--text-lo);font-size:12px;text-align:center;padding:var(--sp-5)">
          Nenhum cômodo criado.
        </div>
        <button class="btn btn--primary btn--full" id="btn-add-room">
          ${icon('plus',13)} Criar cômodo
        </button>`;
      el.querySelector('#btn-add-room').addEventListener('click', _openAddRoom);
      return;
    }

    el.innerHTML = Data.rooms.map(r => {
      const s     = Data.roomStats(r.id);
      const lamps = Data.getBulbs(r.id);
      return `
        <div class="room-card${s.active?' is-on':''}${_sameId(r.id, selRoom)?' is-selected-room':''}"
             data-room="${r.id}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            ${_roomThumb(r, 36)}
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;color:var(--text-hi);
                           overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name}</div>
              <div style="font-size:10px;color:var(--text-lo)">
                ${lamps.length} dispositivo${lamps.length!==1?'s':''} · ${s.active} acesa${s.active!==1?'s':''}
              </div>
            </div>
            <div style="display:flex;gap:4px">
              <button class="btn btn--icon btn--sm btn-edit-room" data-room="${r.id}">${icon('edit',12)}</button>
              <button class="btn btn--icon btn--sm btn-del-room" data-room="${r.id}"
                style="color:#ff6b6b">${icon('trash',12)}</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="badge ${s.active?'badge--on':'badge--off'}">
              ${s.active?s.active+' acesas':'apagadas'}
            </span>
            <div class="toggle ${s.active?'is-on':''} toggle-room" data-room="${r.id}"></div>
          </div>
        </div>`;
    }).join('') +
    `<button class="btn btn--ghost btn--full" id="btn-add-room" style="margin-top:8px">
       ${icon('plus',13)} Novo Cômodo
     </button>`;

    el.querySelectorAll('[data-room].room-card').forEach(c => {
      c.addEventListener('click', e => {
        if (e.target.closest('button,.toggle')) return;
        selRoom = c.dataset.room; _renderRoomList(); _renderRoomDetail();
      });
    });
    el.querySelectorAll('.toggle-room').forEach(t => {
      t.addEventListener('click', async e => { e.stopPropagation(); await Data.toggleRoom(t.dataset.room); _renderRoomList(); _renderRoomDetail(); });
    });
    el.querySelectorAll('.btn-edit-room').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); _openEditRoom(b.dataset.room); });
    });
    el.querySelectorAll('.btn-del-room').forEach(b => {
      b.addEventListener('click', async e => {
        e.stopPropagation();
        const r = _findRoom(b.dataset.room);
        if (!confirm(`Excluir "${r?.name}"? Os dispositivos ficarão sem cômodo.`)) return;
        b.disabled = true;
        try {
          await Data.deleteRoom(b.dataset.room);
          if (_sameId(selRoom, b.dataset.room)) selRoom = Data.rooms[0]?.id || null;
          toast('Cômodo excluído'); render();
        } catch(e) { toast('❌ '+e.message); b.disabled=false; }
      });
    });
    document.getElementById('btn-add-room')?.addEventListener('click', _openAddRoom);
  }

  /* ══════════════════════════════════════════════════════════
     DETALHE DO CÔMODO — dispositivos + controles rápidos
  ══════════════════════════════════════════════════════════ */
  function _renderRoomDetail() {
    const el = document.getElementById('bulb-detail');
    if (!el) return;

    const r = _findRoom(selRoom);
    if (!r) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-5);text-align:center">Selecione um cômodo</div>`;
      return;
    }

    const lamps = Data.getBulbs(r.id);
    const stats = Data.roomStats(r.id);

    el.innerHTML = `
      ${r.imageUrl ? `
        <div class="room-detail-hero" style="margin:-4px -4px 16px;border-radius:var(--r-md);overflow:hidden;height:460px">
          <img src="${r.imageUrl}" alt="${r.name}" style="width:100%;height:100%;object-fit:cover;object-position:center">
        </div>` : ''}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:10px">
          ${!r.imageUrl ? _roomThumb(r, 40) : ''}
          <div>
            <div style="font-size:15px;font-weight:600;color:var(--text-hi)">${r.name}</div>
            <div style="font-size:11px;color:var(--text-lo);margin-top:2px">
              ${lamps.length} dispositivo${lamps.length!==1?'s':''} · ${stats.active} ligado${stats.active!==1?'s':''}
            </div>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn--ghost btn--sm" id="btn-manage-lamps">Gerenciar</button>
          <button class="btn btn--ghost btn--sm" id="btn-toggle-all">
            ${stats.active?'Apagar tudo':'Ligar tudo'}
          </button>
        </div>
      </div>

      <!-- Dispositivos do cômodo -->
      ${lamps.length ? lamps.map(b => {
        const hasOn = Data.getDeviceCapabilities(b).hasOn;
        return `
        <div style="display:flex;align-items:center;gap:10px;
                    padding:10px;background:var(--dark-3);border-radius:8px;margin-bottom:6px">
          <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
                      background:${b.color};
                      opacity:${b.on?(0.4+b.brightness/100*.6):0.35};
                      box-shadow:${b.on?`0 0 8px ${b.color}66`:'none'}">
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500;color:var(--text-hi)">${b.name}</div>
            <div style="font-size:10px;color:var(--text-lo)">${b.on?b.brightness+'% · '+b.temp:'apagada'}</div>
          </div>
          <button class="btn btn--ghost btn--sm btn-go-lamp" data-lamp="${b.id}"
            style="font-size:10px">Controlar →</button>
          ${hasOn ? `<div class="toggle ${b.on?'is-on':''} tog-room-lamp" data-lamp="${b.id}"></div>` : ''}
        </div>`;
      }).join('') : `
        <div style="text-align:center;padding:var(--sp-5);background:var(--dark-3);
                    border-radius:8px;color:var(--text-lo);font-size:12px">
          Nenhum dispositivo neste cômodo.<br>
          <span style="font-size:11px;opacity:.7">Clique em "Gerenciar" para adicionar.</span>
        </div>`}`;

    el.querySelector('#btn-toggle-all')?.addEventListener('click', async ()=>{
      await Data.toggleRoom(r.id); _renderRoomList(); _renderRoomDetail();
    });
    el.querySelector('#btn-manage-lamps')?.addEventListener('click', ()=>_openManageLamps(r.id));

    el.querySelectorAll('.tog-room-lamp').forEach(t=>{
      t.addEventListener('click', async e=>{
        e.stopPropagation();
        await Data.toggleBulb(t.dataset.lamp);
        _renderRoomDetail(); _renderRoomList();
      });
    });

    // "Controlar →" navega para Dispositivos com o item selecionado
    el.querySelectorAll('.btn-go-lamp').forEach(b=>{
      b.addEventListener('click', ()=>{
        Router.navigate('devices');
        // Pequeno delay para a página renderizar
        setTimeout(()=>{
          const detail = { id: b.dataset.lamp };
          document.dispatchEvent(new CustomEvent('selectDevice', { detail }));
          document.dispatchEvent(new CustomEvent('selectLamp', { detail }));
        }, 100);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     MODAL — CRIAR CÔMODO (seleciona dispositivos existentes)
  ══════════════════════════════════════════════════════════ */
  function _openAddRoom() {
    Modal.open(`
      <div class="modal__title">Novo Cômodo</div>

      <div class="input-wrap">
        <label>Nome do cômodo <span style="color:#ff6b6b">*</span></label>
        <input class="input" id="m-room-name" placeholder="Ex: Sala de Estar" maxlength="50" autofocus>
      </div>

      <div class="input-wrap">
        <label>Imagem do cômodo <span style="font-size:10px;color:var(--text-lo);font-weight:400">(opcional, máx. 2 MB)</span></label>
        <input type="file" class="input" id="m-room-image" accept="image/*">
      </div>

      <div class="input-wrap">
        <label>Dispositivos deste cômodo</label>
        <p style="font-size:10px;color:var(--text-lo);margin:0 0 8px;line-height:1.4">
          Cada dispositivo pertence a <strong>apenas um</strong> cômodo. Só aparecem os que ainda não estão em outro.
        </p>
        ${_devicePickerHtml(null, 'create')}
      </div>

      <div id="m-room-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-room">Criar</button>
      </div>`, ()=>render());

    _bindDevicePicker();

    document.getElementById('m-save-room').addEventListener('click', async ()=>{
      const btn   = document.getElementById('m-save-room');
      const errEl = document.getElementById('m-room-err');
      const name  = document.getElementById('m-room-name').value.trim();
      if (!name) { errEl.textContent='Informe o nome.'; errEl.style.display='block'; return; }
      const selKeys = [...document.querySelectorAll('#room-lamp-checks input:checked')]
        .map(cb => cb.dataset.deviceKey);
      const imageFile = document.getElementById('m-room-image')?.files?.[0] || null;

      if (imageFile && imageFile.size > 2 * 1024 * 1024) {
        errEl.textContent = 'A imagem deve ter no máximo 2 MB.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled=true; btn.textContent='Criando...';
      try {
        const room = await Data.addRoom(name, imageFile);
        selRoom = room.id;
        if (selKeys.length) await Data.syncRoomDevices(room.id, selKeys);
        toast(`Cômodo "${name}" criado${selKeys.length ? ` com ${selKeys.length} dispositivo${selKeys.length !== 1 ? 's' : ''}` : ''}!`);
        Modal.close();
        render();
      } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Criar'; }
    });
  }

  /* ══════════════════════════════════════════════════════════
     MODAL — EDITAR CÔMODO
  ══════════════════════════════════════════════════════════ */
  function _openEditRoom(roomId) {
    const r = _findRoom(roomId);
    if (!r) return;
    Modal.open(`
      <div class="modal__title">Editar Cômodo</div>
      <div class="input-wrap">
        <label>Nome</label>
        <input class="input" id="m-room-name" value="${r.name}" maxlength="50" autofocus>
      </div>
      <div id="m-room-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-room">Salvar</button>
      </div>`, ()=>render());

    document.getElementById('m-save-room').addEventListener('click', async ()=>{
      const btn=document.getElementById('m-save-room'), errEl=document.getElementById('m-room-err');
      const name=document.getElementById('m-room-name').value.trim();
      if (!name) { errEl.textContent='Informe o nome.'; errEl.style.display='block'; return; }
      btn.disabled=true; btn.textContent='Salvando...';
      try { await Data.editRoom(roomId, name); toast('Cômodo atualizado!'); Modal.close(); render(); }
      catch(e) { errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Salvar'; }
    });
  }

  /* ══════════════════════════════════════════════════════════
     MODAL — GERENCIAR DISPOSITIVOS DO CÔMODO
  ══════════════════════════════════════════════════════════ */
  function _openManageLamps(roomId) {
    const r = _findRoom(roomId);
    if (!r) return;

    Modal.open(`
      <div class="modal__title">Dispositivos — ${r.name}</div>
      <p style="font-size:11px;color:var(--text-lo);margin-bottom:10px;line-height:1.4">
        Marque os dispositivos de <strong style="color:var(--text-hi)">${r.name}</strong>.
        Um dispositivo não pode estar em dois cômodos ao mesmo tempo.
      </p>
      ${_devicePickerHtml(roomId, 'manage')}
      <div id="m-manage-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px;margin-top:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-lamps">Salvar</button>
      </div>`, ()=>render());

    _bindDevicePicker();

    document.getElementById('m-save-lamps').addEventListener('click', async ()=>{
      const btn=document.getElementById('m-save-lamps'), errEl=document.getElementById('m-manage-err');
      btn.disabled=true; btn.textContent='Salvando...';
      try {
        const checked = [...document.querySelectorAll('#room-lamp-checks input:checked')]
          .map(cb => cb.dataset.deviceKey);
        await Data.syncRoomDevices(roomId, checked);
        toast('Dispositivos atualizados!'); Modal.close(); render();
      } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Salvar'; }
    });
  }

  document.addEventListener('deviceStateChanged', () => {
    if (!document.getElementById('room-list')) return;
    _renderRoomList();
    _renderRoomDetail();
  });

  return { render };
})();
