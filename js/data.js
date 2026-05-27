/* ============================================================
   ILUMIX — Data Store v8
   Sincronizado com o backend (commit b47c24d).
   - CommandId agora é int (Commands.Id do banco)
   - Rotas: /api/DevicesUsers, /api/Locations, /api/Scenes
   ============================================================ */
const Data = (() => {

  let rooms          = [];
  let bulbs          = [];
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
  const getBulbs  = rid => bulbs.filter(b=>b.roomId===rid);
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
  function _mapRoom(loc) {
    return {
      id:     loc.id||loc.Id||loc._id,
      name:   loc.name||loc.Name,
      icon:   loc.ico||loc.Ico||'bulb',
      color:  '#E2B84A',
      _apiId: loc.id||loc.Id||loc._id,
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

    return {
      id:          lamp.id||lamp.Id||lamp._id,
      roomId:      lamp.idLocation||lamp.IdLocation||lamp.locationId||lamp.LocationId||null,
      name:        lamp.name||lamp.Name||'(sem nome)',
      on:          isOn,
      brightness:  isNaN(briRaw)?100:Math.min(100,Math.max(0,briRaw)),
      color:       colorHex,
      temp:        getAttrVal('colortemperature','temperature')||'4000K',
      power:       0,
      status:      'online',
      _apiId:      lamp.id||lamp.Id||lamp._id,
      _commandIds: commandIds,
      _cmds:       cmds,
      _attrs:      attrs,
    };
  }

  function _mapScene(s) {
    return {
      id:      s.id||s.Id||s._id,
      name:    s.name||s.Name,
      desc:    s.description||s.Description||'',
      active:  s.active??s.Active??false,
      // devices: [{deviceUserId, commands:[{commandId:int, value}]}]
      devices: (s.devices||s.Devices||[]).map(d=>({
        deviceUserId: d.deviceUserId||d.DeviceUserId,
        commands:     (d.commands||d.Commands||[]).map(c=>({
          commandId: c.commandId||c.CommandId,
          value:     c.value||c.Value||'',
        })),
      })),
      _apiId:  s.id||s.Id||s._id,
    };
  }

  /* ══════════════════════════════════════════════════════════
     LOAD FROM API
  ══════════════════════════════════════════════════════════ */
  async function loadFromApi() {
    const [locRes,lampRes,sceneRes] = await Promise.allSettled([
      Api.locations.getAll(),
      Api.lamps.getAll(),
      Api.scenes.getAll(),
    ]);
    if (locRes.status==='fulfilled'  && Array.isArray(locRes.value))   rooms  = locRes.value.map(_mapRoom);
    if (lampRes.status==='fulfilled' && Array.isArray(lampRes.value))  bulbs  = lampRes.value.map(_mapLamp);
    if (sceneRes.status==='fulfilled'&& Array.isArray(sceneRes.value)) scenes = sceneRes.value.map(_mapScene);
    if (locRes.status==='rejected')   console.error('[Data] locations:', locRes.reason?.message);
    if (lampRes.status==='rejected')  console.error('[Data] lamps:',    lampRes.reason?.message);
    if (sceneRes.status==='rejected') console.error('[Data] scenes:',   sceneRes.reason?.message);
    _startScheduler();
  }

  /* ── Refresh de uma lâmpada ──────────────────────────────── */
  async function refreshBulb(id) {
    const b = bulbs.find(b=>b.id===id);
    if (!b?._apiId) return b;
    try {
      const fresh  = await Api.lamps.getById(b._apiId);
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
      await Api.lamps.command(bulb._apiId, cmdId, String(value));
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
     ROOMS CRUD
     create: POST /api/Locations com FormData { name }
     update: PUT  /api/Locations/{id} com JSON { name }
  ══════════════════════════════════════════════════════════ */
  async function addRoom(name) {
    const res  = await Api.locations.create(name);
    const room = _mapRoom(res.location||res);
    rooms.push(room);
    return room;
  }

  async function editRoom(id, name) {
    const r = rooms.find(r=>r.id===id);
    if (!r) return;
    await Api.locations.update(r._apiId||id, name);
    r.name = name;
  }

  async function deleteRoom(id) {
    const r = rooms.find(r=>r.id===id);
    if (r?._apiId) await Api.locations.delete(r._apiId);
    rooms = rooms.filter(r=>r.id!==id);
    bulbs.filter(b=>b.roomId===id).forEach(b=>b.roomId=null);
  }

  /* ══════════════════════════════════════════════════════════
     BULBS CRUD
     create: POST /api/DevicesUsers { name, deviceId:1, idLocation }
     configure: PUT /api/DevicesUsers/{id}/configure { name, locationId }
  ══════════════════════════════════════════════════════════ */
  async function addBulb(name, roomId) {
    const room   = rooms.find(r=>r.id===roomId);
    const locId  = room?._apiId ? Number(room._apiId) : null;

    // Cria o dispositivo (deviceId:1 = ESP32 Ilumix — único tipo suportado)
    const createRes = await Api.lamps.create(name, locId);
    // Resposta: { message, fiwareId }
    const fiwareId  = createRes.fiwareId || createRes.FiwareId;

    // Busca todos os devices e encontra o recém-criado pelo fiwareId
    const allDevices = await Api.lamps.getAll();
    const newDevice  = allDevices.find(d =>
      (d.idFiware||d.IdFiware||d.idFiware) === fiwareId
    ) || allDevices[allDevices.length - 1]; // fallback: último cadastrado

    if (!newDevice) throw new Error('Não foi possível confirmar o cadastro da lâmpada.');

    const bulb   = _mapLamp(newDevice);
    bulb.roomId  = roomId;
    bulbs.push(bulb);
    return bulb;
  }

  async function deleteBulb(id) {
    const b = bulbs.find(b=>b.id===id);
    if (b?._apiId) await Api.lamps.delete(b._apiId);
    bulbs = bulbs.filter(b=>b.id!==id);
  }

  async function renameBulb(id, name, roomId) {
    const b    = bulbs.find(b=>b.id===id);
    if (!b) return;
    const room = rooms.find(r=>r.id===roomId);
    const locId = room?._apiId ? Number(room._apiId) : null;
    await Api.lamps.configure(b._apiId||id, name, locId);
    b.name=name; b.roomId=roomId;
  }

  /* ── Controles ── */
  function toggleBulb(id)      { const b=bulbs.find(b=>b.id===id); if(!b) return; b.on=!b.on; _syncToggle(b); }
  function setBrightness(id,v) { const b=bulbs.find(b=>b.id===id); if(!b) return; b.brightness=Math.max(0,Math.min(100,v)); _syncBrightness(b); }
  function setColor(id,c)      { const b=bulbs.find(b=>b.id===id); if(!b) return; b.color=c; _syncColor(b); }
  function setTemp(id,t)       { const b=bulbs.find(b=>b.id===id); if(!b) return; b.temp=t; _syncTemp(b); }
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

  function _buildDevices(lampIds, locationIds, brightness, temp, color) {
    const allBulbIds = new Set(lampIds||[]);
    (locationIds||[]).forEach(rid => getBulbs(rid).forEach(b=>allBulbIds.add(b.id)));

    return [...allBulbIds].map(bid => {
      const b = bulbs.find(b=>b.id===bid);
      if (!b?._apiId || !b._commandIds) return null;

      const commands = [];
      const addCmd = (name, val) => {
        const id = b._commandIds[name];
        if (id != null) commands.push({ commandId: id, value: String(val) });
      };

      addCmd('on', 'on');
      if (brightness != null) addCmd('setBrightness', brightness);
      if (color)              addCmd('setColor', color);
      if (temp)               addCmd('setColorTemperature', temp);

      return { deviceUserId: Number(b._apiId), commands };
    }).filter(Boolean);
  }

  async function addScene(d) {
    const devices = _buildDevices(d.lampIds, d.locationIds, d.brightness, d.temp, d.color);
    await Api.scenes.create({ name:d.name, description:d.description||'', devices });

    // Re-busca para pegar o ID real da cena recém-criada
    try {
      const allScenes = await Api.scenes.getAll();
      const fresh = allScenes.find(s=>(s.name||s.Name)===d.name) || allScenes[allScenes.length-1];
      if (fresh) {
        const scene = _mapScene(fresh);
        scenes.push(scene);
        return scene;
      }
    } catch {}

    const scene = { id:uid(), name:d.name, desc:d.description||'', active:false, devices, _apiId:null };
    scenes.push(scene);
    return scene;
  }

  async function editScene(id, d) {
    const s = scenes.find(s=>s.id===id);
    if (!s) return;
    // O backend não tem PUT para scenes; recria excluindo a antiga
    if (s._apiId) {
      try { await Api.scenes.delete(s._apiId); } catch {}
    }
    scenes = scenes.filter(s=>s.id!==id);
    return addScene(d);
  }

  async function deleteScene(id) {
    const s = scenes.find(s=>s.id===id);
    if (s?._apiId) await Api.scenes.delete(s._apiId);
    scenes = scenes.filter(s=>s.id!==id);
  }

  async function activateScene(id) {
    const s = scenes.find(s=>s.id===id);
    if (!s) return;

    // Backend envia os comandos para o Fiware
    if (s._apiId) {
      try { await Api.scenes.activate(s._apiId); }
      catch(e) { console.warn('[scene activate]', e.message); }
    }

    // Atualiza estado local da UI
    scenes.forEach(x=>x.active=x.id===id);

    for (const devConfig of (s.devices||[])) {
      const b = bulbs.find(b=>Number(b._apiId)===devConfig.deviceUserId||b.id===devConfig.deviceUserId);
      if (!b) continue;
      b.on = true;
      for (const cmd of devConfig.commands) {
        // Resolve nome do comando a partir do mapa reverso
        const cmdName = Object.keys(b._commandIds||{}).find(k=>b._commandIds[k]===cmd.commandId);
        if (cmdName === 'on')                    b.on = true;
        else if (cmdName === 'off')               b.on = false;
        else if (cmdName === 'setBrightness')     b.brightness = parseInt(cmd.value)||b.brightness;
        else if (cmdName === 'setColor')          b.color = cmd.value||b.color;
        else if (cmdName === 'setColorTemperature') b.temp = cmd.value||b.temp;
      }
    }

    logCommand('Cena ativada: '+s.name, 'App');
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

  function addSchedule(d)     { const id=Date.now(); schedules.push({id,on:true,...d}); _startScheduler(); return id; }
  function editSchedule(id,d) { const s=schedules.find(s=>s.id===id); if(s) Object.assign(s,d); }
  function deleteSchedule(id) { schedules=schedules.filter(s=>s.id!==id); }
  function toggleSchedule(id) { const s=schedules.find(s=>s.id===id); if(s) s.on=!s.on; }

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
    get scenes()        { return scenes; },
    get schedules()     { return schedules; },
    get voiceCommands() { return voiceCommands; },
    get commandHistory(){ return commandHistory; },
    get energyHourly()  { return energyHourly; },

    uid, getBulbs, roomStats, totalPower, activeBulbs, activeScene, _sendCmd,
    loadFromApi, refreshBulb, _buildDevices,

    addRoom,    editRoom,    deleteRoom,
    addBulb,    deleteBulb,  renameBulb,  toggleBulb,  setBrightness, setColor, setTemp, toggleRoom,
    setParty,   isParty,
    addScene,   editScene,   deleteScene, activateScene,
    addSchedule,editSchedule,deleteSchedule,toggleSchedule,
    addVoiceCmd,editVoiceCmd,deleteVoiceCmd,executeVoice,
    logCommand,
  };
})();
