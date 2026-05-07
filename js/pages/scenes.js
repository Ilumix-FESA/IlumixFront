/* ============================================================
   ILUMIX — Scenes page — com await nas operações de API
   ============================================================ */
const ScenesPage = (() => {

  function render() {
    const el = document.getElementById('scenes-grid');
    if (!el) return;

    el.innerHTML = Data.scenes.map(s => `
      <div class="room-card scene-card-full${s.active?' is-on':''}" data-scene="${s.id}" style="padding:var(--sp-4)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--sp-3)">
          <div style="width:44px;height:44px;border-radius:var(--r-md);background:${s.color}22;display:flex;align-items:center;justify-content:center">
            <div style="color:${s.color}">${sceneIcon(s.icon,22)}</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn--icon btn--sm btn-edit-scene" data-scene="${s.id}">${icon('edit',12)}</button>
            <button class="btn btn--icon btn--sm btn-del-scene is-danger" data-scene="${s.id}">${icon('trash',12)}</button>
          </div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text-hi);margin-bottom:2px">${s.name}</div>
        <div style="font-size:11px;color:var(--text-mid);margin-bottom:var(--sp-3)">${s.desc||''}</div>
        <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-3)">
          <span class="badge badge--amber">${s.brightness}%</span>
          <span class="badge badge--amber">${s.temp}</span>
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${s.color};margin-top:2px"></span>
        </div>
        <button class="btn ${s.active?'btn--ghost':'btn--primary'} btn--full btn-activate-scene" data-scene="${s.id}" style="font-size:11px">
          ${s.active ? icon('check',12)+' Ativa' : 'Ativar'}
        </button>
      </div>`).join('') + `
      <div class="room-card add-card" id="btn-add-scene">
        <div class="add-card__icon">${icon('plus',18)}</div>
        <div class="add-card__label">Nova Cena</div>
      </div>`;

    el.querySelectorAll('.btn-activate-scene').forEach(b => {
      b.addEventListener('click', async e => {
        e.stopPropagation();
        b.disabled = true;
        await Data.activateScene(b.dataset.scene);
        Data.logCommand('Ativar cena: '+Data.scenes.find(s=>s.id===b.dataset.scene)?.name);
        toast('Cena ativada!');
        render();
      });
    });
    el.querySelectorAll('.btn-edit-scene').forEach(b => {
      b.addEventListener('click', e => { e.stopPropagation(); openEditScene(b.dataset.scene); });
    });
    el.querySelectorAll('.btn-del-scene').forEach(b => {
      b.addEventListener('click', async e => {
        e.stopPropagation();
        if (!confirm('Excluir esta cena?')) return;
        b.disabled = true;
        await Data.deleteScene(b.dataset.scene);
        toast('Cena excluída');
        render();
      });
    });
    document.getElementById('btn-add-scene')?.addEventListener('click', openAddScene);
  }

  function sceneFormHtml(s={}) {
    return `
      <div class="input-wrap"><label>Nome</label><input class="input" id="m-sc-name" value="${s.name||''}" placeholder="Ex: Leitura"></div>
      <div class="input-wrap"><label>Descrição</label><input class="input" id="m-sc-desc" value="${s.desc||''}" placeholder="Breve descrição..."></div>
      <div class="input-wrap">
        <label>Ícone</label>${emojiPicker(s.emoji||'💡', ()=>{})}
      </div>
      <div class="input-wrap">
        <label>Luminosidade: <span id="m-sc-bri-lbl">${s.brightness||80}%</span></label>
        <div class="slider-track" id="m-sc-bri-track" style="margin-top:var(--sp-2)">
          <div class="slider-fill" id="m-sc-bri-fill" style="width:${s.brightness||80}%"></div>
          <div class="slider-thumb" id="m-sc-bri-thumb" style="left:${s.brightness||80}%"></div>
        </div>
      </div>
      <div class="input-wrap">
        <label>Temperatura de Cor</label>
        <div class="temp-btns" id="m-sc-temps">
          ${['2200K','2700K','4000K','6500K'].map(t=>`<button class="temp-btn${(s.temp||'2700K')===t?' is-active':''}" data-temp="${t}">${{2200:'Vela',2700:'Quente',4000:'Neutro',6500:'Frio'}[parseInt(t)]}</button>`).join('')}
        </div>
      </div>
      <div class="input-wrap">
        <label>Cor Principal</label>
        ${colorPickerHtml(s.color||'#E2B84A')}
      </div>`;
  }

  function openAddScene() {
    let chosenEmoji='💡', chosenColor='#E2B84A', chosenTemp='2700K', chosenBri=80;
    Modal.open(`
      <div class="modal__title">Nova Cena</div>
      ${sceneFormHtml()}
      <div id="sc-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:var(--sp-2)"></div>
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-scene">Criar Cena</button>
      </div>`, () => render());

    bindEmojiPicker(Modal.getModal(), e => chosenEmoji = e);
    bindColorPicker(Modal.getModal(), c => chosenColor = c);
    Modal.getModal().querySelectorAll('#m-sc-temps .temp-btn').forEach(b => {
      b.addEventListener('click', () => {
        Modal.getModal().querySelectorAll('#m-sc-temps .temp-btn').forEach(x=>x.classList.remove('is-active'));
        b.classList.add('is-active'); chosenTemp = b.dataset.temp;
      });
    });
    bindSlider(document.getElementById('m-sc-bri-track'), document.getElementById('m-sc-bri-fill'),
      document.getElementById('m-sc-bri-thumb'), document.getElementById('m-sc-bri-lbl'), 80, v => chosenBri = v);

    document.getElementById('m-save-scene').addEventListener('click', async () => {
      const btn  = document.getElementById('m-save-scene');
      const name = document.getElementById('m-sc-name').value.trim();
      if (!name) return toast('Informe o nome da cena');
      btn.disabled = true; btn.textContent = 'Salvando...';
      await Data.addScene({
        name, desc: document.getElementById('m-sc-desc').value.trim(),
        icon: 'scene', emoji: chosenEmoji,
        brightness: chosenBri, temp: chosenTemp, color: chosenColor,
      });
      toast('Cena criada!');
      Modal.close();
    });
  }

  function openEditScene(sceneId) {
    const s = Data.scenes.find(x => x.id === sceneId);
    let chosenEmoji=s.emoji||'💡', chosenColor=s.color, chosenTemp=s.temp, chosenBri=s.brightness;

    Modal.open(`
      <div class="modal__title">Editar Cena</div>
      ${sceneFormHtml(s)}
      <div id="sc-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:var(--sp-2)"></div>
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-scene">Salvar</button>
      </div>`, () => render());

    bindEmojiPicker(Modal.getModal(), e => chosenEmoji = e);
    bindColorPicker(Modal.getModal(), c => chosenColor = c);
    Modal.getModal().querySelectorAll('#m-sc-temps .temp-btn').forEach(b => {
      b.addEventListener('click', () => {
        Modal.getModal().querySelectorAll('#m-sc-temps .temp-btn').forEach(x=>x.classList.remove('is-active'));
        b.classList.add('is-active'); chosenTemp = b.dataset.temp;
      });
    });
    bindSlider(document.getElementById('m-sc-bri-track'), document.getElementById('m-sc-bri-fill'),
      document.getElementById('m-sc-bri-thumb'), document.getElementById('m-sc-bri-lbl'), s.brightness, v => chosenBri = v);

    document.getElementById('m-save-scene').addEventListener('click', async () => {
      const btn  = document.getElementById('m-save-scene');
      const name = document.getElementById('m-sc-name').value.trim();
      if (!name) return toast('Informe o nome');
      btn.disabled = true; btn.textContent = 'Salvando...';
      await Data.editScene(sceneId, {
        name, desc: document.getElementById('m-sc-desc').value.trim(),
        emoji: chosenEmoji, brightness: chosenBri, temp: chosenTemp, color: chosenColor,
      });
      toast('Cena atualizada!');
      Modal.close();
    });
  }

  return { render };
})();
