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

    el.querySelectorAll('.tog-sched').forEach(t => {
      t.addEventListener('click', async () => {
        const id = Number(t.dataset.sched);
        t.classList.toggle('is-on');
        try {
          await Data.toggleSchedule(id);
        } catch (e) {
          t.classList.toggle('is-on');
          toast('❌ ' + e.message);
        }
      });
    });
    el.querySelectorAll('.btn-edit-sched').forEach(b => {
      b.addEventListener('click', () => _openEditSched(Number(b.dataset.sched)));
    });
    el.querySelectorAll('.btn-del-sched').forEach(b => {
      b.addEventListener('click', async () => {
        if (!confirm('Excluir rotina?')) return;
        b.disabled = true;
        try {
          await Data.deleteSchedule(Number(b.dataset.sched));
          render();
        } catch (e) {
          toast('❌ ' + e.message);
          b.disabled = false;
        }
      });
    });
    document.getElementById('btn-add-sched')?.addEventListener('click', _openAddSched);
  }

  function _targetLabel(s) {
    if (s.targetType==='room') return Data.rooms.find(r=>r.id===s.targetId)?.name||'Cômodo';
    if (s.targetType==='bulb') return Data.bulbs.find(b=>b.id===s.targetId)?.name||'Dispositivo';
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
        <label>Cena a ativar <span style="color:#ff6b6b">*</span></label>
        ${Data.scenes.length
          ? `<select class="input" id="m-s-scene">
              <option value="">— Selecione uma cena —</option>
              ${Data.scenes.map(sc=>`<option value="${sc.id}"${s.sceneId===sc.id?' selected':''}>${sc.name}</option>`).join('')}
            </select>`
          : `<div style="font-size:12px;color:var(--text-lo);padding:8px;background:var(--dark-3);border-radius:8px">
              Nenhuma cena cadastrada.
              <span style="color:var(--amber);cursor:pointer" id="m-go-scenes">Criar cena →</span>
            </div>`
        }
      </div>`;
  }

  function _bindForm() {
    bindDayDots(document.getElementById('m-s-days')?.closest('.input-wrap') || document.body);
    document.getElementById('m-go-scenes')?.addEventListener('click', () => {
      Modal.close();
      Router.navigate('scenes');
    });
  }

  function _readForm() {
    const dayDots = [...document.querySelectorAll('#m-s-days .day-dot')];
    const days    = dayDots.length ? dayDots.map(d => d.classList.contains('is-active') ? 1 : 0) : [1,1,1,1,1,0,0];
    return {
      name:    document.getElementById('m-s-name')?.value.trim(),
      time:    document.getElementById('m-s-time')?.value,
      days,
      sceneId: document.getElementById('m-s-scene')?.value || null,
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
    document.getElementById('m-save-sched').addEventListener('click', async () => {
      const errEl = document.getElementById('m-err');
      const btn   = document.getElementById('m-save-sched');
      const data  = _readForm();
      errEl.style.display = 'none';
      if (!data.name || !data.time) {
        errEl.textContent = 'Preencha nome e horário.';
        errEl.style.display = 'block';
        return;
      }
      if (!data.sceneId) {
        errEl.textContent = 'Selecione uma cena para a rotina.';
        errEl.style.display = 'block';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Criando...';
      try {
        await Data.addSchedule(data);
        toast('Rotina criada! Será executada às ' + data.time);
        Modal.close();
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Criar';
      }
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
    document.getElementById('m-save-sched').addEventListener('click', async () => {
      const errEl = document.getElementById('m-err');
      const btn   = document.getElementById('m-save-sched');
      const data  = _readForm();
      errEl.style.display = 'none';
      if (!data.name || !data.time) {
        errEl.textContent = 'Preencha nome e horário.';
        errEl.style.display = 'block';
        return;
      }
      if (!data.sceneId) {
        errEl.textContent = 'Selecione uma cena para a rotina.';
        errEl.style.display = 'block';
        return;
      }
      btn.disabled = true;
      btn.textContent = 'Salvando...';
      try {
        await Data.editSchedule(schedId, data);
        toast('Rotina atualizada!');
        Modal.close();
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Salvar';
      }
    });
  }

  return { render };
})();
