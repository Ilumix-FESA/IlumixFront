/* ============================================================
   ILUMIX — Data Store v8
   Sincronizado com o backend (commit b47c24d).
   - CommandId agora é int (Commands.Id do banco)
   - Rotas: /api/DevicesUsers, /api/Locations, /api/Scenes
   ============================================================ */
const Data = (() => {

  let rooms          = [];
  let bulbs          = [];
  let deviceTypes    = [{ id: 1, name: 'ESP32 Ilumix' }];
  let scenes         = [];
  let schedules      = [];
  let voiceCommands  = [];
  let commandHistory = [];
  let partyRooms     = {};
  let _schedTimer    = null;

  const energyHourly = [
    {label:'0h',v:.02},{label:'3h',v:.01},{label:'6h',v:.08},{label:'9h',v:.15},
    {label:'12h',v:.18},{label:'15h',v:.22},{label:'18h',v:.20},{label:'21h',v:.12},
  ];

  /* ── Helpers ─────────────────────────────────────────────── */
  const uid       = () => '_'+Math.random().toString(36).slice(2,9);
  const getBulbs  = rid => bulbs.filter(b => String(b.roomId) === String(rid));
  const roomStats = rid => {
    const rb=getBulbs(rid), on=rb.filter(b=>b.on);
    return { total:rb.length, active:on.length,
      power:  rb.reduce((s,b)=>s+(b.on?b.power:0),0),
      avgBri: on.length ? Math.round(on.reduce((s,b)=>s+b.brightness,0)/on.length) : 0 };
  };
  const totalPower  = () => bulbs.reduce((s,b)=>s+(b.on?b.power:0),0);
  const activeBulbs = () => bulbs.filter(b=>b.on).length;
  const activeScene = () => scenes.find(s=>s.active)||null;

  /* ── Mappers ─────────────────────────────────────────────── */
  function _locationImageUrl(loc) {
    const raw = loc?.imagemEmByte ?? loc?.ImagemEmByte;
    if (!raw) return null;
    if (typeof raw === 'string') {
      return raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`;
    }
    if (Array.isArray(raw) && raw.length) {
      try {
        const bytes = new Uint8Array(raw);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        return `data:image/jpeg;base64,${btoa(binary)}`;
      } catch { return null; }
    }
    return null;
  }

  function _mapRoom(loc) {
    const apiId = loc.id ?? loc.Id ?? loc._id;
    return {
      id:       String(apiId ?? ''),
      name:     loc.name || loc.Name,
      icon:     loc.ico || loc.Ico || 'bulb',
      color:    '#E2B84A',
      imageUrl: _locationImageUrl(loc),
      _apiId:   apiId,
    };
  }

  function _mapLamp(lamp) {
    const attrs = lamp.attributes||lamp.Attributes||[];
    const getAttrVal = (...names) => {
      for (const n of names) {
        const a = attrs.find(a=>(a.name||a.Name||'').toLowerCase()===n.toLowerCase());
        if (a) return (a.value??a.Value??'').toString();
      }
      return '';
    };
    const stateRaw = getAttrVal('state')||'off';
    const isOn     = ['on','true','1','yes'].includes(stateRaw.toLowerCase());
    const briRaw   = parseInt(getAttrVal('brightness')||'100');
    const colorRaw = getAttrVal('color')||'';
    const _rgbToHex = s => '#' + s.split(',').map(v => parseInt(v.trim()).toString(16).padStart(2,'0')).join('');
    const colorHex  = colorRaw.startsWith('#') ? colorRaw
                    : colorRaw.includes(',')    ? _rgbToHex(colorRaw)
                    : '#FFFFFF';

    // Monta mapa commandName → commandId (int) a partir de Commands[] retornado pelo backend
    const cmds = lamp.commands||lamp.Commands||[];
    const commandIds = {};
    cmds.forEach(c => {
      const name = c.name||c.Name;
      const id   = c.id||c.Id;
      if (name && id != null) commandIds[name] = id;
    });

    const apiId   = lamp.id ?? lamp.Id ?? lamp._id;
    const locRaw  = lamp.idLocation ?? lamp.IdLocation ?? lamp.locationId ?? lamp.LocationId;

    return {
      id:              String(apiId ?? ''),
      roomId:          locRaw != null && locRaw !== '' ? String(locRaw) : null,
      name:            lamp.name||lamp.Name||'(sem nome)',
      on:              isOn,
      brightness:      isNaN(briRaw)?100:Math.min(100,Math.max(0,briRaw)),
      color:           colorHex,
      temp:            getAttrVal('colortemperature','temperature')||'4000K',
      power:           0,
      status:          'online',
      deviceTypeId:    lamp.idDevice||lamp.IdDevice||1,
      deviceTypeName:  lamp.deviceName||lamp.DeviceName||'',
      fiwareId:        lamp.idFiware||lamp.IdFiware||'',
      _apiId:          apiId,
      _commandIds:     commandIds,
      _cmds:           cmds,
      _attrs:          attrs,
    };
  }

  function _mapDeviceType(d) {
    return {
      id:   d.id||d.Id,
      name: d.name||d.Name||'Dispositivo',
    };
  }

  function _commandNameById(cmdId) {
    const id = Number(cmdId);
    for (const b of bulbs) {
      for (const c of b._cmds || []) {
        const cid = c.id ?? c.Id;
        if (Number(cid) === id) return c.name || c.Name;
      }
      for (const [name, cid] of Object.entries(b._commandIds || {})) {
        if (Number(cid) === id) return name;
      }
    }
    return null;
  }

  function _parseCommandValues(commands) {
    const out = { brightness: null, temp: null, targetTemp: null, color: null, powerOn: true };
    for (const c of commands || []) {
      const cmdId = c.commandId ?? c.CommandId;
      const val   = String(c.value ?? c.Value ?? '');
      const name  = _commandNameById(cmdId)?.toLowerCase() || '';
      if (name === 'on') out.powerOn = true;
      if (name === 'off') out.powerOn = false;
      if (name.includes('brightness')) out.brightness = parseInt(val, 10);
      if (name === 'setcolortemperature' || name.includes('colortemp'))
        out.temp = val;
      if (name === 'settargettemperature' || name.includes('targettemperature')) {
        const n = parseFloat(val);
        out.targetTemp = isNaN(n) ? null : n;
      }
      if (name === 'setcolor' || (name.includes('color') && !name.includes('temp')))
        out.color = val;
    }
    return out;
  }

  function findCommandId(b, predicate) {
    for (const [name, id] of Object.entries(b._commandIds || {})) {
      if (predicate(name.toLowerCase())) return id;
    }
    for (const c of b._cmds || []) {
      const name = (c.name || c.Name || '').toLowerCase();
      const id   = c.id ?? c.Id;
      if (name && id != null && predicate(name)) return id;
    }
    return null;
  }

  function getDeviceCapabilities(b) {
    const cmds     = b._cmds || [];
    const cmdNames = cmds.map(c => (c.name || c.Name || '').toLowerCase());
    const hasOn    = cmdNames.some(n => n === 'on' || n === 'off')
      || b._commandIds?.on != null || b._commandIds?.off != null;
    const hasBri   = cmdNames.some(n => n.includes('brightness'));
    const hasColor = cmdNames.some(n => n.includes('color') && !n.includes('temp'));
    const hasColorTemp  = cmdNames.some(n => n === 'setcolortemperature' || n.includes('colortemp'));
    const hasTargetTemp = cmdNames.some(n => n === 'settargettemperature' || n.includes('targettemperature'));
    const autoDimmerCmdName = Object.keys(b._commandIds || {}).find(k => {
      const n = k.toLowerCase();
      return n.includes('autodimmer') || (n.includes('dimmer') && !n.includes('brightness'));
    }) || cmds.map(c => c.name || c.Name).find(n => {
      const l = (n || '').toLowerCase();
      return l.includes('autodimmer') || (l.includes('dimmer') && !l.includes('brightness'));
    }) || null;
    const hasAutoDimmer = !!autoDimmerCmdName
      || cmdNames.some(n => n.includes('autodimmer') || (n.includes('dimmer') && !n.includes('brightness')));
    return { hasOn, hasBri, hasColor, hasColorTemp, hasTargetTemp, hasAutoDimmer, autoDimmerCmdName };
  }

  function parseDeviceCommandSettings(commands, bulb) {
    const base  = _parseCommandValues(commands);
    const out   = {
      powerOn:      base.powerOn !== false,
      brightness:   base.brightness != null && !isNaN(base.brightness) ? base.brightness : 80,
      temp:         base.temp || '2700K',
      targetTemp:   base.targetTemp != null && !isNaN(base.targetTemp) ? base.targetTemp : 24,
      color:        base.color && base.color.startsWith('#') ? base.color : '#E2B84A',
      autoDimmerOn: false,
      minDim:       0,
      maxDim:       100,
    };

    const cmdNameForId = (cmdId) => {
      if (bulb) {
        for (const [n, cid] of Object.entries(bulb._commandIds || {})) {
          if (Number(cid) === Number(cmdId)) return n.toLowerCase();
        }
        for (const c of bulb._cmds || []) {
          if (Number(c.id ?? c.Id) === Number(cmdId)) return (c.name || c.Name || '').toLowerCase();
        }
      }
      return (_commandNameById(cmdId) || '').toLowerCase();
    };

    for (const c of commands || []) {
      const cmdId = c.commandId ?? c.CommandId;
      const val   = String(c.value ?? c.Value ?? '');
      const name  = cmdNameForId(cmdId);
      if (!name.includes('autodimmer') && !(name.includes('dimmer') && !name.includes('brightness'))) continue;
      if (val === 'on' || val === 'off') out.autoDimmerOn = val === 'on';
      else if (val.includes(',')) {
        const parts = val.split(',').map(x => parseInt(x.trim(), 10));
        if (!isNaN(parts[0])) out.minDim = parts[0];
        if (!isNaN(parts[1])) out.maxDim = parts[1];
      }
    }
    return out;
  }

  function _mapScene(s) {
    const devices = (s.devices || s.Devices || []).map(d => ({
      deviceUserId: d.deviceUserId ?? d.DeviceUserId,
      commands: (d.commands || d.Commands || []).map(c => ({
        commandId: c.commandId ?? c.CommandId,
        value:     String(c.value ?? c.Value ?? ''),
      })),
    }));

    const deviceSettings = devices.map(d => {
      const uid = String(d.deviceUserId);
      const b   = bulbs.find(x => String(x._apiId) === uid);
      return {
        deviceUserId: uid,
        deviceName:   b?.name || `ID ${uid}`,
        settings:     parseDeviceCommandSettings(d.commands, b),
      };
    });

    const first = deviceSettings[0]?.settings || {};
    const color = first.color || '#E2B84A';

    const deviceUserIds = devices.map(d => String(d.deviceUserId));
    const deviceNames = deviceSettings.map(ds => ds.deviceName);

    return {
      id:            String(s.id ?? s.Id ?? s._id ?? ''),
      name:          s.name || s.Name,
      desc:          s.description || s.Description || '',
      active:        !!(s.active ?? s.Active),
      brightness:    first.brightness ?? 80,
      temp:          first.temp || '2700K',
      color,
      icon:          'scene',
      devices,
      deviceUserIds,
      deviceNames,
      deviceSettings,
      deviceCount:   devices.length,
      _apiId:        s.id ?? s.Id ?? s._id,
    };
  }

  /* ══════════════════════════════════════════════════════════
     LOAD FROM API
  ══════════════════════════════════════════════════════════ */
  function _mapSchedule(s) {
    const days = typeof s.days === 'string'
      ? s.days.split('').map(Number)
      : (Array.isArray(s.days) ? s.days : [1,1,1,1,1,0,0]);
    return {
      id:         s.id   ?? s.Id,
      name:       s.name ?? s.Name,
      time:       s.time ?? s.Time,
      days,
      sceneId:    s.idScene  != null ? String(s.idScene)  : (s.sceneId  ?? null),
      targetType: s.targetType ?? s.TargetType ?? 'all',
      targetId:   s.targetId  != null ? String(s.targetId)  :
                  s.TargetId  != null ? String(s.TargetId)  : null,
      on:         s.isEnabled ?? s.IsEnabled ?? true,
    };
  }

  async function loadFromApi() {
    const [locRes, devRes, typeRes, sceneRes, schedRes] = await Promise.allSettled([
      Api.locations.getAll(),
      Api.devices.getAll(),
      Api.deviceTypes.getAll(),
      Api.scenes.getAll(),
      Api.schedules.getAll(),
    ]);
    if (locRes.status==='fulfilled'   && Array.isArray(locRes.value))   rooms     = locRes.value.map(_mapRoom);
    if (devRes.status==='fulfilled'   && Array.isArray(devRes.value))   bulbs     = devRes.value.map(_mapLamp);
    if (typeRes.status==='fulfilled'  && Array.isArray(typeRes.value) && typeRes.value.length)
      deviceTypes = typeRes.value.map(_mapDeviceType);
    if (sceneRes.status==='fulfilled' && Array.isArray(sceneRes.value)) scenes    = sceneRes.value.map(_mapScene);
    if (schedRes.status==='fulfilled' && Array.isArray(schedRes.value)) schedules = schedRes.value.map(_mapSchedule);
    if (locRes.status==='rejected')   console.error('[Data] locations:',  locRes.reason?.message);
    if (devRes.status==='rejected')   console.error('[Data] devices:',    devRes.reason?.message);
    if (typeRes.status==='rejected')  console.warn('[Data]  deviceTypes:', typeRes.reason?.message);
    if (sceneRes.status==='rejected') console.error('[Data] scenes:',     sceneRes.reason?.message);
    if (schedRes.status==='rejected') console.warn('[Data]  schedules:',  schedRes.reason?.message);
    _startScheduler();
  }

  /* ── Refresh de uma lâmpada ──────────────────────────────── */
  function _findBulb(id) {
    return bulbs.find(b => String(b.id) === String(id));
  }

  async function refreshBulb(id) {
    const b = _findBulb(id);
    if (!b?._apiId) return b;
    try {
      const fresh  = await Api.devices.getById(b._apiId);
      const mapped = _mapLamp(fresh);
      mapped.roomId = b.roomId;
      Object.assign(b, mapped);
      return b;
    } catch(e) { console.warn('[refreshBulb]', e.message); return b; }
  }

  /* ══════════════════════════════════════════════════════════
     SYNC — envia comando ao backend
     CommandId é inteiro (Commands.Id) resolvido via _commandIds
  ══════════════════════════════════════════════════════════ */
  async function _sendCmd(bulb, commandName, value) {
    if (!bulb._apiId) return;
    const cmdId = bulb._commandIds?.[commandName];
    if (cmdId == null) {
      console.warn(`[Sync] Comando "${commandName}" não encontrado para ${bulb.name}`);
      return;
    }
    try {
      await Api.devices.command(bulb._apiId, cmdId, String(value));
      logCommand(`${bulb.name} → ${commandName}: ${value}`);
    } catch(e) {
      console.error(`[Sync] ${commandName}:`, e.message);
      if (typeof toast==='function') toast('⚠️ '+bulb.name+': '+e.message);
    }
  }

  function _syncToggle(bulb)     { _sendCmd(bulb, bulb.on ? 'on' : 'off', bulb.on ? 'on' : 'off'); }
  function _syncBrightness(bulb) { _sendCmd(bulb, 'setBrightness', bulb.brightness); }
  function _syncColor(bulb)      { _sendCmd(bulb, 'setColor', bulb.color); }
  function _syncTemp(bulb)       { _sendCmd(bulb, 'setColorTemperature', bulb.temp); }

  /* ══════════════════════════════════════════════════════════
     ROOMS CRUD  →  /api/Locations
     POST FormData { name, imagem? } → { message, id, name }
     PUT  { name }  DELETE desvincula dispositivos no backend
  ══════════════════════════════════════════════════════════ */
  function _findRoom(id) {
    return rooms.find(r => String(r.id) === String(id));
  }

  async function addRoom(name, imageFile = null) {
    const res = await Api.locations.create(name, imageFile);

    let loc = res;
    if (!(res?.id || res?.Id)) {
      const all = await Api.locations.getAll();
      loc = all.find(l => (l.name || l.Name) === name) || all[all.length - 1];
    }

    const apiId = loc?.id ?? loc?.Id ?? res?.id ?? res?.Id;
    if (apiId) {
      try {
        const full = await Api.locations.getById(apiId);
        if (full) loc = full;
      } catch { /* usa loc parcial */ }
    }

    const room = _mapRoom(loc);
    if (!room.id) throw new Error('Não foi possível confirmar o cadastro do cômodo.');

    const existing = rooms.findIndex(r => String(r.id) === String(room.id));
    if (existing >= 0) rooms[existing] = room;
    else rooms.push(room);

    return room;
  }

  async function editRoom(id, name) {
    const r = _findRoom(id);
    if (!r) return;
    await Api.locations.update(r._apiId ?? id, name);
    r.name = name;
  }

  async function deleteRoom(id) {
    const r = _findRoom(id);
    if (r?._apiId) await Api.locations.delete(r._apiId);
    rooms = rooms.filter(r => String(r.id) !== String(id));
    bulbs.filter(b => String(b.roomId) === String(id)).forEach(b => { b.roomId = null; });
  }

  /** Associa um dispositivo a um cômodo (ou remove se roomId for null). */
  async function setDeviceRoom(deviceLocalId, roomId) {
    const b = _findBulb(deviceLocalId);
    if (!b?._apiId) return;

    const room = roomId ? _findRoom(roomId) : null;
    const locId = room?._apiId != null ? Number(room._apiId) : null;

    await Api.devices.configure(b._apiId, b.name, locId);
    b.roomId = roomId || null;
  }

  /** Recarrega dispositivos do backend (sincroniza idLocation / roomId). */
  async function refreshBulbsFromApi() {
    const devices = await Api.devices.getAll();
    if (Array.isArray(devices)) bulbs = devices.map(_mapLamp);
  }

  /**
   * Um dispositivo só pode estar em um cômodo.
   * Atribui ao cômodo os selecionados e remove os demais deste cômodo.
   */
  async function syncRoomDevices(roomId, selectedDeviceKeys = []) {
    const keys = new Set(selectedDeviceKeys.map(k => String(k)));

    for (const b of bulbs) {
      const key = String(b._apiId ?? b.id);
      const isInRoom = String(b.roomId) === String(roomId);
      const shouldBeIn = keys.has(key);
      const isElsewhere = b.roomId && !isInRoom;

      if (shouldBeIn && (isInRoom || !b.roomId)) {
        if (!isInRoom) await setDeviceRoom(b.id, roomId);
      } else if (shouldBeIn && isElsewhere) {
        await setDeviceRoom(b.id, roomId);
      } else if (!shouldBeIn && isInRoom) {
        await setDeviceRoom(b.id, null);
      }
    }

    await refreshBulbsFromApi();
  }

  /* ══════════════════════════════════════════════════════════
     BULBS CRUD
     create: POST /api/DevicesUsers { name, deviceId:1, idLocation }
     configure: PUT /api/DevicesUsers/{id}/configure { name, locationId }
  ══════════════════════════════════════════════════════════ */
  async function addDevice(name, roomId, deviceTypeId=1) {
    const room  = roomId ? rooms.find(r=>r.id===roomId) : null;
    const locId = room?._apiId ? Number(room._apiId) : null;
    const typeId = Number(deviceTypeId) || 1;

    const createRes = await Api.devices.create(name, locId, typeId);
    const apiId     = createRes.id || createRes.Id;
    const fiwareId  = createRes.fiwareId || createRes.FiwareId;

    let newDevice = null;
    if (apiId) {
      try { newDevice = await Api.devices.getById(apiId); } catch { /* fallback abaixo */ }
    }
    if (!newDevice && fiwareId) {
      const allDevices = await Api.devices.getAll();
      newDevice = allDevices.find(d =>
        (d.idFiware||d.IdFiware) === fiwareId
      );
    }
    if (!newDevice) throw new Error('Não foi possível confirmar o cadastro do dispositivo.');

    const bulb  = _mapLamp(newDevice);
    bulb.roomId = roomId;
    const existing = bulbs.findIndex(b => b._apiId === bulb._apiId);
    if (existing >= 0) bulbs[existing] = bulb;
    else bulbs.push(bulb);
    return { device: bulb, fiwareId: bulb.fiwareId || fiwareId };
  }

  async function addBulb(name, roomId) {
    const { device } = await addDevice(name, roomId, 1);
    return device;
  }

  async function deleteBulb(id) {
    const b = _findBulb(id);
    if (b?._apiId) await Api.devices.delete(b._apiId);
    bulbs = bulbs.filter(b=>b.id!==id);
  }

  async function renameDevice(id, name, roomId) {
    const b    = _findBulb(id);
    if (!b) return;
    const room = roomId ? rooms.find(r=>r.id===roomId) : null;
    const locId = room?._apiId ? Number(room._apiId) : null;
    await Api.devices.configure(b._apiId||id, name, locId);
    b.name = name;
    b.roomId = roomId || null;
  }

  const renameBulb = renameDevice;

  /* ── Controles ── */
  function toggleBulb(id)      { const b=_findBulb(id); if(!b) return; b.on=!b.on; _syncToggle(b); }
  function setBrightness(id,v) { const b=_findBulb(id); if(!b) return; b.brightness=Math.max(0,Math.min(100,v)); _syncBrightness(b); }
  function setColor(id,c)      { const b=_findBulb(id); if(!b) return; b.color=c; _syncColor(b); }
  function setTemp(id,t)       { const b=_findBulb(id); if(!b) return; b.temp=t; _syncTemp(b); }
  function toggleRoom(rid) {
    const rb=getBulbs(rid), anyOn=rb.some(b=>b.on);
    rb.forEach(b=>{ b.on=!anyOn; _syncToggle(b); });
  }
  function setParty(rid,val) { partyRooms[rid]=val; }
  function isParty(rid)      { return !!partyRooms[rid]; }

  /* ══════════════════════════════════════════════════════════
     SCENES CRUD + ACTIVATE
     POST /api/Scenes { name, description, devices:[{deviceUserId, commands:[{commandId:int, value}]}] }
     POST /api/Scenes/{id}/activate — backend envia os comandos para o Fiware
  ══════════════════════════════════════════════════════════ */

  function _resolveBulbByKey(key) {
    return bulbs.find(b => String(b._apiId) === String(key) || String(b.id) === String(key));
  }

  function _buildDeviceCommands(b, settings) {
    const commands = [];
    const push = (cmdId, val) => {
      if (cmdId != null) commands.push({ commandId: cmdId, value: String(val) });
    };

    if (settings.powerOn !== false) {
      push(findCommandId(b, n => n === 'on'), 'on');
    } else {
      push(findCommandId(b, n => n === 'off'), 'off');
    }

    if (settings.brightness != null) {
      push(findCommandId(b, n => n.includes('brightness')), settings.brightness);
    }
    if (settings.color) {
      push(findCommandId(b, n => n.includes('color') && !n.includes('temp')), settings.color);
    }
    if (settings.temp) {
      push(findCommandId(b, n => n === 'setcolortemperature' || n.includes('colortemp')), settings.temp);
    }
    if (settings.targetTemp != null) {
      push(findCommandId(b, n => n === 'settargettemperature' || n.includes('targettemperature')), settings.targetTemp);
    }
    if (settings.autoDimmer != null) {
      push(findCommandId(b, n => n.includes('autodimmer')
        || (n.includes('dimmer') && !n.includes('brightness'))), settings.autoDimmer);
    }

    return commands;
  }

  function _buildDevices(deviceConfigs) {
    const built = [];

    for (const entry of deviceConfigs || []) {
      const key = entry.deviceKey ?? entry.deviceUserId;
      const b   = _resolveBulbByKey(key);
      if (!b?._apiId) continue;
      const commands = _buildDeviceCommands(b, entry.settings || {});
      if (!commands.length) continue;
      built.push({ deviceUserId: Number(b._apiId), commands });
    }

    return built;
  }

  function _findScene(id) {
    return scenes.find(s => String(s.id) === String(id));
  }

  async function reloadScenesFromApi() {
    const all = await Api.scenes.getAll();
    if (Array.isArray(all)) scenes = all.map(_mapScene);
  }

  async function addScene(d) {
    let deviceConfigs = d.deviceConfigs;
    if (!deviceConfigs?.length && (d.deviceKeys || d.lampIds)) {
      const settings = {
        brightness: d.brightness,
        temp:       d.temp,
        color:      d.color,
        powerOn:    d.powerOn !== false,
      };
      deviceConfigs = (d.deviceKeys || d.lampIds).map(k => ({ deviceKey: k, settings }));
    }

    const devices = _buildDevices(deviceConfigs);

    if (!devices.length) {
      throw new Error('Selecione ao menos um dispositivo com comandos compatíveis.');
    }

    const res = await Api.scenes.create({
      name:        d.name,
      description: d.description || '',
      devices,
    });

    try {
      await reloadScenesFromApi();
      const fresh = scenes.find(s => String(s._apiId) === String(res?.id ?? res?.Id))
        || scenes.find(s => s.name === d.name);
      if (fresh) return fresh;
    } catch { /* fallback abaixo */ }

    const scene = _mapScene({
      id: res?.id ?? res?.Id ?? uid(),
      name: d.name,
      description: d.description,
      active: false,
      devices,
    });
    scenes.push(scene);
    return scene;
  }

  async function editScene(id, d) {
    const s = _findScene(id);
    if (!s) return;
    if (s._apiId) {
      try { await Api.scenes.delete(s._apiId); } catch { /* segue */ }
    }
    scenes = scenes.filter(x => String(x.id) !== String(id));
    return addScene(d);
  }

  async function deleteScene(id) {
    const s = _findScene(id);
    if (s?._apiId) await Api.scenes.delete(s._apiId);
    scenes = scenes.filter(x => String(x.id) !== String(id));
  }

  async function activateScene(id) {
    const s = _findScene(id);
    if (!s) return;

    if (s._apiId) {
      try { await Api.scenes.activate(s._apiId); }
      catch (e) { console.warn('[scene activate]', e.message); throw e; }
    }

    scenes.forEach(x => { x.active = String(x.id) === String(id); });

    for (const devConfig of s.devices || []) {
      const b = bulbs.find(x => String(x._apiId) === String(devConfig.deviceUserId));
      if (!b) continue;

      for (const cmd of devConfig.commands) {
        const cmdName = (_commandNameById(cmd.commandId) || '').toLowerCase();
        const val = cmd.value;
        if (cmdName === 'on') b.on = true;
        else if (cmdName === 'off') b.on = false;
        else if (cmdName.includes('brightness')) b.brightness = parseInt(val, 10) || b.brightness;
        else if (cmdName.includes('colortemp') || cmdName.includes('temperature')) b.temp = val;
        else if (cmdName.includes('color')) b.color = val.startsWith('#') ? val : b.color;
      }
    }

    logCommand(`Cena ativada: ${s.name} (${s.deviceCount} dispositivo${s.deviceCount !== 1 ? 's' : ''})`, 'App');
  }

  /* ══════════════════════════════════════════════════════════
     SCHEDULE EXECUTOR
  ══════════════════════════════════════════════════════════ */
  function _startScheduler() {
    if (_schedTimer) clearInterval(_schedTimer);
    _checkSchedules();
    _schedTimer = setInterval(_checkSchedules, 60_000);
  }

  async function _checkSchedules() {
    const now   = new Date();
    const hhmm  = now.getHours().toString().padStart(2,'0')+':'+now.getMinutes().toString().padStart(2,'0');
    const dow   = now.getDay();
    const dayIdx = dow===0 ? 6 : dow-1;

    for (const sched of schedules) {
      if (!sched.on) continue;
      if (sched.time !== hhmm) continue;
      if (sched.days && !sched.days[dayIdx]) continue;
      const key = `sched_last_${sched.id}`;
      if (sessionStorage.getItem(key)===hhmm) continue;
      sessionStorage.setItem(key, hhmm);
      console.log('[Scheduler] Executando:', sched.name, 'às', hhmm);
      await _executeSchedule(sched);
    }
  }

  async function _executeSchedule(sched) {
    try {
      if (sched.sceneId) { await activateScene(sched.sceneId); logCommand('Rotina: '+sched.name+' → cena', 'Rotina'); return; }
      const targets =
        sched.targetType==='room' ? getBulbs(sched.targetId) :
        sched.targetType==='bulb' ? bulbs.filter(b=>b.id===sched.targetId) : bulbs;
      for (const b of targets) { b.on=true; _syncToggle(b); }
      logCommand('Rotina: '+sched.name, 'Rotina');
    } catch(e) { console.error('[Scheduler]', e.message); }
  }

  async function addSchedule(d) {
    const res = await Api.schedules.create(d);
    const newId = res?.id ?? res?.Id;
    if (newId != null) {
      schedules.push(_mapSchedule({ ...d, id: newId, isEnabled: true }));
      _startScheduler();
    }
    return res;
  }

  async function editSchedule(id, d) {
    await Api.schedules.update(id, d);
    const s = schedules.find(s => String(s.id) === String(id));
    if (s) Object.assign(s, _mapSchedule({ ...s, ...d }));
  }

  async function deleteSchedule(id) {
    await Api.schedules.delete(id);
    schedules = schedules.filter(s => String(s.id) !== String(id));
  }

  async function toggleSchedule(id) {
    await Api.schedules.toggle(id);
    const s = schedules.find(s => String(s.id) === String(id));
    if (s) s.on = !s.on;
  }

  /* ── Voice ── */
  function addVoiceCmd(d)     { const id=uid(); voiceCommands.push({id,...d}); return id; }
  function editVoiceCmd(id,d) { const v=voiceCommands.find(v=>v.id===id); if(v) Object.assign(v,d); }
  function deleteVoiceCmd(id) { voiceCommands=voiceCommands.filter(v=>v.id!==id); }
  async function executeVoice(vc) {
    switch(vc.action){
      case 'all_off':     for(const b of bulbs){ b.on=false; _syncToggle(b); } break;
      case 'all_on':      for(const b of bulbs){ b.on=true;  _syncToggle(b); } break;
      case 'toggle_room': toggleRoom(vc.roomId); break;
      case 'toggle_bulb': toggleBulb(vc.bulbId); break;
      case 'scene':       await activateScene(vc.sceneId); break;
    }
    logCommand(`Voz: "${vc.phrase}"`, 'Voz');
  }

  function logCommand(cmd, source='App') {
    commandHistory.unshift({
      time: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      cmd, source,
    });
    if (commandHistory.length>50) commandHistory.pop();
  }

  return {
    get rooms()         { return rooms; },
    get bulbs()         { return bulbs; },
    get devices()       { return bulbs; },
    get deviceTypes()   { return deviceTypes; },
    get scenes()        { return scenes; },
    get schedules()     { return schedules; },
    get voiceCommands() { return voiceCommands; },
    get commandHistory(){ return commandHistory; },
    get energyHourly()  { return energyHourly; },

    uid, getBulbs, roomStats, totalPower, activeBulbs, activeScene, _sendCmd,
    loadFromApi, refreshBulb, reloadScenesFromApi, _buildDevices, _resolveBulbByKey,
    getDeviceCapabilities, findCommandId, parseDeviceCommandSettings,

    addRoom,    editRoom,    deleteRoom,  setDeviceRoom, syncRoomDevices,
    refreshBulbsFromApi, _findRoom,
    addDevice,  addBulb,     deleteBulb,  renameDevice, renameBulb,
    toggleBulb, setBrightness, setColor, setTemp, toggleRoom,
    setParty,   isParty,
    addScene,   editScene,   deleteScene, activateScene,
    addSchedule,editSchedule,deleteSchedule,toggleSchedule,
    addVoiceCmd,editVoiceCmd,deleteVoiceCmd,executeVoice,
    logCommand,
  };
})();
