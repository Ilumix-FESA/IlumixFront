/* ============================================================
   ILUMIX — Lâmpadas page
   Página dedicada ao cadastro, configuração e controle das
   lâmpadas. Cada lâmpada tem um ID que deve bater com o
   topicPrefix do ESP32.

   Fluxo:
     1. POST /api/lamp { deviceId? }  → cria com commands/attrs
     2. PUT  /api/lamp/{id}/configure → nome, locationId, ico
     3. PATCH /api/lamp/{id}/command  → executa comandos via MQTT
============================================================ */
const LampsPage = (() => {

  let selId = null;

  function render() {
    const el = document.getElementById('lamps-page-content');
    if (!el) return;

    el.innerHTML = `
      <div style="display:grid;grid-template-columns:280px 1fr;gap:var(--sp-4);min-height:500px">
        <!-- Lista de lâmpadas -->
        <div>
          <div id="lamp-list-wrap"></div>
        </div>
        <!-- Detalhe / controle -->
        <div id="lamp-detail-wrap"
          style="background:var(--dark-2);border-radius:var(--r-lg);
                 border:1px solid var(--border);padding:var(--sp-5);min-height:400px">
        </div>
      </div>`;

    _renderList();
    _renderDetail();
  }

  /* ══════════════════════════════════════════════════════════
     LISTA
  ══════════════════════════════════════════════════════════ */
  function _renderList() {
    const el = document.getElementById('lamp-list-wrap');
    if (!el) return;

    const bulbs = Data.bulbs;

    if (!bulbs.length) {
      el.innerHTML = `
        <div style="color:var(--text-lo);font-size:12px;text-align:center;
                    padding:var(--sp-5);background:var(--dark-2);border-radius:var(--r-lg);
                    border:1px solid var(--border);margin-bottom:var(--sp-3)">
          Nenhuma lâmpada cadastrada.
        </div>
        <button class="btn btn--primary btn--full" id="btn-new-lamp">
          ${icon('plus',13)} Nova Lâmpada
        </button>`;
      document.getElementById('btn-new-lamp').addEventListener('click', _openRegister);
      return;
    }

    el.innerHTML = bulbs.map(b => {
      const room    = Data.rooms.find(r=>r.id===b.roomId);
      const isSelec = b.id === selId;
      return `
        <div class="room-card${b.on?' is-on':''}${isSelec?' is-selected-room':''}"
             data-lamp="${b.id}"
             style="margin-bottom:var(--sp-2);cursor:pointer;padding:var(--sp-3)">
          <div style="display:flex;align-items:center;gap:var(--sp-2)">
            <!-- orbe -->
            <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;
                        background:${b.on?b.color:'var(--dark-5)'};
                        box-shadow:${b.on?`0 0 10px ${b.color}66`:'none'};
                        opacity:${b.on?(0.4+b.brightness/100*.6):.3};
                        transition:all .3s">
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;color:var(--text-hi);
                           overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${b.name}
              </div>
              <div style="font-size:10px;color:var(--text-lo);margin-top:2px;
                           font-family:monospace;overflow:hidden;text-overflow:ellipsis">
                ${b._apiId||b.id}
              </div>
              <div style="font-size:10px;color:var(--text-lo);margin-top:1px">
                ${room ? `<span style="color:var(--amber)">${room.name}</span>` : 'Sem cômodo'}
                · ${b.on?b.brightness+'%':'apagada'}
              </div>
            </div>
            <div class="toggle ${b.on?'is-on':''} tog-lamp" data-lamp="${b.id}"
                 style="flex-shrink:0"></div>
          </div>
        </div>`;
    }).join('') +
    `<button class="btn btn--ghost btn--full" id="btn-new-lamp" style="margin-top:var(--sp-2)">
       ${icon('plus',13)} Nova Lâmpada
     </button>`;

    el.querySelectorAll('[data-lamp]').forEach(c => {
      c.addEventListener('click', e => {
        if (e.target.closest('.tog-lamp')) return;
        selId = c.dataset.lamp;
        _renderList();
        _renderDetailWithRefresh(selId);
      });
    });
    el.querySelectorAll('.tog-lamp').forEach(t => {
      t.addEventListener('click', e => {
        e.stopPropagation();
        Data.toggleBulb(t.dataset.lamp);
        _renderList();
        if (selId===t.dataset.lamp) _renderDetail();
      });
    });
    document.getElementById('btn-new-lamp').addEventListener('click', _openRegister);

    if (!selId && bulbs.length) { selId=bulbs[0].id; _renderList(); _renderDetail(); }
  }

  /* ══════════════════════════════════════════════════════════
     DETALHE — controle completo da lâmpada
  ══════════════════════════════════════════════════════════ */
  async function _renderDetailWithRefresh(id) {
    const el = document.getElementById('lamp-detail-wrap');
    if (el) el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-5);text-align:center">Buscando status...</div>`;
    await Data.refreshBulb(id);
    _renderDetail();
  }

  function _renderDetail() {
    const el = document.getElementById('lamp-detail-wrap');
    if (!el) return;

    const b = Data.bulbs.find(x=>x.id===selId);
    if (!b) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:13px;text-align:center;padding:var(--sp-6)">
        Selecione uma lâmpada para ver os controles.
      </div>`;
      return;
    }

    const cmds     = b._cmds||[];
    const cmdNames = cmds.map(c=>(c.name||c.Name||'').toLowerCase());
    const hasBri   = cmdNames.some(n=>n.includes('brightness'));
    const hasColor = cmdNames.some(n=>n.includes('color')&&!n.includes('temp'));
    const hasTemp  = cmdNames.some(n=>n.includes('temperature')||n.includes('colortemp'));
    const hasAD    = cmdNames.some(n=>n.includes('autodimmer')||n.includes('dimmer'));
    const attrs    = b._attrs||[];
    const getAttr  = id => attrs.find(a=>(a.attributeId||a.AttributeId||a.atributo_Id)===id)?.value||'';
    const room     = Data.rooms.find(r=>r.id===b.roomId);

    el.innerHTML = `
      <!-- Cabeçalho -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--sp-4)">
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--text-hi)">${b.name}</div>
          <div style="font-size:11px;color:var(--text-lo);margin-top:4px;font-family:monospace">${b._apiId||b.id}</div>
          <div style="margin-top:4px;display:flex;gap:6px;align-items:center">
            ${room
              ? `<span class="badge badge--amber">${room.name}</span>`
              : `<span class="badge badge--off">Sem cômodo</span>`}
            <span class="badge ${b.on?'badge--on':'badge--off'}">${b.on?'Acesa':'Apagada'}</span>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn--ghost btn--sm" id="btn-lamp-refresh" title="Atualizar status">
            ${icon('refresh',12)}
          </button>
          <button class="btn btn--ghost btn--sm" id="btn-lamp-edit">
            ${icon('edit',12)} Editar
          </button>
          <button class="btn btn--ghost btn--sm" id="btn-lamp-delete" style="color:#ff6b6b">
            ${icon('trash',12)}
          </button>
        </div>
      </div>

      <!-- Orbe visual grande -->
      <div style="display:flex;justify-content:center;padding:var(--sp-4) 0">
        <div class="orb${!b.on?' is-off':b.brightness<35?' is-dim':''}"
          style="${b.on?`--orb-color:${b.color};box-shadow:0 0 ${20+b.brightness/3}px ${b.color}55`:''}">
          <div class="orb__ring"></div>
          <div class="orb__ring2"></div>
        </div>
      </div>

      <!-- Liga / Desliga -->
      <div class="drow" style="margin-bottom:var(--sp-4);padding-bottom:var(--sp-3);border-bottom:1px solid var(--border)">
        <span style="font-size:14px;font-weight:500;color:var(--text-hi)">Liga / Desliga</span>
        <div class="toggle ${b.on?'is-on':''}" id="tog-onoff"></div>
      </div>

      <!-- Brilho manual -->
      ${hasBri ? `
      <div style="margin-bottom:var(--sp-4)">
        <div style="display:flex;justify-content:space-between;margin-bottom:var(--sp-2)">
          <span style="font-size:12px;color:var(--text-mid)">Luminosidade</span>
          <span style="font-size:13px;font-weight:600;color:var(--amber)" id="bri-label">${b.brightness}%</span>
        </div>
        <div class="slider-track" id="bri-track">
          <div class="slider-fill" id="bri-fill" style="width:${b.brightness}%"></div>
          <div class="slider-thumb" id="bri-thumb" style="left:${b.brightness}%"></div>
        </div>
      </div>` : ''}

      <!-- Temperatura de cor -->
      ${hasTemp ? `
      <div style="margin-bottom:var(--sp-4)">
        <div style="font-size:12px;color:var(--text-mid);margin-bottom:var(--sp-2)">Temperatura de Cor</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${[['2200K','🕯️ Vela'],['2700K','🌅 Quente'],['4000K','⚪ Neutro'],['5000K','☀️ Dia'],['6500K','❄️ Frio']].map(([t,l])=>`
            <button class="temp-btn${b.temp===t?' is-active':''}" data-temp="${t}"
              style="flex:1;min-width:60px;font-size:11px">${l}</button>`).join('')}
        </div>
      </div>` : ''}

      <!-- Cor -->
      ${hasColor ? `
      <div style="margin-bottom:var(--sp-4)">
        <div style="font-size:12px;color:var(--text-mid);margin-bottom:var(--sp-2)">Cor da Luz</div>
        ${colorPickerHtml(b.color)}
      </div>` : ''}

      <!-- AutoDimmer -->
      ${hasAD ? `
      <div style="margin-bottom:var(--sp-4);padding:var(--sp-3);background:var(--dark-3);border-radius:var(--r-md)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3)">
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--text-hi)">AutoDimmer</div>
            <div style="font-size:10px;color:var(--text-lo)">Ajusta brilho pelo sensor do ESP32</div>
          </div>
          <div class="toggle ${getAttr('ad')==='on'?'is-on':''}" id="tog-ad"></div>
        </div>
        <div style="display:flex;gap:var(--sp-2);align-items:flex-end">
          <div style="flex:1">
            <div style="font-size:10px;color:var(--text-lo);margin-bottom:4px">Mínimo %</div>
            <input type="number" class="input" id="inp-mindim" min="0" max="100"
              value="${getAttr('mind')||'0'}" style="height:34px;padding:0 8px;font-size:12px">
          </div>
          <div style="flex:1">
            <div style="font-size:10px;color:var(--text-lo);margin-bottom:4px">Máximo %</div>
            <input type="number" class="input" id="inp-maxdim" min="0" max="100"
              value="${getAttr('maxd')||'100'}" style="height:34px;padding:0 8px;font-size:12px">
          </div>
          <button class="btn btn--primary btn--sm" id="btn-ad-bounds" style="height:34px">Aplicar</button>
        </div>
      </div>` : ''}

      <!-- Estado atual do banco -->
      <div style="padding-top:var(--sp-3);border-top:1px solid var(--border);margin-bottom:var(--sp-3)">
        <div style="font-size:10px;color:var(--text-lo);text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--sp-2)">
          Estado salvo no banco
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          ${attrs.map(a=>`
            <div style="background:var(--dark-3);border-radius:6px;padding:6px 8px">
              <div style="font-size:10px;color:var(--text-lo)">${a.name||a.Name} <span style="opacity:.5">(${a.attributeId||a.AttributeId})</span></div>
              <div style="font-size:12px;font-weight:500;color:var(--text-hi);margin-top:2px;font-family:monospace">${a.value||a.Value||'—'}</div>
            </div>`).join('')}
        </div>
      </div>

      <!-- Comandos disponíveis -->
      <div>
        <div style="font-size:10px;color:var(--text-lo);text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--sp-2)">
          Comandos MQTT disponíveis
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${cmds.map(c=>`
            <span class="badge badge--amber"
              title="Publica: ${b._apiId}@${c.name||c.Name}|{valor}"
              style="font-family:monospace;font-size:10px">
              ${c.name||c.Name}
            </span>`).join('')}
        </div>
      </div>`;

    // ── Bindings ────────────────────────────────────────────
    el.querySelector('#tog-onoff').addEventListener('click', ()=>{ Data.toggleBulb(b.id); _renderList(); _renderDetail(); });

    if (hasBri) {
      bindSlider(el.querySelector('#bri-track'), el.querySelector('#bri-fill'),
        el.querySelector('#bri-thumb'), el.querySelector('#bri-label'), b.brightness,
        v => { Data.setBrightness(b.id, v); _renderList(); });
    }

    if (hasTemp) {
      el.querySelectorAll('.temp-btn').forEach(btn => {
        btn.addEventListener('click', ()=>{
          el.querySelectorAll('.temp-btn').forEach(x=>x.classList.remove('is-active'));
          btn.classList.add('is-active');
          Data.setTemp(b.id, btn.dataset.temp);
          toast('Temperatura: '+btn.dataset.temp);
        });
      });
    }

    if (hasColor) {
      bindColorPicker(el, c=>{ Data.setColor(b.id,c); _renderDetail(); });
    }

    if (hasAD) {
      el.querySelector('#tog-ad')?.addEventListener('click', ()=>{
        const adAttr  = attrs.find(a=>(a.attributeId||a.AttributeId)==='ad');
        const isOn    = adAttr?.value === 'on';
        const newVal  = isOn ? 'off' : 'on';
        if (adAttr) adAttr.value = newVal;
        Api.lamps.command(b._apiId||b.id, 'autodimmer', newVal)
          .then(()=>toast('AutoDimmer '+newVal))
          .catch(e=>toast('❌ '+e.message));
        _renderDetail();
      });
      el.querySelector('#btn-ad-bounds')?.addEventListener('click', ()=>{
        const minV = document.getElementById('inp-mindim').value||'0';
        const maxV = document.getElementById('inp-maxdim').value||'100';
        Api.lamps.command(b._apiId||b.id, 'autodimmer', `${minV},${maxV}`)
          .then(()=>toast(`AutoDimmer: ${minV}%–${maxV}%`))
          .catch(e=>toast('❌ '+e.message));
      });
    }

    el.querySelector('#btn-lamp-refresh').addEventListener('click', async ()=>{
      await _renderDetailWithRefresh(b.id);
      toast('Status atualizado');
    });

    el.querySelector('#btn-lamp-edit').addEventListener('click', ()=>_openEdit(b.id));

    el.querySelector('#btn-lamp-delete').addEventListener('click', async ()=>{
      if (!confirm(`Excluir "${b.name}"? Esta ação remove a lâmpada do banco de dados.`)) return;
      try {
        await Data.deleteBulb(b.id);
        if (selId===b.id) selId=null;
        toast('Lâmpada excluída');
        render();
      } catch(e) { toast('❌ '+e.message); }
    });
  }

  /* ══════════════════════════════════════════════════════════
     MODAL — REGISTRAR NOVA LÂMPADA
  ══════════════════════════════════════════════════════════ */
  function _openRegister() {
    Modal.open(`
      <div class="modal__title">Nova Lâmpada</div>

      <div class="input-wrap">
        <label>Nome da lâmpada <span style="color:#ff6b6b">*</span></label>
        <input class="input" id="m-lamp-name"
          placeholder="Ex: Spot Sala, Pendente Cozinha..." autofocus>
      </div>

      <div class="input-wrap">
        <label>
          ID do dispositivo ESP32
          <span style="font-size:10px;color:var(--text-lo);font-weight:400;margin-left:4px">
            (topicPrefix no código)
          </span>
        </label>
        <input class="input" id="m-lamp-devid"
          placeholder="Ex: 69eece96fb2927d92d7d3490"
          style="font-family:monospace;font-size:12px"
          maxlength="24">
        <div style="font-size:10px;color:var(--text-lo);margin-top:4px;line-height:1.5">
          Cada ESP32 tem um ID único. Ele é o valor de <code>const char* topicPrefix</code> no código Arduino.<br>
          Se você tiver múltiplos ESP32, cada um terá um ID diferente.<br>
          <span style="color:var(--amber)">Deixe vazio</span> para gerar automaticamente — anote o ID gerado e coloque no ESP32.
        </div>
      </div>

      <div class="input-wrap">
        <label>Adicionar ao cômodo</label>
        <select class="input" id="m-lamp-room">
          <option value="">— Sem cômodo (adicionar depois) —</option>
          ${Data.rooms.map(r=>`<option value="${r.id}">${r.name}</option>`).join('')}
        </select>
      </div>

      <div id="m-lamp-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-lamp-save">Registrar</button>
      </div>`, ()=>render());

    document.getElementById('m-lamp-save').addEventListener('click', async ()=>{
      const btn    = document.getElementById('m-lamp-save');
      const errEl  = document.getElementById('m-lamp-err');
      const name   = document.getElementById('m-lamp-name').value.trim();
      const devId  = document.getElementById('m-lamp-devid').value.trim()||undefined;
      const roomId = document.getElementById('m-lamp-room').value||null;
      errEl.style.display = 'none';

      if (!name) { errEl.textContent='Informe o nome.'; errEl.style.display='block'; return; }
      btn.disabled=true; btn.textContent='Registrando...';

      try {
        // 1. Cria a lâmpada (com deviceId opcional)
        const createRes = await Api.lamps.create(devId);
        const lampData  = createRes.lamp||createRes;
        const lampId    = lampData.id||lampData.Id||lampData._id;
        if (!lampId) throw new Error('Backend não retornou ID.');

        // 2. Configura nome + cômodo (se escolhido)
        const room       = roomId ? Data.rooms.find(r=>r.id===roomId) : null;
        const locationId = room?._apiId||'';
        await Api.lamps.configure(lampId, name, locationId, '');

        // 3. Busca lâmpada completa (com commands)
        let fullLamp;
        try { fullLamp = await Api.lamps.getById(lampId); } catch { fullLamp = lampData; }

        // 4. Atualiza estado local
        await Data.loadFromApi();
        selId = lampId;

        const cmds = (fullLamp.commands||fullLamp.Commands||[]).map(c=>c.name||c.Name).join(', ');
        const msg  = devId
          ? `"${name}" registrada com ID ${devId}!`
          : `"${name}" registrada! ID gerado: ${lampId}\nColoque este ID no topicPrefix do ESP32.`;
        toast(msg);
        if (!devId) alert(`⚠️ Anote o ID da lâmpada:\n\n${lampId}\n\nSubstitua o topicPrefix no código do ESP32 por este valor.`);
        Modal.close();
      } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Registrar'; }
    });
  }

  /* ══════════════════════════════════════════════════════════
     MODAL — EDITAR LÂMPADA
  ══════════════════════════════════════════════════════════ */
  function _openEdit(lampId) {
    const b = Data.bulbs.find(x=>x.id===lampId);
    Modal.open(`
      <div class="modal__title">Editar Lâmpada</div>

      <div style="padding:10px;background:var(--dark-3);border-radius:8px;margin-bottom:14px">
        <div style="font-size:10px;color:var(--text-lo);margin-bottom:4px">ID do dispositivo</div>
        <div style="font-family:monospace;font-size:12px;color:var(--amber);word-break:break-all">${b._apiId||b.id}</div>
      </div>

      <div class="input-wrap">
        <label>Nome</label>
        <input class="input" id="m-lamp-name" value="${b.name}" autofocus>
      </div>

      <div class="input-wrap">
        <label>Cômodo</label>
        <select class="input" id="m-lamp-room">
          <option value="">— Sem cômodo —</option>
          ${Data.rooms.map(r=>`<option value="${r.id}"${b.roomId===r.id?' selected':''}>${r.name}</option>`).join('')}
        </select>
      </div>

      <div id="m-lamp-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-lamp-save">Salvar</button>
      </div>`, ()=>render());

    document.getElementById('m-lamp-save').addEventListener('click', async ()=>{
      const btn    = document.getElementById('m-lamp-save');
      const errEl  = document.getElementById('m-lamp-err');
      const name   = document.getElementById('m-lamp-name').value.trim();
      const roomId = document.getElementById('m-lamp-room').value||null;
      if (!name) { errEl.textContent='Informe o nome.'; errEl.style.display='block'; return; }
      btn.disabled=true; btn.textContent='Salvando...';
      try {
        await Data.renameBulb(lampId, name, roomId);
        toast('Lâmpada atualizada!');
        Modal.close();
      } catch(e) { errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Salvar'; }
    });
  }

  function _selectLamp(id) {
    selId = id;
    _renderList();
    _renderDetailWithRefresh(id);
  }

  return { render, _selectLamp };
})();
