/* ============================================================
   ILUMIX — Commands page — voice recording + full CRUD
   ============================================================ */
const CommandsPage = (() => {

  let recognition = null;
  let isRecording = false;

  function render() {
    renderVoice();
    renderHistory();
    bindQuickChips();
    initSpeechAPI();
  }

  /* ── Voice commands list ── */
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
      b.addEventListener('click', () => {
        const vc = Data.voiceCommands.find(v => v.id === b.dataset.vc);
        if (vc) { Data.executeVoice(vc); renderHistory(); toast(`Executado: "${vc.phrase}"`); }
      });
    });
    el.querySelectorAll('.btn-edit-vc').forEach(b => b.addEventListener('click', () => openEditVC(b.dataset.vc)));
    el.querySelectorAll('.btn-del-vc').forEach(b => {
      b.addEventListener('click', () => {
        if (!confirm('Excluir este comando de voz?')) return;
        Data.deleteVoiceCmd(b.dataset.vc); renderVoice();
      });
    });
    document.getElementById('btn-add-vc')?.addEventListener('click', openAddVC);
  }

  /* ── Labels & icons ── */
  function vcActionLabel(vc) {
    const actions = {
      all_off:     'Desligar todas as luzes',
      all_on:      'Ligar todas as luzes',
      toggle_room: 'Alternar cômodo: ' + (Data.rooms.find(r=>r.id===vc.roomId)?.name || ''),
      toggle_bulb: 'Alternar lâmpada: ' + (Data.bulbs.find(b=>b.id===vc.bulbId)?.name || ''),
      scene:       'Ativar cena: ' + (Data.scenes.find(s=>s.id===vc.sceneId)?.name || ''),
      brightness:  'Definir brilho',
    };
    return actions[vc.action] || vc.action;
  }
  function vcActionIcon(vc) {
    const m = { all_off:icon('moon',16), all_on:icon('sun',16), toggle_room:icon('home',16), toggle_bulb:icon('bulb',16), scene:icon('scene',16), brightness:icon('zap',16) };
    return m[vc.action] || icon('mic',16);
  }

  /* ── Quick chips ── */
  function bindQuickChips() {
    const el = document.getElementById('quick-chips');
    if (!el) return;
    const chips = [
      {l:'Ligar tudo',   a:()=>{ Data.bulbs.forEach(b=>b.on=true); }},
      {l:'Apagar tudo',  a:()=>{ Data.bulbs.forEach(b=>b.on=false); }},
      {l:'Modo noturno', a:()=>Data.activateScene('s2')},
      {l:'Modo manhã',   a:()=>Data.activateScene('s1')},
      {l:'Economia max', a:()=>{ Data.bulbs.filter(b=>b.on).forEach(b=>b.brightness=20); }},
    ];
    el.innerHTML = chips.map((c,i)=>`<button class="chip" data-chip="${i}">${c.l}</button>`).join('');
    el.querySelectorAll('[data-chip]').forEach(b => {
      b.addEventListener('click', () => {
        chips[+b.dataset.chip].a();
        Data.logCommand(b.textContent.trim());
        renderHistory();
        b.style.cssText='background:var(--amber-dim);border-color:var(--amber);color:var(--amber)';
        setTimeout(()=>b.style.cssText='',600);
      });
    });
  }

  /* ── History ── */
  function renderHistory() {
    const el = document.getElementById('cmd-history');
    if (!el) return;
    el.innerHTML = Data.commandHistory.slice(0,10).map(e => `
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
    if (!recognition) { onError('API de voz não disponível neste navegador.'); return; }
    if (isRecording) { recognition.stop(); return; }
    recognition.onstart  = () => isRecording = true;
    recognition.onresult = e => { isRecording=false; onResult(e.results[0][0].transcript); };
    recognition.onerror  = e => { isRecording=false; onError(e.error); };
    recognition.onend    = () => isRecording=false;
    try { recognition.start(); } catch(e) { onError('Microfone indisponível.'); }
  }

  /* ── VC form ── */
  function vcFormHtml(vc={}) {
    const rooms  = Data.rooms;
    const bulbs  = Data.bulbs;
    const scenes = Data.scenes;
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
          <option value="all_off"${vc.action==='all_off'?' selected':''}>Desligar todas as luzes</option>
          <option value="all_on"${vc.action==='all_on'?' selected':''}>Ligar todas as luzes</option>
          <option value="toggle_room"${vc.action==='toggle_room'?' selected':''}>Alternar cômodo...</option>
          <option value="toggle_bulb"${vc.action==='toggle_bulb'?' selected':''}>Alternar lâmpada...</option>
          <option value="scene"${vc.action==='scene'?' selected':''}>Ativar cena...</option>
          <option value="brightness"${vc.action==='brightness'?' selected':''}>Definir brilho...</option>
        </select>
      </div>
      <div class="input-wrap" id="m-vc-room-wrap" style="${vc.action!=='toggle_room'?'display:none':''}">
        <label>Cômodo</label>
        <select class="input" id="m-vc-room">
          ${rooms.map(r=>`<option value="${r.id}"${vc.roomId===r.id?' selected':''}>${r.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-wrap" id="m-vc-bulb-wrap" style="${vc.action!=='toggle_bulb'?'display:none':''}">
        <label>Lâmpada</label>
        <select class="input" id="m-vc-bulb">
          ${bulbs.map(b=>`<option value="${b.id}"${vc.bulbId===b.id?' selected':''}>${b.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-wrap" id="m-vc-scene-wrap" style="${vc.action!=='scene'?'display:none':''}">
        <label>Cena</label>
        <select class="input" id="m-vc-scene">
          ${scenes.map(s=>`<option value="${s.id}"${vc.sceneId===s.id?' selected':''}>${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-wrap" id="m-vc-bri-wrap" style="${vc.action!=='brightness'?'display:none':''}">
        <label>Nível de Brilho: <span id="m-vc-bri-lbl">${vc.brightness||50}%</span></label>
        <div class="slider-track" id="m-vc-bri-track" style="margin-top:var(--sp-2)">
          <div class="slider-fill" id="m-vc-bri-fill" style="width:${vc.brightness||50}%"></div>
          <div class="slider-thumb" id="m-vc-bri-thumb" style="left:${vc.brightness||50}%"></div>
        </div>
      </div>`;
  }

  function bindVCForm(modal) {
    const action = modal.querySelector('#m-vc-action');
    const wraps  = { toggle_room:'m-vc-room-wrap', toggle_bulb:'m-vc-bulb-wrap', scene:'m-vc-scene-wrap', brightness:'m-vc-bri-wrap' };
    const showWrap = () => {
      Object.values(wraps).forEach(id => { const el=modal.querySelector('#'+id); if(el) el.style.display='none'; });
      const w = wraps[action.value];
      if (w) { const el=modal.querySelector('#'+w); if(el) el.style.display=''; }
    };
    action.addEventListener('change', showWrap); showWrap();

    let chosenBri = 50;
    bindSlider(modal.querySelector('#m-vc-bri-track'), modal.querySelector('#m-vc-bri-fill'), modal.querySelector('#m-vc-bri-thumb'), modal.querySelector('#m-vc-bri-lbl'), 50, v=>chosenBri=v);
    modal._getBri = () => chosenBri;

    // record button
    const recBtn = modal.querySelector('#m-btn-rec');
    const status = modal.querySelector('#m-rec-status');
    const phrase = modal.querySelector('#m-vc-phrase');
    recBtn?.addEventListener('click', () => {
      recBtn.classList.add('is-recording');
      recBtn.innerHTML = `<span class="rec-dot"></span>`;
      status.textContent = 'Ouvindo...';
      startListening(
        t => { phrase.value = t; recBtn.classList.remove('is-recording'); recBtn.innerHTML=icon('mic',14); status.textContent=`Captado: "${t}"`; },
        e => { recBtn.classList.remove('is-recording'); recBtn.innerHTML=icon('mic',14); status.textContent='Erro: ' + e; }
      );
    });
  }

  function readVCForm(modal) {
    const action = modal.querySelector('#m-vc-action')?.value;
    return {
      phrase:   modal.querySelector('#m-vc-phrase')?.value.trim(),
      action,
      roomId:   action==='toggle_room'  ? modal.querySelector('#m-vc-room')?.value  : null,
      bulbId:   action==='toggle_bulb'  ? modal.querySelector('#m-vc-bulb')?.value  : null,
      sceneId:  action==='scene'        ? modal.querySelector('#m-vc-scene')?.value : null,
      brightness: modal._getBri?.() ?? null,
      icon: action,
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
      if (!data.phrase) return toast('Informe a frase do comando');
      Data.addVoiceCmd(data); Modal.close();
    });
  }

  function openEditVC(vcId) {
    const vc = Data.voiceCommands.find(x => x.id === vcId);
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
