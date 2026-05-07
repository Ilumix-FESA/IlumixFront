/* ============================================================
   ILUMIX — Rooms page
   Cômodos apenas AGRUPAM lâmpadas já cadastradas.
   Para registrar/controlar lâmpadas, use a página "Lâmpadas".
============================================================ */
const RoomsPage = (() => {

  let selRoom = null;

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
        <div class="room-card${s.active?' is-on':''}${r.id===selRoom?' is-selected-room':''}"
             data-room="${r.id}">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div style="width:30px;height:30px;border-radius:6px;
                        background:#E2B84A22;display:flex;align-items:center;
                        justify-content:center;color:#E2B84A;flex-shrink:0">
              ${roomIcon(r.icon,16)}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;color:var(--text-hi);
                           overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.name}</div>
              <div style="font-size:10px;color:var(--text-lo)">
                ${lamps.length} lâmpada${lamps.length!==1?'s':''} · ${s.active} acesa${s.active!==1?'s':''}
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
      t.addEventListener('click', e => { e.stopPropagation(); Data.toggleRoom(t.dataset.room); _renderRoomList(); _renderRoomDetail(); });
    });
    el.querySelectorAll('.btn-edit-room').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); _openEditRoom(b.dataset.room); });
    });
    el.querySelectorAll('.btn-del-room').forEach(b => {
      b.addEventListener('click', async e => {
        e.stopPropagation();
        const r = Data.rooms.find(r=>r.id===b.dataset.room);
        if (!confirm(`Excluir "${r?.name}"? As lâmpadas ficarão sem cômodo.`)) return;
        b.disabled = true;
        try {
          await Data.deleteRoom(b.dataset.room);
          if (selRoom===b.dataset.room) selRoom = Data.rooms[0]?.id||null;
          toast('Cômodo excluído'); render();
        } catch(e) { toast('❌ '+e.message); b.disabled=false; }
      });
    });
    document.getElementById('btn-add-room')?.addEventListener('click', _openAddRoom);
  }

  /* ══════════════════════════════════════════════════════════
     DETALHE DO CÔMODO — lâmpadas + controles rápidos
  ══════════════════════════════════════════════════════════ */
  function _renderRoomDetail() {
    const el = document.getElementById('bulb-detail');
    if (!el) return;

    const r = Data.rooms.find(r=>r.id===selRoom);
    if (!r) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-5);text-align:center">Selecione um cômodo</div>`;
      return;
    }

    const lamps = Data.getBulbs(r.id);
    const stats = Data.roomStats(r.id);

    el.innerHTML = `
      <!-- Header -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <div>
          <div style="font-size:15px;font-weight:600;color:var(--text-hi)">${r.name}</div>
          <div style="font-size:11px;color:var(--text-lo);margin-top:2px">
            ${lamps.length} lâmpada${lamps.length!==1?'s':''} · ${stats.power}W
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn--ghost btn--sm" id="btn-manage-lamps">Gerenciar</button>
          <button class="btn btn--ghost btn--sm" id="btn-toggle-all">
            ${stats.active?'Apagar tudo':'Ligar tudo'}
          </button>
        </div>
      </div>

      <!-- Lâmpadas do cômodo -->
      ${lamps.length ? lamps.map(b => `
        <div style="display:flex;align-items:center;gap:10px;
                    padding:10px;background:var(--dark-3);border-radius:8px;margin-bottom:6px">
          <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
                      background:${b.on?b.color:'#222'};
                      opacity:${b.on?(0.4+b.brightness/100*.6):.25};
                      box-shadow:${b.on?`0 0 8px ${b.color}66`:'none'}">
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500;color:var(--text-hi)">${b.name}</div>
            <div style="font-size:10px;color:var(--text-lo)">${b.on?b.brightness+'% · '+b.temp:'apagada'}</div>
          </div>
          <button class="btn btn--ghost btn--sm btn-go-lamp" data-lamp="${b.id}"
            style="font-size:10px">Controlar →</button>
          <div class="toggle ${b.on?'is-on':''} tog-room-lamp" data-lamp="${b.id}"></div>
        </div>`).join('') : `
        <div style="text-align:center;padding:var(--sp-5);background:var(--dark-3);
                    border-radius:8px;color:var(--text-lo);font-size:12px">
          Nenhuma lâmpada neste cômodo.<br>
          <span style="font-size:11px;opacity:.7">Clique em "Gerenciar" para adicionar.</span>
        </div>`}

      <!-- Modo festa -->
      ${lamps.length ? `
        <button class="btn btn--ghost btn--full" id="btn-party"
          style="margin-top:10px;${Data.isParty(r.id)?'border-color:var(--amber);color:var(--amber)':''}">
          ${Data.isParty(r.id)?'✕ Parar modo festa':'🎉 Modo Festa'}
        </button>
      ` : ''}`;

    el.querySelector('#btn-toggle-all')?.addEventListener('click', ()=>{
      Data.toggleRoom(r.id); _renderRoomList(); _renderRoomDetail();
    });
    el.querySelector('#btn-manage-lamps')?.addEventListener('click', ()=>_openManageLamps(r.id));
    el.querySelector('#btn-party')?.addEventListener('click', ()=>{ _toggleParty(r.id); _renderRoomDetail(); });

    el.querySelectorAll('.tog-room-lamp').forEach(t=>{
      t.addEventListener('click', e=>{
        e.stopPropagation();
        Data.toggleBulb(t.dataset.lamp);
        _renderRoomDetail(); _renderRoomList();
      });
    });

    // "Controlar →" navega para a página Lâmpadas com a lâmpada selecionada
    el.querySelectorAll('.btn-go-lamp').forEach(b=>{
      b.addEventListener('click', ()=>{
        // Navega para a página Lâmpadas e seleciona essa lâmpada
        Router.navigate('lamps');
        // Pequeno delay para a página renderizar
        setTimeout(()=>{
          const event = new CustomEvent('selectLamp', { detail: { id: b.dataset.lamp } });
          document.dispatchEvent(event);
        }, 100);
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     PARTY
  ══════════════════════════════════════════════════════════ */
  const PARTY_COLORS = ['#FF4040','#FF8040','#FFD700','#40FF80','#40C0FF','#A040FF','#FF40C0'];
  let partyTimers = {};
  function _toggleParty(roomId) {
    const on = Data.isParty(roomId);
    Data.setParty(roomId, !on);
    if (!on) {
      const lamps = Data.getBulbs(roomId);
      partyTimers[roomId] = setInterval(()=>{
        lamps.forEach(b=>{ b.on=true; b.color=PARTY_COLORS[Math.floor(Math.random()*PARTY_COLORS.length)]; b.brightness=80+Math.floor(Math.random()*20); });
        _renderRoomDetail(); _renderRoomList();
      }, 400);
    } else { clearInterval(partyTimers[roomId]); delete partyTimers[roomId]; }
    _renderRoomList();
  }

  /* ══════════════════════════════════════════════════════════
     MODAL — CRIAR CÔMODO (seleciona lâmpadas existentes)
  ══════════════════════════════════════════════════════════ */
  function _openAddRoom() {
    const freeBulbs = Data.bulbs.filter(b=>!b.roomId);
    Modal.open(`
      <div class="modal__title">Novo Cômodo</div>

      <div class="input-wrap">
        <label>Nome do cômodo <span style="color:#ff6b6b">*</span></label>
        <input class="input" id="m-room-name" placeholder="Ex: Sala de Estar" autofocus>
      </div>

      <div class="input-wrap">
        <label>Lâmpadas deste cômodo</label>
        ${!Data.bulbs.length ? `
          <div style="color:var(--text-lo);font-size:11px;padding:10px;
                      background:var(--dark-3);border-radius:8px;text-align:center">
            Nenhuma lâmpada cadastrada ainda.<br>
            <span style="color:var(--amber);cursor:pointer" id="m-go-lamps">
              Cadastrar na página Lâmpadas →
            </span>
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:4px;max-height:240px;
                      overflow-y:auto;padding:4px;border:1px solid var(--border);
                      border-radius:8px" id="room-lamp-checks">
            ${Data.bulbs.map(b=>{
              const inOther = b.roomId;
              const otherName = inOther ? Data.rooms.find(r=>r.id===b.roomId)?.name : null;
              return `
                <label style="display:flex;align-items:center;gap:8px;padding:7px 8px;
                              border-radius:6px;cursor:pointer">
                  <input type="checkbox" data-lamp="${b._apiId||b.id}"
                    style="accent-color:var(--amber)">
                  <div style="width:8px;height:8px;border-radius:50%;
                              background:${b.on?b.color:'#444'};flex-shrink:0"></div>
                  <span style="font-size:12px;color:var(--text-hi)">${b.name}</span>
                  ${inOther?`<span style="font-size:10px;color:var(--text-lo);margin-left:auto">
                    atualmente em: ${otherName||'outro cômodo'}
                  </span>`:''}
                </label>`;
            }).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <button type="button" class="btn btn--ghost btn--sm" id="m-sel-all">Todas</button>
            <button type="button" class="btn btn--ghost btn--sm" id="m-sel-none">Nenhuma</button>
          </div>
        `}
      </div>

      <div id="m-room-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-room">Criar</button>
      </div>`, ()=>render());

    document.getElementById('m-go-lamps')?.addEventListener('click',()=>{ Modal.close(); Router.navigate('lamps'); });
    document.getElementById('m-sel-all')?.addEventListener('click',()=>{
      document.querySelectorAll('#room-lamp-checks input').forEach(cb=>{ cb.checked=true; cb.closest('label').style.background='var(--amber-dim)'; });
    });
    document.getElementById('m-sel-none')?.addEventListener('click',()=>{
      document.querySelectorAll('#room-lamp-checks input').forEach(cb=>{ cb.checked=false; cb.closest('label').style.background='transparent'; });
    });
    document.querySelectorAll('#room-lamp-checks input').forEach(cb=>{
      cb.addEventListener('change',()=>{ cb.closest('label').style.background=cb.checked?'var(--amber-dim)':'transparent'; });
    });

    document.getElementById('m-save-room').addEventListener('click', async ()=>{
      const btn   = document.getElementById('m-save-room');
      const errEl = document.getElementById('m-room-err');
      const name  = document.getElementById('m-room-name').value.trim();
      if (!name) { errEl.textContent='Informe o nome.'; errEl.style.display='block'; return; }
      const selLampIds = [...document.querySelectorAll('#room-lamp-checks input:checked')]
        .map(cb=>cb.dataset.lamp);
      btn.disabled=true; btn.textContent='Criando...';
      try {
        const room = await Data.addRoom(name,'bulb');
        selRoom = room.id;
        // Associa as lâmpadas selecionadas
        for (const lampApiId of selLampIds) {
          const b = Data.bulbs.find(b=>b._apiId===lampApiId||b.id===lampApiId);
          if (b) { await Api.lamps.configure(lampApiId, b.name, room._apiId, ''); b.roomId=room.id; }
        }
        toast(`Cômodo "${name}" criado com ${selLampIds.length} lâmpada${selLampIds.length!==1?'s':''}!`);
        Modal.close();
      } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Criar'; }
    });
  }

  /* ══════════════════════════════════════════════════════════
     MODAL — EDITAR CÔMODO
  ══════════════════════════════════════════════════════════ */
  function _openEditRoom(roomId) {
    const r = Data.rooms.find(r=>r.id===roomId);
    Modal.open(`
      <div class="modal__title">Editar Cômodo</div>
      <div class="input-wrap">
        <label>Nome</label>
        <input class="input" id="m-room-name" value="${r.name}" autofocus>
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
      try { await Data.editRoom(roomId,name,r.icon); toast('Cômodo atualizado!'); Modal.close(); }
      catch(e) { errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Salvar'; }
    });
  }

  /* ══════════════════════════════════════════════════════════
     MODAL — GERENCIAR LÂMPADAS DO CÔMODO
  ══════════════════════════════════════════════════════════ */
  function _openManageLamps(roomId) {
    const r = Data.rooms.find(r=>r.id===roomId);
    const currentIds = new Set(Data.getBulbs(roomId).map(b=>b._apiId||b.id));

    Modal.open(`
      <div class="modal__title">Lâmpadas — ${r.name}</div>
      ${!Data.bulbs.length ? `
        <div style="color:var(--text-lo);font-size:12px;padding:14px;text-align:center">
          Nenhuma lâmpada cadastrada.<br>
          <span style="color:var(--amber);cursor:pointer" id="m-go-lamps">Cadastrar →</span>
        </div>
      ` : `
        <p style="font-size:11px;color:var(--text-lo);margin-bottom:10px">
          Marque as lâmpadas que pertencem a <strong style="color:var(--text-hi)">${r.name}</strong>.
        </p>
        <div style="display:flex;flex-direction:column;gap:4px;max-height:300px;overflow-y:auto;
                    padding:4px;border:1px solid var(--border);border-radius:8px" id="manage-lamp-checks">
          ${Data.bulbs.map(b=>{
            const inThis  = currentIds.has(b._apiId||b.id);
            const inOther = b.roomId && b.roomId!==roomId;
            const otherName = inOther ? Data.rooms.find(r=>r.id===b.roomId)?.name : null;
            return `
              <label style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:6px;
                            cursor:pointer;background:${inThis?'var(--amber-dim)':'transparent'}">
                <input type="checkbox" data-lamp="${b._apiId||b.id}" data-local="${b.id}"
                  ${inThis?'checked':''} style="accent-color:var(--amber)">
                <div style="width:8px;height:8px;border-radius:50%;background:${b.on?b.color:'#444'};flex-shrink:0"></div>
                <span style="font-size:12px;color:var(--text-hi)">${b.name}</span>
                ${inThis?`<span style="font-size:10px;color:var(--green);margin-left:auto">neste cômodo</span>`:''}
                ${inOther?`<span style="font-size:10px;color:var(--amber);margin-left:auto">em: ${otherName}</span>`:''}
              </label>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:6px">
          <button type="button" class="btn btn--ghost btn--sm" id="m-sel-all">Todas</button>
          <button type="button" class="btn btn--ghost btn--sm" id="m-sel-none">Nenhuma</button>
        </div>
      `}
      <div id="m-manage-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px;margin-top:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-lamps">Salvar</button>
      </div>`, ()=>render());

    document.getElementById('m-go-lamps')?.addEventListener('click',()=>{ Modal.close(); Router.navigate('lamps'); });
    document.getElementById('m-sel-all')?.addEventListener('click',()=>{
      document.querySelectorAll('#manage-lamp-checks input').forEach(cb=>{ cb.checked=true; cb.closest('label').style.background='var(--amber-dim)'; });
    });
    document.getElementById('m-sel-none')?.addEventListener('click',()=>{
      document.querySelectorAll('#manage-lamp-checks input').forEach(cb=>{ cb.checked=false; cb.closest('label').style.background='transparent'; });
    });
    document.querySelectorAll('#manage-lamp-checks input').forEach(cb=>{
      cb.addEventListener('change',()=>{ cb.closest('label').style.background=cb.checked?'var(--amber-dim)':'transparent'; });
    });

    document.getElementById('m-save-lamps').addEventListener('click', async ()=>{
      const btn=document.getElementById('m-save-lamps'), errEl=document.getElementById('m-manage-err');
      btn.disabled=true; btn.textContent='Salvando...';
      try {
        const checked = new Set([...document.querySelectorAll('#manage-lamp-checks input:checked')].map(cb=>cb.dataset.lamp));
        for (const b of Data.bulbs) {
          const apiId = b._apiId||b.id;
          const wasIn = currentIds.has(apiId), nowIn = checked.has(apiId);
          if (wasIn && !nowIn) { await Api.lamps.configure(apiId,b.name,'',''); b.roomId=null; }
          else if (!wasIn && nowIn) { await Api.lamps.configure(apiId,b.name,r._apiId||roomId,''); b.roomId=roomId; }
        }
        toast('Lâmpadas atualizadas!'); Modal.close();
      } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Salvar'; }
    });
  }

  return { render };
})();
