/* ============================================================
   ILUMIX — Dispositivos page
   Cadastro, configuração e controle via /api/DevicesUsers
============================================================ */
const DevicesPage = (() => {

  let selId = null;

  const _sameId = (a, b) => String(a) === String(b);

  function _findDevice(id) {
    return Data.bulbs.find(b => _sameId(b.id, id));
  }

  function _autodimmerCmdName(b) {
    return Data.getDeviceCapabilities(b).autoDimmerCmdName
      || Object.keys(b._commandIds || {}).find(k => {
        const n = k.toLowerCase();
        return n.includes('autodimmer') || (n.includes('dimmer') && !n.includes('brightness'));
      });
  }

  function _renderNetworkSummary() {
    const el = document.getElementById('devices-network-info');
    if (!el) return;
    const online  = Data.bulbs.filter(b => b.status === 'online').length;
    const offline = Data.bulbs.length - online;
    el.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-3)">
        <div class="drow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="drow__key">Cadastrados</span>
          <span class="drow__val">${Data.bulbs.length}</span>
        </div>
        <div class="drow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="drow__key">Online</span>
          <span class="drow__val text-green">${online}</span>
        </div>
        <div class="drow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="drow__key">Offline</span>
          <span class="drow__val text-lo">${offline}</span>
        </div>
        <div class="drow" style="flex-direction:column;align-items:flex-start;gap:4px">
          <span class="drow__key">Acesos agora</span>
          <span class="drow__val text-amber">${Data.activeBulbs()}</span>
        </div>
      </div>`;
  }

  function render() {
    const el = document.getElementById('devices-page-content');
    if (!el) return;

    el.innerHTML = `
      <div class="card card--panel mb-4" id="devices-network-info"></div>
      <div style="display:grid;grid-template-columns:280px 1fr;gap:var(--sp-4);min-height:500px">
        <div><div id="device-list-wrap"></div></div>
        <div id="device-detail-wrap"
          style="background:var(--dark-2);border-radius:var(--r-lg);
                 border:1px solid var(--border);padding:var(--sp-5);min-height:400px">
        </div>
      </div>`;

    _renderNetworkSummary();
    _renderList();
    if (selId) _renderDetailWithRefresh(selId);
    else _renderDetail();
  }

  function _renderList() {
    const el = document.getElementById('device-list-wrap');
    if (!el) return;

    const bulbs = Data.bulbs;
    if (!selId && bulbs.length) selId = bulbs[0].id;

    if (!bulbs.length) {
      el.innerHTML = `
        <div style="color:var(--text-lo);font-size:12px;text-align:center;
                    padding:var(--sp-5);background:var(--dark-2);border-radius:var(--r-lg);
                    border:1px solid var(--border);margin-bottom:var(--sp-3)">
          Nenhum dispositivo cadastrado.
        </div>
        <button class="btn btn--primary btn--full" id="btn-new-device">
          ${icon('plus',13)} Novo dispositivo
        </button>`;
      document.getElementById('btn-new-device').addEventListener('click', _openRegister);
      return;
    }

    el.innerHTML = bulbs.map(b => {
      const room    = Data.rooms.find(r => r.id === b.roomId);
      const isSelec = _sameId(b.id, selId);
      const typeLbl = b.deviceTypeName || 'Dispositivo';
      const hasOn   = Data.getDeviceCapabilities(b).hasOn;
      return `
        <div class="room-card${b.on?' is-on':''}${isSelec?' is-selected-room':''}"
             data-device="${b.id}"
             style="margin-bottom:var(--sp-2);cursor:pointer;padding:var(--sp-3)">
          <div style="display:flex;align-items:center;gap:var(--sp-2)">
            <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;
                        background:${b.color};
                        box-shadow:${b.on?`0 0 10px ${b.color}66`:'none'};
                        opacity:${b.on?(0.4+b.brightness/100*.6):0.35};
                        transition:all .3s">
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;color:var(--text-hi);
                           overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${b.name}
              </div>
              <div style="font-size:10px;color:var(--text-lo);margin-top:2px">
                <span class="badge badge--amber" style="font-size:9px;padding:2px 6px">${typeLbl}</span>
              </div>
              <div style="font-size:10px;color:var(--text-lo);margin-top:1px">
                ${room ? `<span style="color:var(--amber)">${room.name}</span>` : 'Sem cômodo'}
                · ${b.on ? b.brightness+'%' : 'desligado'}
              </div>
            </div>
            ${hasOn ? `<div class="toggle ${b.on?'is-on':''} tog-device" data-device="${b.id}"
                 style="flex-shrink:0"></div>` : ''}
          </div>
        </div>`;
    }).join('') +
    `<button class="btn btn--ghost btn--full" id="btn-new-device" style="margin-top:var(--sp-2)">
       ${icon('plus',13)} Novo dispositivo
     </button>`;

    el.querySelectorAll('.room-card[data-device]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.tog-device')) return;
        selId = card.dataset.device;
        _renderList();
        _renderDetailWithRefresh(selId);
      });
    });
    el.querySelectorAll('.tog-device').forEach(t => {
      t.addEventListener('click', async e => {
        e.stopPropagation();
        await Data.toggleBulb(t.dataset.device);
        _renderNetworkSummary();
        _renderList();
        if (_sameId(selId, t.dataset.device)) _renderDetail();
      });
    });
    document.getElementById('btn-new-device').addEventListener('click', _openRegister);
  }

  async function _renderDetailWithRefresh(id) {
    const el = document.getElementById('device-detail-wrap');
    if (el) el.innerHTML = `<div style="color:var(--text-lo);font-size:12px;padding:var(--sp-5);text-align:center">Buscando status...</div>`;
    await Data.refreshBulb(id);
    _renderNetworkSummary();
    _renderList();
    _renderDetail();
  }

  function _renderDetail() {
    const el = document.getElementById('device-detail-wrap');
    if (!el) return;

    const b = _findDevice(selId);
    if (!b) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:13px;text-align:center;padding:var(--sp-6)">
        Selecione um dispositivo para ver os controles.
      </div>`;
      return;
    }

    const cmds = b._cmds || [];
    const { hasOn, hasBri, hasColor, hasColorTemp, hasTargetTemp, hasAutoDimmer: hasAD } = Data.getDeviceCapabilities(b);
    const attrs    = b._attrs || [];
    const getAttr  = (...names) => {
      for (const n of names) {
        const a = attrs.find(a => (a.name || a.Name || '').toLowerCase() === n.toLowerCase());
        if (a !== undefined) return (a.value ?? a.Value ?? '').toString();
      }
      return '';
    };
    const room     = Data.rooms.find(r => r.id === b.roomId);
    const typeLbl  = b.deviceTypeName || 'Dispositivo';
    const fiware   = b.fiwareId || '—';

    el.innerHTML = `
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--sp-4)">
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--text-hi)">${b.name}</div>
          <div style="font-size:11px;color:var(--text-lo);margin-top:4px">
            <span class="badge badge--amber">${typeLbl}</span>
          </div>
          <div style="margin-top:4px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            ${room
              ? `<span class="badge badge--amber">${room.name}</span>`
              : `<span class="badge badge--off">Sem cômodo</span>`}
            <span class="badge ${b.on?'badge--on':'badge--off'}">${b.on?'Ligado':'Desligado'}</span>
          </div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn--ghost btn--sm" id="btn-device-refresh" title="Atualizar status">
            ${icon('refresh',12)}
          </button>
          <button class="btn btn--ghost btn--sm" id="btn-device-edit">
            ${icon('edit',12)} Editar
          </button>
          <button class="btn btn--ghost btn--sm" id="btn-device-delete" style="color:#ff6b6b">
            ${icon('trash',12)}
          </button>
        </div>
      </div>

      <div style="padding:10px;background:var(--dark-3);border-radius:8px;margin-bottom:var(--sp-4);font-size:11px">
        <div style="color:var(--text-lo);margin-bottom:4px">ID Fiware (configure no ESP32)</div>
        <div style="font-family:monospace;color:var(--amber);word-break:break-all;user-select:all">${fiware}</div>
      </div>

      <div style="display:flex;justify-content:center;padding:var(--sp-4) 0">
        <div class="orb${!b.on?' is-off':b.brightness<35?' is-dim':''}" id="device-orb">
          <div class="orb__ring"></div>
          <div class="orb__ring2"></div>
        </div>
      </div>

      ${hasOn ? `
      <div class="drow" style="margin-bottom:var(--sp-4);padding-bottom:var(--sp-3);border-bottom:1px solid var(--border)">
        <span style="font-size:14px;font-weight:500;color:var(--text-hi)">Liga / Desliga</span>
        <div class="toggle ${b.on?'is-on':''}" id="tog-onoff"></div>
      </div>` : ''}

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

      ${hasColorTemp ? `
      <div style="margin-bottom:var(--sp-4)">
        <div style="font-size:12px;color:var(--text-mid);margin-bottom:var(--sp-2)">Temperatura de Cor</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${[['2200K','🕯️ Vela'],['2700K','🌅 Quente'],['4000K','⚪ Neutro'],['5000K','☀️ Dia'],['6500K','❄️ Frio']].map(([t,l])=>`
            <button class="temp-btn${b.temp===t?' is-active':''}" data-temp="${t}"
              style="flex:1;min-width:60px;font-size:11px">${l}</button>`).join('')}
        </div>
      </div>` : ''}

      ${hasTargetTemp ? `
      <div style="margin-bottom:var(--sp-4)">
        <div style="display:flex;justify-content:space-between;margin-bottom:var(--sp-2)">
          <span style="font-size:12px;color:var(--text-mid)">Temperatura (°C)</span>
          <span class="badge badge--amber" id="tgt-label">${getAttr('targettemperature','targetTemp')||'24'}°C</span>
        </div>
        <input type="number" class="input" id="tgt-temp" min="16" max="30" step="1"
          value="${getAttr('targettemperature','targetTemp')||'24'}" style="height:36px;padding:0 10px;font-size:12px">
      </div>` : ''}

      ${hasColor ? `
      <div style="margin-bottom:var(--sp-4)">
        <div style="font-size:12px;color:var(--text-mid);margin-bottom:var(--sp-2)">Cor da Luz</div>
        ${colorPickerHtml(b.color)}
      </div>` : ''}

      ${hasAD ? `
      <div style="margin-bottom:var(--sp-4);padding:var(--sp-3);background:var(--dark-3);border-radius:var(--r-md)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-3)">
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--text-hi)">AutoDimmer</div>
            <div style="font-size:10px;color:var(--text-lo)">Ajusta brilho pelo sensor do ESP32</div>
          </div>
          <div class="toggle ${getAttr('autodimmer','ad')==='on'?'is-on':''}" id="tog-ad"></div>
        </div>
        <div style="display:flex;gap:var(--sp-2);align-items:flex-end">
          <div style="flex:1">
            <div style="font-size:10px;color:var(--text-lo);margin-bottom:4px">Mínimo %</div>
            <input type="number" class="input" id="inp-mindim" min="0" max="100"
              value="${getAttr('mindim','mind')||'0'}" style="height:34px;padding:0 8px;font-size:12px">
          </div>
          <div style="flex:1">
            <div style="font-size:10px;color:var(--text-lo);margin-bottom:4px">Máximo %</div>
            <input type="number" class="input" id="inp-maxdim" min="0" max="100"
              value="${getAttr('maxdim','maxd')||'100'}" style="height:34px;padding:0 8px;font-size:12px">
          </div>
          <button class="btn btn--primary btn--sm" id="btn-ad-bounds" style="height:34px">Aplicar</button>
        </div>
      </div>` : ''}

      <div style="padding-top:var(--sp-3);border-top:1px solid var(--border);margin-bottom:var(--sp-3)">
        <div style="font-size:10px;color:var(--text-lo);text-transform:uppercase;letter-spacing:1px;margin-bottom:var(--sp-2)">
          Comandos disponíveis
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">
          ${cmds.map(c=>`
            <span class="badge badge--amber" style="font-family:monospace;font-size:10px">
              ${c.name||c.Name}
            </span>`).join('') || '<span style="font-size:11px;color:var(--text-lo)">Nenhum</span>'}
        </div>
      </div>`;

    el.querySelector('#tog-onoff')?.addEventListener('click', async () => {
      await Data.toggleBulb(b.id);
      _renderNetworkSummary();
      _renderList();
      _renderDetail();
    });

    if (hasBri) {
      bindSlider(el.querySelector('#bri-track'), el.querySelector('#bri-fill'),
        el.querySelector('#bri-thumb'), el.querySelector('#bri-label'), b.brightness,
        v => { Data.setBrightness(b.id, v); _renderNetworkSummary(); _renderList(); _renderDetail(); });
    }

    if (hasColorTemp) {
      el.querySelectorAll('.temp-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          el.querySelectorAll('.temp-btn').forEach(x => x.classList.remove('is-active'));
          btn.classList.add('is-active');
          Data.setTemp(b.id, btn.dataset.temp);
          toast('Temperatura: ' + btn.dataset.temp);
        });
      });
    }

    if (hasTargetTemp) {
      const inp = el.querySelector('#tgt-temp');
      const lbl = el.querySelector('#tgt-label');
      inp?.addEventListener('input', async () => {
        const v = parseInt(inp.value, 10);
        if (isNaN(v)) return;
        lbl.textContent = `${v}°C`;
        // tenta enviar comando setTargetTemperature se existir
        const cmdId = Data.findCommandId(b, n => n === 'settargettemperature' || n.includes('targettemperature'));
        if (cmdId != null) {
          const name = Data._commandNameById ? Data._commandNameById(cmdId) : 'setTargetTemperature';
          await Data._sendCmd(b, name, v);
        }
      });
    }

    if (hasColor) {
      bindColorPicker(el, c => {
        Data.setColor(b.id, c);
        _renderNetworkSummary();
        _renderList();
        _renderDetail();
      });
    }

    if (hasAD) {
      const adCmd = _autodimmerCmdName(b);
      el.querySelector('#tog-ad')?.addEventListener('click', async () => {
        const adAttr = attrs.find(a => {
          const n = (a.name || a.Name || '').toLowerCase();
          return n === 'autodimmer' || n === 'ad';
        });
        const isOn   = (adAttr?.value ?? adAttr?.Value ?? '') === 'on';
        const newVal = isOn ? 'off' : 'on';
        if (adAttr) { adAttr.value = newVal; if (adAttr.Value !== undefined) adAttr.Value = newVal; }
        if (adCmd) await Data._sendCmd(b, adCmd, newVal);
        toast('AutoDimmer ' + newVal);
        _renderDetail();
      });
      el.querySelector('#btn-ad-bounds')?.addEventListener('click', async () => {
        const minV = document.getElementById('inp-mindim').value || '0';
        const maxV = document.getElementById('inp-maxdim').value || '100';
        if (adCmd) await Data._sendCmd(b, adCmd, `${minV},${maxV}`);
        toast(`AutoDimmer: ${minV}%–${maxV}%`);
      });
    }

    el.querySelector('#btn-device-refresh').addEventListener('click', async () => {
      await _renderDetailWithRefresh(b.id);
      toast('Status atualizado');
    });

    el.querySelector('#btn-device-edit').addEventListener('click', () => _openEdit(b.id));

    el.querySelector('#btn-device-delete').addEventListener('click', async () => {
      if (!confirm(`Excluir "${b.name}"? Esta ação remove o dispositivo do sistema.`)) return;
      try {
        await Data.deleteBulb(b.id);
        if (_sameId(selId, b.id)) selId = null;
        toast('Dispositivo excluído');
        render();
      } catch (e) { toast('❌ ' + e.message); }
    });

    updateOrb(el.querySelector('#device-orb'), b);
  }

  function _deviceTypeOptions() {
    const types = Data.deviceTypes?.length ? Data.deviceTypes : [{ id: 1, name: 'ESP32 Ilumix' }];
    return types.map(t =>
      `<option value="${t.id}">${t.name}</option>`
    ).join('');
  }

  function _openRegister() {
    Modal.open(`
      <div class="modal__title">Novo dispositivo</div>

      <div class="input-wrap">
        <label>Nome <span style="color:#ff6b6b">*</span></label>
        <input class="input" id="m-dev-name"
          placeholder="Ex: Spot Sala, Sensor Corredor..." autofocus>
      </div>

      <div class="input-wrap">
        <label>Tipo de dispositivo</label>
        <select class="input" id="m-dev-type">${_deviceTypeOptions()}</select>
      </div>

      <div class="input-wrap">
        <label>Cômodo (opcional)</label>
        <select class="input" id="m-dev-room">
          <option value="">— Sem cômodo —</option>
          ${Data.rooms.map(r => `<option value="${r.id}">${r.name}</option>`).join('')}
        </select>
      </div>

      <div id="m-dev-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-dev-save">Registrar</button>
      </div>`, () => render());

    document.getElementById('m-dev-save').addEventListener('click', async () => {
      const btn       = document.getElementById('m-dev-save');
      const errEl     = document.getElementById('m-dev-err');
      const name      = document.getElementById('m-dev-name').value.trim();
      const deviceTypeId = document.getElementById('m-dev-type').value;
      const roomId    = document.getElementById('m-dev-room').value || null;
      errEl.style.display = 'none';

      if (!name) { errEl.textContent = 'Informe o nome.'; errEl.style.display = 'block'; return; }
      btn.disabled = true;
      btn.textContent = 'Registrando...';

      try {
        const { device, fiwareId } = await Data.addDevice(name, roomId, deviceTypeId);
        selId = device.id;
        Modal.close();
        render();
        _showFiwareSuccess(name, fiwareId || device.fiwareId);
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Registrar';
      }
    });
  }

  function _showFiwareSuccess(name, fiwareId) {
    Modal.open(`
      <div class="modal__title">Dispositivo registrado</div>
      <p style="font-size:13px;color:var(--text-mid);margin-bottom:var(--sp-3)">
        <strong>${name}</strong> foi cadastrado. Use o ID Fiware abaixo no firmware do ESP32:
      </p>
      <div style="padding:12px;background:var(--dark-3);border-radius:8px;margin-bottom:var(--sp-3)">
        <div style="font-size:10px;color:var(--text-lo);margin-bottom:6px">ID Fiware</div>
        <div id="fiware-copy-text" style="font-family:monospace;font-size:12px;color:var(--amber);
             word-break:break-all;user-select:all">${fiwareId || '—'}</div>
      </div>
      <button class="btn btn--ghost btn--full" id="btn-copy-fiware" style="margin-bottom:8px">Copiar ID</button>
      <button class="btn btn--primary btn--full" data-modal-close>Entendi</button>
    `);

    document.getElementById('btn-copy-fiware')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(fiwareId || '').then(() => toast('ID copiado!'));
    });
  }

  function _openEdit(deviceId) {
    const b = _findDevice(deviceId);
    Modal.open(`
      <div class="modal__title">Editar dispositivo</div>

      <div style="padding:10px;background:var(--dark-3);border-radius:8px;margin-bottom:14px">
        <div style="font-size:10px;color:var(--text-lo);margin-bottom:4px">Tipo</div>
        <div style="font-size:12px;color:var(--text-hi)">${b.deviceTypeName || '—'}</div>
        <div style="font-size:10px;color:var(--text-lo);margin:10px 0 4px">ID Fiware</div>
        <div style="font-family:monospace;font-size:11px;color:var(--amber);word-break:break-all">${b.fiwareId || '—'}</div>
      </div>

      <div class="input-wrap">
        <label>Nome</label>
        <input class="input" id="m-dev-name" value="${b.name}" autofocus>
      </div>

      <div class="input-wrap">
        <label>Cômodo</label>
        <select class="input" id="m-dev-room">
          <option value="">— Sem cômodo —</option>
          ${Data.rooms.map(r => `<option value="${r.id}"${b.roomId===r.id?' selected':''}>${r.name}</option>`).join('')}
        </select>
      </div>

      <div id="m-dev-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-dev-save">Salvar</button>
      </div>`, () => render());

    document.getElementById('m-dev-save').addEventListener('click', async () => {
      const btn    = document.getElementById('m-dev-save');
      const errEl  = document.getElementById('m-dev-err');
      const name   = document.getElementById('m-dev-name').value.trim();
      const roomId = document.getElementById('m-dev-room').value || null;
      if (!name) { errEl.textContent = 'Informe o nome.'; errEl.style.display = 'block'; return; }
      btn.disabled = true;
      btn.textContent = 'Salvando...';
      try {
        await Data.renameDevice(deviceId, name, roomId);
        toast('Dispositivo atualizado!');
        Modal.close();
        render();
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Salvar';
      }
    });
  }

  function _selectDevice(id) {
    selId = id;
    _renderList();
    _renderDetailWithRefresh(id);
  }

  const _selectLamp = _selectDevice;

  document.addEventListener('deviceStateChanged', () => {
    if (!document.getElementById('devices-page-content')) return;
    _renderNetworkSummary();
    _renderList();
    if (selId) _renderDetail();
  });

  return { render, _selectDevice, _selectLamp };
})();

const LampsPage = DevicesPage;
