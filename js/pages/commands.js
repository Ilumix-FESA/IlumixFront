/* ============================================================
   ILUMIX — Commands page — quick actions conectados à API
   ============================================================ */
const CommandsPage = (() => {

  let recognition = null;
  let isRecording  = false;

  function render() {
    renderVoice();
    renderHistory();
    bindQuickChips();
    initSpeechAPI();
  }

  /* ── Quick chips ── */
  function bindQuickChips() {
    const el = document.getElementById('quick-chips');
    if (!el) return;

    // Usa Data.toggleBulb/setBrightness/setColor que internamente usam _findCmd com os nomes reais do banco
    const chips = [
      { l:'Ligar tudo',    a: async () => { for(const b of Data.bulbs){ if(!b.on) Data.toggleBulb(b.id); } } },
      { l:'Apagar tudo',   a: async () => { for(const b of Data.bulbs){ if(b.on)  Data.toggleBulb(b.id); } } },
      { l:'Brilho máximo', a: async () => { for(const b of Data.bulbs) Data.setBrightness(b.id,100); } },
      { l:'Economia',      a: async () => { for(const b of Data.bulbs.filter(b=>b.on)) Data.setBrightness(b.id,30); } },
      { l:'Cor quente',    a: async () => { for(const b of Data.bulbs) Data.setTemp(b.id,'2700K'); } },
      { l:'Cor fria',      a: async () => { for(const b of Data.bulbs) Data.setTemp(b.id,'6500K'); } },
    ];

    // Adiciona cenas como chips
    Data.scenes.slice(0,3).forEach(s => {
      chips.push({ l:'▶ '+s.name, a: async () => { await Data.activateScene(s.id); } });
    });

    el.innerHTML = chips.map((c,i)=>`<button class="chip" data-chip="${i}">${c.l}</button>`).join('');
    el.querySelectorAll('[data-chip]').forEach(b => {
      b.addEventListener('click', async () => {
        b.disabled = true;
        b.style.cssText='background:var(--amber-dim);border-color:var(--amber);color:var(--amber)';
        try {
          await chips[+b.dataset.chip].a();
          Data.logCommand(b.textContent.trim(), 'App');
          renderHistory();
          toast(b.textContent.trim() + ' ✓');
        } catch(e) { toast('❌ '+e.message); }
        setTimeout(()=>{ b.style.cssText=''; b.disabled=false; }, 800);
      });
    });
  }

  /* ── Voice commands ── */
  function renderVoice() {
    const el = document.getElementById('vc-list');
    if (!el) return;
    el.innerHTML = Data.voiceCommands.map(vc => `
      <div class="vc-card">
        <div class="vc-card__icon">${vcActionIcon(vc)}</div>
        <div class="vc-card__info">
          <div class="vc-card__phrase">"${vc.phrase}"</div>
          <div class="vc-card__action">${vcActionLabel(vc)}</div>
        </div>
        <div class="vc-card__btns">
          <button class="btn btn--icon btn--sm btn-test-vc" data-vc="${vc.id}" title="Testar">${icon('play',12)}</button>
          <button class="btn btn--icon btn--sm btn-edit-vc" data-vc="${vc.id}" title="Editar">${icon('edit',12)}</button>
          <button class="btn btn--icon btn--sm btn-del-vc is-danger" data-vc="${vc.id}" title="Excluir">${icon('trash',12)}</button>
        </div>
      </div>`).join('') + `
      <div class="vc-card is-add" id="btn-add-vc">
        <div class="vc-card__icon">${icon('mic',18)}</div>
        <div class="vc-card__info"><div class="vc-card__phrase" style="color:var(--amber)">Gravar novo comando</div><div class="vc-card__action">Clique para adicionar</div></div>
      </div>`;

    el.querySelectorAll('.btn-test-vc').forEach(b => {
      b.addEventListener('click', async () => {
        const vc = Data.voiceCommands.find(v=>v.id===b.dataset.vc);
        if (vc) { await Data.executeVoice(vc); renderHistory(); toast(`Executado: "${vc.phrase}"`); }
      });
    });
    el.querySelectorAll('.btn-edit-vc').forEach(b => b.addEventListener('click', () => openEditVC(b.dataset.vc)));
    el.querySelectorAll('.btn-del-vc').forEach(b => {
      b.addEventListener('click', () => { if(!confirm('Excluir comando de voz?')) return; Data.deleteVoiceCmd(b.dataset.vc); renderVoice(); });
    });
    document.getElementById('btn-add-vc')?.addEventListener('click', openAddVC);
  }

  function vcActionLabel(vc) {
    const m = {
      all_off:'Desligar todas', all_on:'Ligar todas',
      toggle_room:'Alternar: '+(Data.rooms.find(r=>r.id===vc.roomId)?.name||''),
      toggle_bulb:'Alternar: '+(Data.bulbs.find(b=>b.id===vc.bulbId)?.name||''),
      scene:'Cena: '+(Data.scenes.find(s=>s.id===vc.sceneId)?.name||''),
      brightness:'Definir brilho',
    };
    return m[vc.action]||vc.action;
  }
  function vcActionIcon(vc) {
    const m={all_off:icon('moon',16),all_on:icon('sun',16),toggle_room:icon('home',16),toggle_bulb:icon('bulb',16),scene:icon('scene',16),brightness:icon('zap',16)};
    return m[vc.action]||icon('mic',16);
  }

  /* ── History ── */
  function renderHistory() {
    const el = document.getElementById('cmd-history');
    if (!el) return;
    if (!Data.commandHistory.length) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-3)">Nenhuma ação registrada ainda.</div>`;
      return;
    }
    el.innerHTML = Data.commandHistory.slice(0,10).map(e=>`
      <div class="hist-item">
        <div class="hist-item__time">${e.time}</div>
        <div class="hist-item__cmd">${e.cmd}</div>
        <span class="badge ${e.source==='Voz'?'badge--on':e.source==='Rotina'?'badge--off':'badge--amber'}">${e.source}</span>
      </div>`).join('');
  }

  /* ── Speech API ── */
  function initSpeechAPI() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;
  }

  function startListening(onResult, onError) {
    if (!recognition) { onError('API de voz não disponível.'); return; }
    if (isRecording) { recognition.stop(); return; }
    recognition.onstart  = () => isRecording = true;
    recognition.onresult = e => { isRecording=false; onResult(e.results[0][0].transcript); };
    recognition.onerror  = e => { isRecording=false; onError(e.error); };
    recognition.onend    = () => isRecording = false;
    try { recognition.start(); } catch(e) { onError('Microfone indisponível.'); }
  }

  /* ── VC forms ── */
  function vcFormHtml(vc={}) {
    return `
      <div class="input-wrap">
        <label>Frase do Comando</label>
        <div style="display:flex;gap:var(--sp-2)">
          <input class="input" id="m-vc-phrase" value="${vc.phrase||''}" placeholder="Ex: Apagar tudo" style="flex:1">
          <button class="btn btn--record" id="m-btn-rec" style="flex-shrink:0">${icon('mic',14)}</button>
        </div>
        <div style="font-size:11px;color:var(--text-lo);margin-top:4px" id="m-rec-status"></div>
      </div>
      <div class="input-wrap">
        <label>Ação</label>
        <select class="input" id="m-vc-action">
          <option value="all_off"${vc.action==='all_off'?' selected':''}>Desligar todas</option>
          <option value="all_on"${vc.action==='all_on'?' selected':''}>Ligar todas</option>
          <option value="toggle_room"${vc.action==='toggle_room'?' selected':''}>Alternar cômodo</option>
          <option value="toggle_bulb"${vc.action==='toggle_bulb'?' selected':''}>Alternar lâmpada</option>
          <option value="scene"${vc.action==='scene'?' selected':''}>Ativar cena</option>
        </select>
      </div>
      <div class="input-wrap" id="m-vc-room-wrap" style="${vc.action!=='toggle_room'?'display:none':''}">
        <label>Cômodo</label>
        <select class="input" id="m-vc-room">
          ${Data.rooms.map(r=>`<option value="${r.id}"${vc.roomId===r.id?' selected':''}>${r.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-wrap" id="m-vc-bulb-wrap" style="${vc.action!=='toggle_bulb'?'display:none':''}">
        <label>Lâmpada</label>
        <select class="input" id="m-vc-bulb">
          ${Data.bulbs.map(b=>`<option value="${b.id}"${vc.bulbId===b.id?' selected':''}>${b.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-wrap" id="m-vc-scene-wrap" style="${vc.action!=='scene'?'display:none':''}">
        <label>Cena</label>
        <select class="input" id="m-vc-scene">
          ${Data.scenes.map(s=>`<option value="${s.id}"${vc.sceneId===s.id?' selected':''}>${s.name}</option>`).join('')}
        </select>
      </div>`;
  }

  function bindVCForm(modal) {
    const action = modal.querySelector('#m-vc-action');
    const wraps  = {toggle_room:'m-vc-room-wrap', toggle_bulb:'m-vc-bulb-wrap', scene:'m-vc-scene-wrap'};
    const showWrap = () => {
      Object.values(wraps).forEach(id => { const e=modal.querySelector('#'+id); if(e) e.style.display='none'; });
      const w = wraps[action.value]; if(w){ const e=modal.querySelector('#'+w); if(e) e.style.display=''; }
    };
    action.addEventListener('change', showWrap); showWrap();
    const recBtn = modal.querySelector('#m-btn-rec');
    const status = modal.querySelector('#m-rec-status');
    const phrase = modal.querySelector('#m-vc-phrase');
    recBtn?.addEventListener('click', () => {
      recBtn.classList.add('is-recording');
      status.textContent = 'Ouvindo...';
      startListening(
        t => { phrase.value=t; recBtn.classList.remove('is-recording'); status.textContent=`"${t}"`; },
        e => { recBtn.classList.remove('is-recording'); status.textContent='Erro: '+e; }
      );
    });
  }

  function readVCForm(modal) {
    const action = modal.querySelector('#m-vc-action')?.value;
    return {
      phrase:  modal.querySelector('#m-vc-phrase')?.value.trim(),
      action,
      roomId:  action==='toggle_room' ? modal.querySelector('#m-vc-room')?.value  : null,
      bulbId:  action==='toggle_bulb' ? modal.querySelector('#m-vc-bulb')?.value  : null,
      sceneId: action==='scene'       ? modal.querySelector('#m-vc-scene')?.value : null,
    };
  }

  function openAddVC() {
    Modal.open(`
      <div class="modal__title">Novo Comando de Voz</div>
      ${vcFormHtml()}
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-vc">Salvar</button>
      </div>`, () => renderVoice());
    bindVCForm(Modal.getModal());
    document.getElementById('m-save-vc').addEventListener('click', () => {
      const data = readVCForm(Modal.getModal());
      if (!data.phrase) return toast('Informe a frase');
      Data.addVoiceCmd(data); Modal.close();
    });
  }

  function openEditVC(vcId) {
    const vc = Data.voiceCommands.find(x=>x.id===vcId);
    Modal.open(`
      <div class="modal__title">Editar Comando de Voz</div>
      ${vcFormHtml(vc)}
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-vc">Salvar</button>
      </div>`, () => renderVoice());
    bindVCForm(Modal.getModal());
    document.getElementById('m-save-vc').addEventListener('click', () => {
      const data = readVCForm(Modal.getModal());
      if (!data.phrase) return toast('Informe a frase');
      Data.editVoiceCmd(vcId, data); Modal.close();
    });
  }

  return { render };
})();
