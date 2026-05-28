/* ============================================================
   ILUMIX — Cenas
   Configuração por dispositivo conforme comandos (_cmds) de cada um.
============================================================ */
const ScenesPage = (() => {

  const _sameId = (a, b) => String(a) === String(b);

  const _panelState = {};

  function _capLabels(b) {
    const c = Data.getDeviceCapabilities(b);
    const caps = [];
    if (c.hasOn) caps.push('Liga');
    if (c.hasBri) caps.push('Brilho');
    if (c.hasColor) caps.push('Cor');
    if (c.hasColorTemp) caps.push('TempCor');
    if (c.hasTargetTemp) caps.push('°C');
    if (c.hasAutoDimmer) caps.push('AutoDim');
    return caps.join(' · ');
  }

  function _defaultSettings(b) {
    return {
      powerOn:      true,
      brightness:   b.brightness ?? 80,
      temp:         b.temp || '2700K',
      targetTemp:   24,
      color:        b.color || '#E2B84A',
      autoDimmerOn: false,
      minDim:       0,
      maxDim:       100,
    };
  }

  function _settingsForDevice(key, sceneDeviceSettings) {
    if (_panelState[key]) return _panelState[key];
    const saved = sceneDeviceSettings?.find(ds => _sameId(ds.deviceUserId, key));
    if (saved?.settings) {
      _panelState[key] = { ...saved.settings };
      return _panelState[key];
    }
    const b = Data._resolveBulbByKey(key);
    if (b) {
      _panelState[key] = _defaultSettings(b);
      return _panelState[key];
    }
    return _defaultSettings({ brightness: 80, temp: '2700K', color: '#E2B84A' });
  }

  function _devicePickerHtml(selectedKeys = [], sceneDeviceSettings = []) {
    const sel = new Set(selectedKeys.map(String));

    if (!Data.bulbs.length) {
      return `<div style="color:var(--text-lo);font-size:11px;padding:10px;background:var(--dark-3);border-radius:8px;text-align:center">
        Nenhum dispositivo cadastrado.<br>
        <span style="color:var(--amber);cursor:pointer" id="m-go-devices">Cadastrar em Dispositivos →</span>
      </div>`;
    }

    const groups = { _none: { name: 'Sem cômodo', bulbs: [] } };
    Data.rooms.forEach(r => { groups[r.id] = { name: r.name, bulbs: [] }; });
    Data.bulbs.forEach(b => {
      const rid = b.roomId && groups[b.roomId] ? b.roomId : '_none';
      groups[rid].bulbs.push(b);
    });

    let html = `<p style="font-size:10px;color:var(--text-lo);margin:0 0 8px;line-height:1.45">
      Selecione os dispositivos e configure cada um abaixo conforme os comandos disponíveis.
    </p>`;

    html += `<div class="device-picker-list" id="scene-device-checks">`;

    for (const [, g] of Object.entries(groups)) {
      if (!g.bulbs.length) continue;
      html += `<div style="font-size:10px;color:var(--text-mid);padding:6px 8px 4px;text-transform:uppercase;letter-spacing:.5px">${g.name}</div>`;
      g.bulbs.forEach(b => {
        const key = String(b._apiId);
        const checked = sel.has(key);
        html += `
          <label class="device-picker-row${checked ? ' is-selected' : ''}">
            <input type="checkbox" data-device-key="${key}" ${checked ? 'checked' : ''}>
            <span class="device-picker-dot" style="background:${b.on ? b.color : '#444'}"></span>
            <span class="device-picker-name">${b.name}</span>
            <span class="device-picker-tag" title="Comandos">${_capLabels(b)}</span>
          </label>`;
      });
    }

    html += `</div>
      <div style="display:flex;gap:8px;margin-top:6px;flex-wrap:wrap">
        <button type="button" class="btn btn--ghost btn--sm" id="m-sel-all">Marcar todos</button>
        <button type="button" class="btn btn--ghost btn--sm" id="m-sel-none">Limpar</button>
      </div>`;

    return html;
  }

  function _deviceConfigPanelHtml(b, settings) {
    const key  = String(b._apiId);
    const caps = Data.getDeviceCapabilities(b);
    const pfx  = `sc-dev-${key}`;
    const typeLbl = b.deviceTypeName || 'Dispositivo';
    const bri    = settings.brightness ?? 80;
    const tmp    = settings.temp || '2700K';
    const tgt    = settings.targetTemp ?? 24;
    const clr    = settings.color || '#E2B84A';
    const adOn   = !!settings.autoDimmerOn;
    const minD   = settings.minDim ?? 0;
    const maxD   = settings.maxDim ?? 100;

    let controls = '';

    if (caps.hasOn) {
      controls += `
        <div class="drow" style="margin-bottom:10px">
          <span style="font-size:12px;color:var(--text-mid)">Estado</span>
          <div class="toggle ${settings.powerOn !== false ? 'is-on' : ''}" id="${pfx}-power"></div>
        </div>`;
    }

    if (caps.hasBri) {
      controls += `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px">
            <span style="font-size:11px;color:var(--text-mid)">Luminosidade</span>
            <span style="font-size:12px;font-weight:600;color:var(--amber)" id="${pfx}-bri-lbl">${bri}%</span>
          </div>
          <div class="slider-track" id="${pfx}-bri-track">
            <div class="slider-fill" id="${pfx}-bri-fill" style="width:${bri}%"></div>
            <div class="slider-thumb" id="${pfx}-bri-thumb" style="left:${bri}%"></div>
          </div>
        </div>`;
    }

    if (caps.hasColorTemp) {
      controls += `
        <div style="margin-bottom:10px">
          <div style="font-size:11px;color:var(--text-mid);margin-bottom:6px">Temperatura de cor</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap" id="${pfx}-temps">
            ${[['2200K', 'Vela'], ['2700K', 'Quente'], ['4000K', 'Neutro'], ['5000K', 'Dia'], ['6500K', 'Frio']].map(([t, l]) => `
              <button type="button" class="temp-btn${tmp === t ? ' is-active' : ''}" data-temp="${t}"
                style="flex:1;min-width:48px;font-size:10px">${l}</button>`).join('')}
          </div>
        </div>`;
    }

    if (caps.hasTargetTemp) {
      controls += `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px">
            <span style="font-size:11px;color:var(--text-mid)">Temperatura (°C)</span>
            <span class="badge badge--amber" style="font-size:10px">${tgt}°C</span>
          </div>
          <input type="number" class="input" id="${pfx}-targettemp"
            min="16" max="30" step="1" value="${tgt}"
            style="height:34px;padding:0 10px;font-size:12px">
        </div>`;
    }

    if (caps.hasColor) {
      controls += `
        <div style="margin-bottom:10px">
          <div style="font-size:11px;color:var(--text-mid);margin-bottom:6px">Cor</div>
          <div id="${pfx}-color-wrap">${colorPickerHtml(clr)}</div>
        </div>`;
    }

    if (caps.hasAutoDimmer) {
      controls += `
        <div style="padding:8px;background:var(--dark-4);border-radius:8px;margin-bottom:4px">
          <div class="drow" style="margin-bottom:8px">
            <span style="font-size:11px;color:var(--text-mid)">AutoDimmer</span>
            <div class="toggle ${adOn ? 'is-on' : ''}" id="${pfx}-ad"></div>
          </div>
          <div style="display:flex;gap:8px">
            <div style="flex:1">
              <div style="font-size:10px;color:var(--text-lo);margin-bottom:2px">Mín %</div>
              <input type="number" class="input" id="${pfx}-mindim" min="0" max="100" value="${minD}"
                style="height:32px;padding:0 8px;font-size:11px">
            </div>
            <div style="flex:1">
              <div style="font-size:10px;color:var(--text-lo);margin-bottom:2px">Máx %</div>
              <input type="number" class="input" id="${pfx}-maxdim" min="0" max="100" value="${maxD}"
                style="height:32px;padding:0 8px;font-size:11px">
            </div>
          </div>
        </div>`;
    }

    if (!controls) {
      controls = `<p style="font-size:11px;color:var(--text-lo);margin:0">Sem comandos configuráveis.</p>`;
    }

    return `
      <div class="scene-device-config" data-device-key="${key}">
        <div class="scene-device-config__title">
          <span>${b.name}</span>
          <span class="badge badge--amber" style="font-size:9px">${typeLbl}</span>
        </div>
        ${controls}
      </div>`;
  }

  function _bindDeviceConfigPanel(b, settings) {
    const key = String(b._apiId);
    const pfx = `sc-dev-${key}`;
    const caps = Data.getDeviceCapabilities(b);

    if (caps.hasOn) {
      document.getElementById(`${pfx}-power`)?.addEventListener('click', el => {
        settings.powerOn = !el.classList.contains('is-on');
        el.classList.toggle('is-on', settings.powerOn);
      });
    }

    if (caps.hasBri) {
      const track = document.getElementById(`${pfx}-bri-track`);
      if (track) {
        bindSlider(
          track,
          document.getElementById(`${pfx}-bri-fill`),
          document.getElementById(`${pfx}-bri-thumb`),
          document.getElementById(`${pfx}-bri-lbl`),
          settings.brightness ?? 80,
          v => { settings.brightness = v; }
        );
      }
    }

    if (caps.hasColorTemp) {
      document.querySelectorAll(`#${pfx}-temps .temp-btn`).forEach(btn => {
        btn.addEventListener('click', () => {
          document.querySelectorAll(`#${pfx}-temps .temp-btn`).forEach(x => x.classList.remove('is-active'));
          btn.classList.add('is-active');
          settings.temp = btn.dataset.temp;
        });
      });
    }

    if (caps.hasTargetTemp) {
      const inp = document.getElementById(`${pfx}-targettemp`);
      if (inp) {
        inp.addEventListener('input', () => {
          const n = parseInt(inp.value, 10);
          settings.targetTemp = isNaN(n) ? settings.targetTemp : n;
        });
      }
    }

    if (caps.hasColor) {
      const wrap = document.getElementById(`${pfx}-color-wrap`);
      if (wrap) bindColorPicker(wrap, c => { settings.color = c; });
    }
  }

  function _renderDeviceConfigPanels(selectedKeys, sceneDeviceSettings = []) {
    const el = document.getElementById('scene-device-configs');
    if (!el) return;

    const keys = selectedKeys.map(String);
    Object.keys(_panelState).forEach(k => {
      if (!keys.includes(k)) delete _panelState[k];
    });

    if (!keys.length) {
      el.innerHTML = `<p style="font-size:11px;color:var(--text-lo);text-align:center;padding:12px 0;margin:0">
        Marque dispositivos acima para configurar cada um.
      </p>`;
      return;
    }

    const panels = [];
    for (const key of keys) {
      const b = Data._resolveBulbByKey(key);
      if (!b) continue;
      const settings = _settingsForDevice(key, sceneDeviceSettings);
      panels.push(_deviceConfigPanelHtml(b, settings));
    }

    el.innerHTML = panels.join('');

    for (const key of keys) {
      const b = Data._resolveBulbByKey(key);
      if (!b) continue;
      _bindDeviceConfigPanel(b, _settingsForDevice(key, sceneDeviceSettings));
    }
  }

  function _readDeviceKeys() {
    return [...document.querySelectorAll('#scene-device-checks input[type=checkbox]:checked')]
      .map(cb => cb.dataset.deviceKey);
  }

  function _readDeviceConfigs() {
    const configs = [];
    for (const key of _readDeviceKeys()) {
      const b = Data._resolveBulbByKey(key);
      if (!b) continue;
      const settings = _settingsForDevice(key);
      const caps = Data.getDeviceCapabilities(b);
      const out = { powerOn: settings.powerOn !== false };

      if (caps.hasBri && settings.brightness != null) out.brightness = settings.brightness;
      if (caps.hasColor && settings.color) out.color = settings.color;
      if (caps.hasColorTemp && settings.temp) out.temp = settings.temp;
      if (caps.hasTargetTemp && settings.targetTemp != null) out.targetTemp = settings.targetTemp;

      if (caps.hasAutoDimmer) {
        const minV = document.getElementById(`sc-dev-${key}-mindim`)?.value ?? settings.minDim ?? 0;
        const maxV = document.getElementById(`sc-dev-${key}-maxdim`)?.value ?? settings.maxDim ?? 100;
        const adEl = document.getElementById(`sc-dev-${key}-ad`);
        const adOn = adEl ? adEl.classList.contains('is-on') : settings.autoDimmerOn;
        out.autoDimmer = adOn ? 'on' : `${minV},${maxV}`;
      }

      configs.push({ deviceKey: key, settings: out });
    }
    return configs;
  }

  function _bindDevicePicker(sceneDeviceSettings = []) {
    const refreshPanels = () => {
      _renderDeviceConfigPanels(_readDeviceKeys(), sceneDeviceSettings);
    };

    document.getElementById('m-go-devices')?.addEventListener('click', () => {
      Modal.close();
      Router.navigate('devices');
    });
    document.getElementById('m-sel-all')?.addEventListener('click', () => {
      document.querySelectorAll('#scene-device-checks input[type=checkbox]').forEach(cb => {
        cb.checked = true;
        cb.closest('label')?.classList.add('is-selected');
      });
      refreshPanels();
    });
    document.getElementById('m-sel-none')?.addEventListener('click', () => {
      document.querySelectorAll('#scene-device-checks input[type=checkbox]').forEach(cb => {
        cb.checked = false;
        cb.closest('label')?.classList.remove('is-selected');
      });
      refreshPanels();
    });
    document.querySelectorAll('#scene-device-checks input[type=checkbox]').forEach(cb => {
      cb.addEventListener('change', () => {
        cb.closest('label')?.classList.toggle('is-selected', cb.checked);
        refreshPanels();
      });
    });
  }

  function _formHtml(s = {}) {
    const selKeys = s.deviceUserIds || [];
    const sceneDeviceSettings = s.deviceSettings || [];

    return `
      <div class="input-wrap">
        <label>Nome <span style="color:#ff6b6b">*</span></label>
        <input class="input" id="m-sc-name" value="${s.name || ''}" placeholder="Ex: Modo Cinema" maxlength="60" autofocus>
      </div>
      <div class="input-wrap">
        <label>Descrição</label>
        <input class="input" id="m-sc-desc" value="${s.desc || ''}" placeholder="Ex: Luz suave para relaxar">
      </div>
      <div class="input-wrap">
        <label>Dispositivos da cena</label>
        ${_devicePickerHtml(selKeys, sceneDeviceSettings)}
      </div>
      <div class="input-wrap" style="margin-bottom:0">
        <label>Configuração por dispositivo</label>
        <div id="scene-device-configs"></div>
      </div>`;
  }

  function _sceneSummaryBadges(s) {
    const items = s.deviceSettings || [];
    if (!items.length) {
      return `<span class="badge badge--off">${s.deviceCount || 0} disp.</span>`;
    }

    const chips = items.slice(0, 3).map(ds => {
      const st = ds.settings || {};
      const caps = Data._resolveBulbByKey(ds.deviceUserId);
      const c = caps ? Data.getDeviceCapabilities(caps) : {};
      const name = (ds.deviceName || '').split(' ')[0] || 'Disp.';
      let detail = st.powerOn === false ? 'Off' : 'On';
      if (c.hasBri && st.brightness != null) detail = `${st.brightness}%`;
      else if (c.hasColor && st.color) detail = 'Cor';
      return `<span class="badge badge--amber" title="${ds.deviceName}">${name}: ${detail}</span>`;
    });

    const more = items.length > 3
      ? `<span class="badge badge--off">+${items.length - 3}</span>` : '';

    return chips.join('') + more;
  }

  function _sceneCardHtml(s) {
    const devLabel = s.deviceCount
      ? `${s.deviceCount} dispositivo${s.deviceCount !== 1 ? 's' : ''}`
      : 'Sem dispositivos';
    const namesPreview = (s.deviceNames || []).slice(0, 3).join(', ')
      + ((s.deviceNames?.length || 0) > 3 ? '…' : '');

    return `
      <div class="room-card scene-card-full${s.active ? ' is-on' : ''}" style="padding:16px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
          <div style="width:44px;height:44px;border-radius:10px;background:${s.color}22;display:flex;align-items:center;justify-content:center">
            <div style="color:${s.color}">${sceneIcon(s.icon, 22)}</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn--icon btn--sm btn-edit-scene" data-scene="${s.id}">${icon('edit', 12)}</button>
            <button class="btn btn--icon btn--sm btn-del-scene" data-scene="${s.id}" style="color:#ff6b6b">${icon('trash', 12)}</button>
          </div>
        </div>
        <div style="font-size:13px;font-weight:600;color:var(--text-hi);margin-bottom:2px">${s.name}</div>
        <div style="font-size:11px;color:var(--text-lo);margin-bottom:10px;min-height:14px">${s.desc || '—'}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">
          ${_sceneSummaryBadges(s)}
        </div>
        <div style="font-size:10px;color:var(--text-lo);margin-bottom:4px">${devLabel}</div>
        ${namesPreview ? `<div style="font-size:10px;color:var(--text-mid);margin-bottom:10px;line-height:1.4">${namesPreview}</div>` : '<div style="margin-bottom:10px"></div>'}
        ${s.active
          ? `<button class="btn btn--ghost btn--full" style="font-size:11px;border-color:var(--amber);color:var(--amber)" disabled>${icon('check', 12)} Ativa agora</button>`
          : `<button class="btn btn--primary btn--full btn-activate" data-scene="${s.id}" style="font-size:11px">Ativar cena</button>`}
      </div>`;
  }

  function render() {
    const el = document.getElementById('scenes-grid');
    if (!el) return;

    if (!Data.scenes.length) {
      el.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:32px">
          <div style="color:var(--text-lo);font-size:14px;margin-bottom:8px">Nenhuma cena criada.</div>
          <p style="color:var(--text-lo);font-size:12px;max-width:320px;margin:0 auto 16px;line-height:1.5">
            Selecione dispositivos e configure cada um com os comandos que o hardware suporta.
          </p>
        </div>
        <div class="room-card add-card" id="btn-add-scene">
          <div class="add-card__icon">${icon('plus', 20)}</div>
          <div class="add-card__label">Nova Cena</div>
        </div>`;
      document.getElementById('btn-add-scene')?.addEventListener('click', _openAddScene);
      return;
    }

    el.innerHTML = Data.scenes.map(s => _sceneCardHtml(s)).join('') + `
      <div class="room-card add-card" id="btn-add-scene">
        <div class="add-card__icon">${icon('plus', 20)}</div>
        <div class="add-card__label">Nova Cena</div>
      </div>`;

    el.querySelectorAll('.btn-activate').forEach(b => {
      b.addEventListener('click', async () => {
        b.disabled = true;
        b.textContent = 'Ativando...';
        try {
          await Data.activateScene(b.dataset.scene);
          toast('Cena ativada!');
          render();
        } catch (e) {
          toast('❌ ' + e.message);
          b.disabled = false;
          b.textContent = 'Ativar cena';
        }
      });
    });
    el.querySelectorAll('.btn-edit-scene').forEach(b => {
      b.addEventListener('click', e => {
        e.stopPropagation();
        _openEditScene(b.dataset.scene);
      });
    });
    el.querySelectorAll('.btn-del-scene').forEach(b => {
      b.addEventListener('click', async e => {
        e.stopPropagation();
        const sc = Data.scenes.find(x => _sameId(x.id, b.dataset.scene));
        if (!confirm(`Excluir "${sc?.name}"?`)) return;
        b.disabled = true;
        try {
          await Data.deleteScene(b.dataset.scene);
          toast('Cena excluída');
          render();
        } catch (e) {
          toast('❌ ' + e.message);
          b.disabled = false;
        }
      });
    });
    document.getElementById('btn-add-scene')?.addEventListener('click', _openAddScene);
  }

  function _openSceneModal(title, scene, onSave) {
    Object.keys(_panelState).forEach(k => delete _panelState[k]);
    const sceneDeviceSettings = scene?.deviceSettings || [];

    Modal.open(`
      <div class="modal__title">${title}</div>
      <div class="modal__body-scroll">${_formHtml(scene || {})}</div>
      <div id="m-sc-err" style="color:#ff6b6b;font-size:12px;display:none;margin-bottom:8px"></div>
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn btn--ghost btn--full" data-modal-close>Cancelar</button>
        <button class="btn btn--primary btn--full" id="m-save-scene">Salvar</button>
      </div>`, () => render());

    _bindDevicePicker(sceneDeviceSettings);
    _renderDeviceConfigPanels(scene?.deviceUserIds || [], sceneDeviceSettings);

    document.getElementById('m-save-scene').addEventListener('click', onSave);
  }

  function _openAddScene() {
    _openSceneModal('Nova Cena', null, async () => {
      const btn = document.getElementById('m-save-scene');
      const errEl = document.getElementById('m-sc-err');
      const name = document.getElementById('m-sc-name').value.trim();
      const deviceConfigs = _readDeviceConfigs();

      errEl.style.display = 'none';
      if (!name) {
        errEl.textContent = 'Informe o nome.';
        errEl.style.display = 'block';
        return;
      }
      if (!deviceConfigs.length) {
        errEl.textContent = 'Selecione ao menos um dispositivo.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Criando...';
      try {
        await Data.addScene({
          name,
          description: document.getElementById('m-sc-desc').value.trim(),
          deviceConfigs,
        });
        toast('Cena criada!');
        Modal.close();
        render();
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Salvar';
      }
    });
    document.getElementById('m-save-scene').textContent = 'Criar Cena';
  }

  function _openEditScene(sceneId) {
    const s = Data.scenes.find(x => _sameId(x.id, sceneId));
    if (!s) return;

    _openSceneModal('Editar Cena', s, async () => {
      const btn = document.getElementById('m-save-scene');
      const errEl = document.getElementById('m-sc-err');
      const name = document.getElementById('m-sc-name').value.trim();
      const deviceConfigs = _readDeviceConfigs();

      errEl.style.display = 'none';
      if (!name) {
        errEl.textContent = 'Informe o nome.';
        errEl.style.display = 'block';
        return;
      }
      if (!deviceConfigs.length) {
        errEl.textContent = 'Selecione ao menos um dispositivo.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Salvando...';
      try {
        await Data.editScene(sceneId, {
          name,
          description: document.getElementById('m-sc-desc').value.trim(),
          deviceConfigs,
        });
        toast('Cena atualizada!');
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

  return { render };
})();
