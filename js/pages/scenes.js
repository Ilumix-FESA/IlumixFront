/* ============================================================
   ILUMIX — Scenes page
   Cenas incluem seleção de lâmpadas — ao ativar, o frontend
   envia os comandos diretamente a cada lâmpada selecionada.
   POST /api/scene → {Name, Description, Ico, Brightness, Temp, Color, LampSelecioned}
   ============================================================ */
const ScenesPage = (() => {

  function render() {
    const el = document.getElementById('scenes-grid');
    if (!el) return;

    if (!Data.scenes.length) {
      el.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:32px">
          <div style="color:var(--text-lo);font-size:14px;margin-bottom:8px">Nenhuma cena criada.</div>
          <p style="color:var(--text-lo);font-size:12px;max-width:280px;margin:0 auto 16px">
            Cenas definem brilho, temperatura e cor.<br>
            Selecione as lâmpadas que serão controladas ao ativar.
          </p>
        </div>
        <div class="room-card add-card" id="btn-add-scene">
          <div class="add-card__icon">${icon('plus',20)}</div>
          <div class="add-card__label">Nova Cena</div>
        </div>`;
      document.getElementById('btn-add-scene')?.addEventListener('click', _openAddScene);
      return;
    }

    el.innerHTML = Data.scenes.map(s => `
      <div class="room-card scene-card-full${s.active?' is-on':''}" style="padding:16px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
          <div style="width:44px;height:44px;border-radius:10px;background:${s.color}22;display:flex;align-items:center;justify-content:center">
            <div style="color:${s.color}">${sceneIcon(s.icon,22)}</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn--icon btn--sm btn-edit-scene" data-scene="${s.id}">${icon('edit',12)}</button>
            <button class="btn btn--icon btn--sm btn-del-scene" data-scene="${s.id}" style="color:#ff6b6b">${icon('trash',12)}</button>
          </div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text-hi);margin-bottom:2px">${s.name}</div>
        <div style="font-size:11px;color:var(--text-lo);margin-bottom:10px;min-height:14px">${s.desc}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">
          <span class="badge badge--amber">${s.brightness}%</span>
          <span class="badge badge--amber">${s.temp}</span>
          <span style="display:inline-flex;align-items:center;gap:3px">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${s.color}"></span>
            <span style="font-size:10px;color:var(--text-lo)">${s.color}</span>
          </span>
        </div>
        <div style="font-size:10px;color:var(--text-lo);margin-bottom:8px">
          ${s.lampSelecioned?.length ? `${s.lampSelecioned.length} lâmpada${s.lampSelecioned.length!==1?'s':''} selecionada${s.lampSelecioned.length!==1?'s':''}` : 'Aplica em todas acesas'}
        </div>
        ${s.active
          ? `<button class="btn btn--ghost btn--full" style="font-size:11px;border-color:var(--amber);color:var(--amber)" disabled>${icon('check',12)} Ativa agora</button>`
          : `<button class="btn btn--primary btn--full btn-activate" data-scene="${s.id}" style="font-size:11px">Ativar cena</button>`}
      </div>`).join('') + `
      <div class="room-card add-card" id="btn-add-scene">
        <div class="add-card__icon">${icon('plus',20)}</div>
        <div class="add-card__label">Nova Cena</div>
      </div>`;

    el.querySelectorAll('.btn-activate').forEach(b => {
      b.addEventListener('click', async ()=>{
        b.disabled=true; b.textContent='Ativando...';
        try { await Data.activateScene(b.dataset.scene); toast('Cena ativada!'); render(); }
        catch(e){ toast('❌ '+e.message); b.disabled=false; b.textContent='Ativar cena'; }
      });
    });
    el.querySelectorAll('.btn-edit-scene').forEach(b=>{
      b.addEventListener('click', e=>{ e.stopPropagation(); _openEditScene(b.dataset.scene); });
    });
    el.querySelectorAll('.btn-del-scene').forEach(b=>{
      b.addEventListener('click', async e=>{
        e.stopPropagation();
        const s=Data.scenes.find(s=>s.id===b.dataset.scene);
        if (!confirm(`Excluir "${s?.name}"?`)) return;
        b.disabled=true;
        try { await Data.deleteScene(b.dataset.scene); toast('Cena excluída'); render(); }
        catch(e){ toast('❌ '+e.message); b.disabled=false; }
      });
    });
    document.getElementById('btn-add-scene')?.addEventListener('click', _openAddScene);
  }

  /* ── Form helper ─────────────────────────────────────── */
  function _formHtml(s={}) {
    const bri=s.brightness??80, tmp=s.temp||'2700K', clr=s.color||'#E2B84A';
    const selLampIds = new Set((s.lampSelecioned||[]).map(l=>l.lampId));

    return `
      <div class="input-wrap">
        <label>Nome <span style="color:#ff6b6b">*</span></label>
        <input class="input" id="m-sc-name" value="${s.name||''}" placeholder="Ex: Modo Cinema" maxlength="60" autofocus>
      </div>
      <div class="input-wrap">
        <label>Descrição</label>
        <input class="input" id="m-sc-desc" value="${s.desc||''}" placeholder="Ex: Luz suave para relaxar">
      </div>
      <div class="input-wrap">
        <label>Luminosidade: <span id="m-sc-bri-lbl" style="color:var(--amber);font-weight:600">${bri}%</span></label>
        <div class="slider-track" id="m-sc-bri-track" style="margin-top:6px">
          <div class="slider-fill" id="m-sc-bri-fill" style="width:${bri}%"></div>
          <div class="slider-thumb" id="m-sc-bri-thumb" style="left:${bri}%"></div>
        </div>
      </div>
      <div class="input-wrap">
        <label>Temperatura de Cor</label>
        <div style="display:flex;gap:4px;flex-wrap:wrap" id="m-sc-temps">
          ${[['2200K','Vela'],['2700K','Quente'],['4000K','Neutro'],['5000K','Dia'],['6500K','Frio']].map(([t,l])=>`
            <button type="button" class="temp-btn${tmp===t?' is-active':''}" data-temp="${t}" style="flex:1;min-width:52px;font-size:10px">${l}<br><span style="opacity:.5;font-size:9px">${t}</span></button>`).join('')}
        </div>
      </div>
      <div class="input-wrap">
        <label>Cor Principal</label>
        ${colorPickerHtml(clr)}
      </div>
      <div class="input-wrap">
        <label>Lâmpadas da cena</label>
        <p style="font-size:10px;color:var(--text-lo);margin-bottom:8px">
          Selecione as lâmpadas que serão controladas ao ativar. Se nenhuma for selecionada, aplica em todas as acesas.
        </p>
        ${Data.bulbs.length ? `
          <div style="display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;padding:4px;border:1px solid var(--border);border-radius:8px" id="lamp-checkboxes">
            ${Data.bulbs.map(b=>{
              const room=Data.rooms.find(r=>r.id===b.roomId);
              const checked=selLampIds.has(b._apiId||b.id)||selLampIds.has(b.id);
              return `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;background:${checked?'var(--amber-dim)':'transparent'}">
                <input type="checkbox" data-lamp-id="${b._apiId||b.id}" ${checked?'checked':''} style="accent-color:var(--amber)">
                <div style="width:8px;height:8px;border-radius:50%;background:${b.on?b.color:'#444'};flex-shrink:0"></div>
                <span style="font-size:12px;color:var(--text-hi)">${b.name}</span>
                <span style="font-size:10px;color:var(--text-lo);margin-left:auto">${room?.name||'sem cômodo'}</span>
              </label>`;
            }).join('')}
          </div>
          <div style="display:flex;gap:8px;margin-top:6px">
            <button type="button" class="btn btn--ghost btn--sm" id="m-sel-all">Todas</button>
            <button type="button" class="btn btn--ghost btn--sm" id="m-sel-none">Nenhuma</button>
          </div>
        ` : `<div style="color:var(--text-lo);font-size:11px">Nenhuma lâmpada cadastrada ainda.</div>`}
      </div>`;
  }

  function _bindFormExtras(bri, tmp) {
    // Slider
    bindSlider(document.getElementById('m-sc-bri-track'),document.getElementById('m-sc-bri-fill'),
      document.getElementById('m-sc-bri-thumb'),document.getElementById('m-sc-bri-lbl'),bri,v=>{ bri=v; });

    // Temperatura
    document.querySelectorAll('#m-sc-temps .temp-btn').forEach(b=>{
      b.addEventListener('click',()=>{
        document.querySelectorAll('#m-sc-temps .temp-btn').forEach(x=>x.classList.remove('is-active'));
        b.classList.add('is-active'); tmp=b.dataset.temp;
      });
    });

    // Selecionar todas / nenhuma
    document.getElementById('m-sel-all')?.addEventListener('click',()=>{
      document.querySelectorAll('[data-lamp-id]').forEach(cb=>{
        cb.checked=true;
        cb.closest('label').style.background='var(--amber-dim)';
      });
    });
    document.getElementById('m-sel-none')?.addEventListener('click',()=>{
      document.querySelectorAll('[data-lamp-id]').forEach(cb=>{
        cb.checked=false;
        cb.closest('label').style.background='transparent';
      });
    });
    document.querySelectorAll('[data-lamp-id]').forEach(cb=>{
      cb.addEventListener('change',()=>{
        cb.closest('label').style.background=cb.checked?'var(--amber-dim)':'transparent';
      });
    });

    return { getBri:()=>bri, getTmp:()=>tmp };
  }

  function _readLampIds() {
    return [...document.querySelectorAll('[data-lamp-id]:checked')].map(cb=>cb.dataset.lampId);
  }

  function _openAddScene() {
    let bri=80, tmp='2700K', clr='#E2B84A';
    Modal.open(`
      <div class="modal__title">Nova Cena</div>
      ${_formHtml()}
      <div id="m-sc-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-scene">Criar Cena</button>
      </div>`, ()=>render());

    const ref = _bindFormExtras(bri, tmp);
    bindColorPicker(Modal.getModal(), c=>clr=c);

    document.getElementById('m-save-scene').addEventListener('click', async ()=>{
      const btn=document.getElementById('m-save-scene'), errEl=document.getElementById('m-sc-err');
      const name=document.getElementById('m-sc-name').value.trim();
      if (!name){ errEl.textContent='Informe o nome.'; errEl.style.display='block'; return; }
      btn.disabled=true; btn.textContent='Criando...';
      try {
        await Data.addScene({
          name, description:document.getElementById('m-sc-desc').value.trim(),
          ico:'scene', brightness:ref.getBri(), temp:ref.getTmp(), color:clr,
          lampIds: _readLampIds(), locationIds:[],
        });
        toast('Cena criada!'); Modal.close();
      } catch(e){ errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Criar Cena'; }
    });
  }

  function _openEditScene(sceneId) {
    const s=Data.scenes.find(x=>x.id===sceneId);
    let bri=s.brightness, tmp=s.temp, clr=s.color;

    Modal.open(`
      <div class="modal__title">Editar Cena</div>
      ${_formHtml(s)}
      <div id="m-sc-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-scene">Salvar</button>
      </div>`, ()=>render());

    const ref = _bindFormExtras(bri, tmp);
    bindColorPicker(Modal.getModal(), c=>clr=c);

    document.getElementById('m-save-scene').addEventListener('click', async ()=>{
      const btn=document.getElementById('m-save-scene'), errEl=document.getElementById('m-sc-err');
      const name=document.getElementById('m-sc-name').value.trim();
      if (!name){ errEl.textContent='Informe o nome.'; errEl.style.display='block'; return; }
      btn.disabled=true; btn.textContent='Salvando...';
      try {
        await Data.editScene(sceneId,{
          name, description:document.getElementById('m-sc-desc').value.trim(),
          ico:s.icon||'scene', brightness:ref.getBri(), temp:ref.getTmp(), color:clr,
          lampIds: _readLampIds(), locationIds:[],
        });
        toast('Cena atualizada!'); Modal.close();
      } catch(e){ errEl.textContent=e.message; errEl.style.display='block'; btn.disabled=false; btn.textContent='Salvar'; }
    });
  }

  return { render };
})();
