/* ============================================================
   ILUMIX — Schedule page — full CRUD
   ============================================================ */
const SchedulePage = (() => {

  function render() {
    const el = document.getElementById('sched-list');
    if (!el) return;

    el.innerHTML = Data.schedules.map(s => {
      const scene = Data.scenes.find(sc => sc.id === s.sceneId);
      const target = targetLabel(s);
      return `<div class="sched-item" data-sched="${s.id}">
        <div class="sched-item__time">${s.time}</div>
        <div class="sched-item__info" style="flex:1">
          <div class="sched-item__name">${s.name}</div>
          <div class="sched-item__desc">${scene?scene.name+' · ':''} ${target}</div>
          <div style="margin-top:var(--sp-1)">${dayDotsHtml(s.days)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:var(--sp-2)">
          <div style="display:flex;gap:4px">
            <button class="btn btn--icon btn--sm btn-edit-sched" data-sched="${s.id}">${icon('edit',12)}</button>
            <button class="btn btn--icon btn--sm btn-del-sched is-danger" data-sched="${s.id}">${icon('trash',12)}</button>
          </div>
          <div class="toggle ${s.on?'is-on':''} tog-sched" data-sched="${s.id}"></div>
        </div>
      </div>`;
    }).join('') + `<button class="btn btn--ghost btn--full" id="btn-add-sched" style="margin-top:var(--sp-2)">${icon('plus',13)} Nova Rotina</button>`;

    el.querySelectorAll('.tog-sched').forEach(t => {
      t.addEventListener('click', () => { Data.toggleSchedule(+t.dataset.sched); render(); });
    });
    el.querySelectorAll('.btn-edit-sched').forEach(b => {
      b.addEventListener('click', () => openEditSched(+b.dataset.sched));
    });
    el.querySelectorAll('.btn-del-sched').forEach(b => {
      b.addEventListener('click', () => {
        if (!confirm('Excluir rotina?')) return;
        Data.deleteSchedule(+b.dataset.sched); render();
      });
    });
    document.getElementById('btn-add-sched')?.addEventListener('click', openAddSched);
  }

  function targetLabel(s) {
    if (s.targetType === 'room') {
      const r = Data.rooms.find(r => r.id === s.targetId);
      return r ? r.name : 'Cômodo';
    }
    if (s.targetType === 'bulb') {
      const b = Data.bulbs.find(b => b.id === s.targetId);
      return b ? b.name : 'Lâmpada';
    }
    return 'Toda a casa';
  }

  function schedFormHtml(s={}) {
    const rooms  = Data.rooms;
    const bulbs  = Data.bulbs;
    const scenes = Data.scenes;
    return `
      <div class="input-wrap"><label>Nome da Rotina</label><input class="input" id="m-s-name" value="${s.name||''}" placeholder="Ex: Acordar aos poucos"></div>
      <div class="input-wrap"><label>Horário</label><input class="input" type="time" id="m-s-time" value="${s.time||'07:00'}"></div>
      <div class="input-wrap">
        <label>Dias</label>
        ${dayDotsHtml(s.days||[1,1,1,1,1,0,0], 'm-s-days')}
      </div>
      <div class="input-wrap">
        <label>Cena a ativar</label>
        <select class="input" id="m-s-scene">
          <option value="">— Nenhuma —</option>
          ${scenes.map(sc=>`<option value="${sc.id}"${s.sceneId===sc.id?' selected':''}>${sc.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-wrap">
        <label>Aplicar em</label>
        <select class="input" id="m-s-target-type">
          <option value="all"${(!s.targetType||s.targetType==='all')?' selected':''}>Toda a casa</option>
          <option value="room"${s.targetType==='room'?' selected':''}>Cômodo específico</option>
          <option value="bulb"${s.targetType==='bulb'?' selected':''}>Lâmpada específica</option>
        </select>
      </div>
      <div class="input-wrap" id="m-s-room-wrap" style="${s.targetType!=='room'?'display:none':''}">
        <label>Cômodo</label>
        <select class="input" id="m-s-target-room">
          ${rooms.map(r=>`<option value="${r.id}"${s.targetId===r.id?' selected':''}>${r.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-wrap" id="m-s-bulb-wrap" style="${s.targetType!=='bulb'?'display:none':''}">
        <label>Lâmpada</label>
        <select class="input" id="m-s-target-bulb">
          ${bulbs.map(b=>`<option value="${b.id}"${s.targetId===b.id?' selected':''}>${b.name} (${Data.rooms.find(r=>r.id===b.roomId)?.name||''})</option>`).join('')}
        </select>
      </div>`;
  }

  function bindSchedForm(modal) {
    const tt = modal.querySelector('#m-s-target-type');
    const rw = modal.querySelector('#m-s-room-wrap');
    const bw = modal.querySelector('#m-s-bulb-wrap');
    tt?.addEventListener('change', () => {
      rw.style.display = tt.value==='room' ? '' : 'none';
      bw.style.display = tt.value==='bulb' ? '' : 'none';
    });
    bindDayDots(modal);
  }

  function readSchedForm(modal) {
    const tt = modal.querySelector('#m-s-target-type')?.value;
    return {
      name:       modal.querySelector('#m-s-name').value.trim(),
      time:       modal.querySelector('#m-s-time').value,
      days:       readDays(modal),
      sceneId:    modal.querySelector('#m-s-scene').value || null,
      targetType: tt || 'all',
      targetId:   tt==='room' ? modal.querySelector('#m-s-target-room')?.value : tt==='bulb' ? modal.querySelector('#m-s-target-bulb')?.value : null,
    };
  }

  function openAddSched() {
    Modal.open(`
      <div class="modal__title">Nova Rotina</div>
      ${schedFormHtml()}
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-sched">Criar</button>
      </div>`, () => render());

    bindSchedForm(Modal.getModal());
    document.getElementById('m-save-sched').addEventListener('click', () => {
      const data = readSchedForm(Modal.getModal());
      if (!data.name || !data.time) return toast('Preencha nome e horário');
      Data.addSchedule({ ...data, desc: '' });
      Modal.close();
    });
  }

  function openEditSched(schedId) {
    const s = Data.schedules.find(x => x.id === schedId);
    Modal.open(`
      <div class="modal__title">Editar Rotina</div>
      ${schedFormHtml(s)}
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4)">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-sched">Salvar</button>
      </div>`, () => render());

    bindSchedForm(Modal.getModal());
    document.getElementById('m-save-sched').addEventListener('click', () => {
      const data = readSchedForm(Modal.getModal());
      if (!data.name || !data.time) return toast('Preencha nome e horário');
      Data.editSchedule(schedId, data);
      Modal.close();
    });
  }

  return { render };
})();
