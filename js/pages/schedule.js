/* ============================================================
   ILUMIX — Schedule page
   Horários são executados pelo Data._checkSchedules (setInterval de 1 min).
   Ao criar uma rotina, o timer é reiniciado automaticamente.
   ============================================================ */
const SchedulePage = (() => {

  function render() {
    const el = document.getElementById('sched-list');
    if (!el) return;

    // Mostra próxima execução de cada rotina
    function nextRun(sched) {
      if (!sched.on) return 'Desativada';
      const [h,m] = sched.time.split(':').map(Number);
      const now = new Date();
      const dayIdx = now.getDay()===0 ? 6 : now.getDay()-1;
      // Encontra próximo dia ativo
      for (let d=0; d<7; d++) {
        const checkIdx = (dayIdx+d)%7;
        if (!sched.days || sched.days[checkIdx]) {
          const next = new Date(now);
          next.setDate(next.getDate()+d);
          next.setHours(h,m,0,0);
          if (next<=now && d===0) continue; // já passou hoje
          const diff = next-now;
          if (diff<0) continue;
          const hh=Math.floor(diff/3600000), mm=Math.floor((diff%3600000)/60000);
          if (hh>23) return 'Amanhã às '+sched.time;
          if (hh>0)  return `Em ${hh}h${mm>0?mm+'min':''}`;
          return `Em ${mm} min`;
        }
      }
      return 'Sem dias ativos';
    }

    if (!Data.schedules.length) {
      el.innerHTML = `
        <div style="color:var(--text-lo);font-size:12px;text-align:center;padding:32px">
          Nenhuma rotina criada ainda.<br>
          <span style="font-size:11px;opacity:.7">Rotinas executam automaticamente no horário configurado.</span>
        </div>
        <button class="btn btn--ghost btn--full" id="btn-add-sched">${icon('plus',13)} Nova Rotina</button>`;
      document.getElementById('btn-add-sched')?.addEventListener('click', _openAddSched);
      return;
    }

    el.innerHTML = Data.schedules.map(s => {
      const scene  = Data.scenes.find(sc=>sc.id===s.sceneId);
      const target = _targetLabel(s);
      const next   = nextRun(s);
      return `
        <div class="sched-item">
          <div class="sched-item__time">${s.time}</div>
          <div class="sched-item__info" style="flex:1;min-width:0">
            <div class="sched-item__name">${s.name}</div>
            <div class="sched-item__desc" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${scene?`<span style="color:var(--amber)">${scene.name}</span> · `:''} ${target}
            </div>
            <div style="margin-top:4px;display:flex;align-items:center;gap:8px">
              ${dayDotsHtml(s.days||[1,1,1,1,1,0,0])}
              <span style="font-size:10px;color:var(--text-lo)">${next}</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0">
            <div style="display:flex;gap:4px">
              <button class="btn btn--icon btn--sm btn-edit-sched" data-sched="${s.id}">${icon('edit',12)}</button>
              <button class="btn btn--icon btn--sm btn-del-sched" data-sched="${s.id}" style="color:#ff6b6b">${icon('trash',12)}</button>
            </div>
            <div class="toggle ${s.on?'is-on':''} tog-sched" data-sched="${s.id}"></div>
          </div>
        </div>`;
    }).join('') +
    `<button class="btn btn--ghost btn--full" id="btn-add-sched" style="margin-top:8px">${icon('plus',13)} Nova Rotina</button>`;

    el.querySelectorAll('.tog-sched').forEach(t=>{
      t.addEventListener('click',()=>{ Data.toggleSchedule(Number(t.dataset.sched)); render(); });
    });
    el.querySelectorAll('.btn-edit-sched').forEach(b=>{
      b.addEventListener('click',()=>_openEditSched(Number(b.dataset.sched)));
    });
    el.querySelectorAll('.btn-del-sched').forEach(b=>{
      b.addEventListener('click',()=>{
        if (!confirm('Excluir rotina?')) return;
        Data.deleteSchedule(Number(b.dataset.sched)); render();
      });
    });
    document.getElementById('btn-add-sched')?.addEventListener('click', _openAddSched);
  }

  function _targetLabel(s) {
    if (s.targetType==='room') return Data.rooms.find(r=>r.id===s.targetId)?.name||'Cômodo';
    if (s.targetType==='bulb') return Data.bulbs.find(b=>b.id===s.targetId)?.name||'Lâmpada';
    return 'Toda a casa';
  }

  function _formHtml(s={}) {
    return `
      <div class="input-wrap">
        <label>Nome da Rotina</label>
        <input class="input" id="m-s-name" value="${s.name||''}" placeholder="Ex: Acordar aos poucos" autofocus>
      </div>
      <div class="input-wrap">
        <label>Horário</label>
        <input class="input" type="time" id="m-s-time" value="${s.time||'07:00'}">
      </div>
      <div class="input-wrap">
        <label>Dias da semana</label>
        ${dayDotsHtml(s.days||[1,1,1,1,1,0,0], 'm-s-days')}
        <div style="font-size:10px;color:var(--text-lo);margin-top:4px">Clique para ativar/desativar cada dia</div>
      </div>
      <div class="input-wrap">
        <label>Cena a ativar</label>
        <select class="input" id="m-s-scene">
          <option value="">— Nenhuma (apenas liga as luzes) —</option>
          ${Data.scenes.map(sc=>`<option value="${sc.id}"${s.sceneId===sc.id?' selected':''}>${sc.name}</option>`).join('')}
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
          ${Data.rooms.map(r=>`<option value="${r.id}"${s.targetId===r.id?' selected':''}>${r.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-wrap" id="m-s-bulb-wrap" style="${s.targetType!=='bulb'?'display:none':''}">
        <label>Lâmpada</label>
        <select class="input" id="m-s-target-bulb">
          ${Data.bulbs.map(b=>`<option value="${b.id}"${s.targetId===b.id?' selected':''}>${b.name} (${Data.rooms.find(r=>r.id===b.roomId)?.name||'sem cômodo'})</option>`).join('')}
        </select>
      </div>`;
  }

  function _bindForm() {
    const tt=document.getElementById('m-s-target-type');
    const rw=document.getElementById('m-s-room-wrap');
    const bw=document.getElementById('m-s-bulb-wrap');
    tt?.addEventListener('change',()=>{
      rw.style.display=tt.value==='room'?'':'none';
      bw.style.display=tt.value==='bulb'?'':'none';
    });
    bindDayDots(document.getElementById('m-s-days')?.closest('.input-wrap')||document.body);
  }

  function _readForm() {
    const tt=document.getElementById('m-s-target-type')?.value||'all';
    // Lê os dias do dot-grid
    const dayDots=[...document.querySelectorAll('#m-s-days .day-dot')];
    const days=dayDots.length ? dayDots.map(d=>d.classList.contains('is-active')?1:0) : [1,1,1,1,1,0,0];
    return {
      name:       document.getElementById('m-s-name')?.value.trim(),
      time:       document.getElementById('m-s-time')?.value,
      days,
      sceneId:    document.getElementById('m-s-scene')?.value||null,
      targetType: tt,
      targetId:   tt==='room' ? document.getElementById('m-s-target-room')?.value :
                  tt==='bulb' ? document.getElementById('m-s-target-bulb')?.value : null,
    };
  }

  function _openAddSched() {
    Modal.open(`
      <div class="modal__title">Nova Rotina</div>
      ${_formHtml()}
      <div id="m-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-sched">Criar</button>
      </div>`, ()=>render());

    _bindForm();
    document.getElementById('m-save-sched').addEventListener('click',()=>{
      const errEl=document.getElementById('m-err');
      const data=_readForm();
      if (!data.name||!data.time){ errEl.textContent='Preencha nome e horário.'; errEl.style.display='block'; return; }
      Data.addSchedule(data);
      toast('Rotina criada! Será executada às '+data.time);
      Modal.close();
    });
  }

  function _openEditSched(schedId) {
    const s=Data.schedules.find(x=>x.id===schedId);
    Modal.open(`
      <div class="modal__title">Editar Rotina</div>
      ${_formHtml(s)}
      <div id="m-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-sched">Salvar</button>
      </div>`, ()=>render());

    _bindForm();
    document.getElementById('m-save-sched').addEventListener('click',()=>{
      const errEl=document.getElementById('m-err');
      const data=_readForm();
      if (!data.name||!data.time){ errEl.textContent='Preencha nome e horário.'; errEl.style.display='block'; return; }
      Data.editSchedule(schedId, data);
      toast('Rotina atualizada!');
      Modal.close();
    });
  }

  return { render };
})();
