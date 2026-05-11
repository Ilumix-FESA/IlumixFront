/* ============================================================
   ILUMIX — Data Store v7
   Tudo vem da API. Comandos reais padronizados.
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
    const cmds     = lamp.commands||lamp.Commands||[];
    // Banco salva cor como "255,0,128" (RGB) ou "#RRGGBB" (hex) — normaliza para hex
    const _rgbToHex = s => '#' + s.split(',').map(v => parseInt(v.trim()).toString(16).padStart(2,'0')).join('');
    const colorHex  = colorRaw.startsWith('#') ? colorRaw
                    : colorRaw.includes(',')    ? _rgbToHex(colorRaw)
                    : '#FFFFFF';
    return {
      id:         lamp.id||lamp.Id||lamp._id,
      roomId:     lamp.locationId||lamp.LocationId||lamp.Location_id||null,
      name:       lamp.name||lamp.Name||'(sem nome)',
      on:         isOn,
      brightness: isNaN(briRaw)?100:Math.min(100,Math.max(0,briRaw)),
      color:      colorHex,
      temp:       getAttrVal('colortemperature','temperature')||'4000K',
      power:      0, status:'online',
      _apiId:     lamp.id||lamp.Id||lamp._id,
      _cmds:      cmds,
      _attrs:     attrs,
    };
  }

  function _mapScene(s) {
    return {
      id:         s.id||s.Id||s._id,
      name:       s.name||s.Name,
      icon:       s.ico||s.Ico||'scene',
      desc:       s.description||s.Description||'',
      brightness: s.brightness??s.Brightness??80,
      temp:       s.temp||s.Temp||'2700K',
      color:      s.color||s.Color||'#E2B84A',
      active:     s.active??s.Active??false,
      // lâmpadas e locations associadas à cena (para execução)
      lampSelecioned:     (s.lampSelecioned||s.LampSelecioned||[]).map(l=>({
        lampId:   l.lampId||l.LampId,
        commands: (l.commands||l.Commands||[]).map(c=>({
          commandId: c.commandId||c.CommandId,
          value:     c.value||c.Value,
        })),
      })),
      locationSelecioned: (s.locationSelecioned||s.LocationSelecioned||[]).map(l=>({
        locationId: l.locationId||l.LocationId,
        commands:   (l.commands||l.Commands||[]).map(c=>({
          commandId: c.commandId||c.CommandId,
          value:     c.value||c.Value,
        })),
      })),
      _apiId:     s.id||s.Id||s._id,
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
      const fresh = await Api.lamps.getById(b._apiId);
      const mapped = _mapLamp(fresh);
      mapped.roomId = b.roomId; // mantém o roomId local
      Object.assign(b, mapped);
      return b;
    } catch(e) { console.warn('[refreshBulb]', e.message); return b; }
  }

  /* ══════════════════════════════════════════════════════════
     SYNC — envia comando ao backend
     AGORA USANDO OS NOMES EXATOS DEFINIDOS NO SEU BACKEND
  ══════════════════════════════════════════════════════════ */
  async function _sendCmd(bulb, commandName, value) {
    if (!bulb._apiId || !commandName) return;
    try {
      await Api.lamps.command(bulb._apiId, commandName, String(value));
      logCommand(`${bulb.name} → ${commandName}: ${value}`);
    } catch(e) {
      console.error(`[Sync] ${commandName}:`, e.message);
      if (typeof toast==='function') toast('⚠️ '+bulb.name+': '+e.message);
    }
  }

  function _syncToggle(bulb) {
    // O backend espera o comando "on" ou "off"
    const cmd = bulb.on ? 'on' : 'off';
    _sendCmd(bulb, cmd, cmd);
  }

  function _syncBrightness(bulb) {
    _sendCmd(bulb, 'setBrightness', bulb.brightness);
  }

  function _syncColor(bulb) {
    _sendCmd(bulb, 'setColor', bulb.color);
  }

  function _syncTemp(bulb) {
    _sendCmd(bulb, 'setColorTemperature', bulb.temp);
  }

  /* ══════════════════════════════════════════════════════════
     ROOMS CRUD
  ══════════════════════════════════════════════════════════ */
  async function addRoom(name, icon) {
    const res  = await Api.locations.create(name, icon||'');
    const loc  = res.location||res;
    const room = _mapRoom(loc);
    room.icon  = icon||'bulb';
    rooms.push(room);
    return room;
  }

  async function editRoom(id, name, icon) {
    const r = rooms.find(r=>r.id===id);
    if (!r) return;
    await Api.locations.update(r._apiId||id, name, icon||r.icon||'');
    r.name=name; r.icon=icon||r.icon;
  }

  async function deleteRoom(id) {
    const r = rooms.find(r=>r.id===id);
    if (r?._apiId) await Api.locations.delete(r._apiId);
    rooms = rooms.filter(r=>r.id!==id);
    bulbs.filter(b=>b.roomId===id).forEach(b=>b.roomId=null);
  }

  /* ══════════════════════════════════════════════════════════
     BULBS CRUD
  ══════════════════════════════════════════════════════════ */
  async function addBulb(name, roomId, ico) {
    const createRes = await Api.lamps.create();
    const lampData  = createRes.lamp||createRes;
    const lampId    = lampData.id||lampData.Id||lampData._id;
    if (!lampId) throw new Error('Backend não retornou ID da lâmpada.');

    const room       = rooms.find(r=>r.id===roomId);
    const locationId = room?._apiId||'';
    await Api.lamps.configure(lampId, name, locationId, ico||'');

    let fullLamp;
    try { fullLamp = await Api.lamps.getById(lampId); } catch { fullLamp = lampData; }

    const bulb = _mapLamp(fullLamp);
    bulb.roomId = roomId;
    bulb.name   = name;
    bulbs.push(bulb);
    return bulb;
  }

  async function deleteBulb(id) {
    const b = bulbs.find(b=>b.id===id);
    if (b?._apiId) await Api.lamps.delete(b._apiId);
    bulbs = bulbs.filter(b=>b.id!==id);
  }

  async function renameBulb(id, name, roomId, ico) {
    const b    = bulbs.find(b=>b.id===id);
    if (!b) return;
    const room = rooms.find(r=>r.id===roomId);
    await Api.lamps.configure(b._apiId||id, name, room?._apiId||'', ico||'');
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
  ══════════════════════════════════════════════════════════ */
  function buildLampSelecioned(lampIds, locationIds, brightness, temp, color) {
    const allBulbIds = new Set(lampIds||[]);
    (locationIds||[]).forEach(rid => getBulbs(rid).forEach(b=>allBulbIds.add(b.id)));

    return [...allBulbIds].map(bid => {
      const b = bulbs.find(b=>b.id===bid);
      if (!b?._apiId) return null;
      
      // COMANDOS EXATOS COMO NO BACKEND:
      const commands = [
        { commandId: 'on', value: 'on' },
        { commandId: 'setBrightness', value: String(brightness) }
      ];
      if (color) commands.push({ commandId: 'setColor', value: color });
      if (temp)  commands.push({ commandId: 'setColorTemperature', value: temp });

      return { lampId: b._apiId, commands };
    }).filter(Boolean);
  }

  async function addScene(d) {
    const lampSel = buildLampSelecioned(d.lampIds, d.locationIds, d.brightness, d.temp, d.color);
    const res  = await Api.scenes.create({...d, lampSelecioned:lampSel, locationSelecioned:[]});
    const sData= res.scene||res;
    const scene= _mapScene(sData);
    Object.assign(scene, {
      name:d.name, icon:d.ico||'scene', desc:d.description||'',
      brightness:d.brightness, temp:d.temp, color:d.color,
    });
    scenes.push(scene);
    return scene;
  }

  async function editScene(id, d) {
    const s = scenes.find(s=>s.id===id);
    if (!s) return;
    const lampSel = buildLampSelecioned(d.lampIds, d.locationIds, d.brightness, d.temp, d.color);
    await Api.scenes.update(s._apiId||id, {...d, lampSelecioned:lampSel, locationSelecioned:[]});
    Object.assign(s, { name:d.name, icon:d.ico||s.icon, desc:d.description||s.desc,
      brightness:d.brightness, temp:d.temp, color:d.color });
  }

  async function deleteScene(id) {
    const s = scenes.find(s=>s.id===id);
    if (s?._apiId) await Api.scenes.delete(s._apiId);
    scenes = scenes.filter(s=>s.id!==id);
  }

  async function activateScene(id) {
    const s = scenes.find(s=>s.id===id);
    if (!s) return;

    if (s._apiId) {
      try { await Api.scenes.activate(s._apiId); } catch(e) { console.warn('[scene activate backend]',e.message); }
    }

    await _executeSceneOnLamps(s);

    scenes.forEach(x=>x.active=x.id===id);
    bulbs.filter(b=>b.on).forEach(b=>{
      b.brightness=s.brightness; b.color=s.color; b.temp=s.temp;
    });
    logCommand('Cena ativada: '+s.name, 'App');
  }

  async function _executeSceneOnLamps(scene) {
    const allCmds = [];

    if (scene.lampSelecioned?.length) {
      for (const ls of scene.lampSelecioned) {
        const b = bulbs.find(b=>b._apiId===ls.lampId||b.id===ls.lampId);
        if (!b) continue;
        for (const cmd of ls.commands) {
          allCmds.push({b, name:cmd.commandId, value:cmd.value});
        }
      }
    } else if (scene.locationSelecioned?.length) {
      for (const ls of scene.locationSelecioned) {
        const room = rooms.find(r=>r._apiId===ls.locationId||r.id===ls.locationId);
        if (!room) continue;
        for (const b of getBulbs(room.id)) {
          for (const cmd of ls.commands) allCmds.push({b, name:cmd.commandId, value:cmd.value});
        }
      }
    }

    if (!allCmds.length) {
      for (const b of bulbs.filter(b=>b.on)) {
        allCmds.push({b, name:'setBrightness', value:String(scene.brightness)});
        allCmds.push({b, name:'setColor', value:scene.color});
        allCmds.push({b, name:'setColorTemperature', value:scene.temp});
      }
    }

    for (const {b, name, value} of allCmds) {
      await _sendCmd(b, name, value);
    }
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
    const now  = new Date();
    const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const dow  = now.getDay(); 
    const dayIdx = dow===0 ? 6 : dow-1;

    for (const sched of schedules) {
      if (!sched.on) continue;
      if (sched.time !== hhmm) continue;
      if (sched.days && !sched.days[dayIdx]) continue;
      const key = `sched_last_${sched.id}`;
      const lastRan = sessionStorage.getItem(key);
      if (lastRan === hhmm) continue;
      sessionStorage.setItem(key, hhmm);

      console.log('[Scheduler] Executando:', sched.name, 'às', hhmm);
      await _executeSchedule(sched);
    }
  }

  async function _executeSchedule(sched) {
    try {
      if (sched.sceneId) {
        await activateScene(sched.sceneId);
        logCommand('Rotina: '+sched.name+' → cena ativada', 'Rotina');
        return;
      }
      const targetBulbs =
        sched.targetType==='room' ? getBulbs(sched.targetId) :
        sched.targetType==='bulb' ? bulbs.filter(b=>b.id===sched.targetId) :
        bulbs;

      for (const b of targetBulbs) {
        b.on = true;
        _syncToggle(b);
      }
      logCommand('Rotina: '+sched.name, 'Rotina');
    } catch(e) { console.error('[Scheduler] Erro:', e.message); }
  }

  /* ── Schedules CRUD ── */
  function addSchedule(d)     { const id=Date.now(); schedules.push({id,on:true,...d}); _startScheduler(); return id; }
  function editSchedule(id,d) { const s=schedules.find(s=>s.id===id); if(s){ Object.assign(s,d); } }
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
    loadFromApi, refreshBulb, buildLampSelecioned,

    addRoom,    editRoom,    deleteRoom,
    addBulb,    deleteBulb,  renameBulb,  toggleBulb,  setBrightness, setColor, setTemp, toggleRoom,
    setParty,   isParty,
    addScene,   editScene,   deleteScene, activateScene,
    addSchedule,editSchedule,deleteSchedule,toggleSchedule,
    addVoiceCmd,editVoiceCmd,deleteVoiceCmd,executeVoice,
    logCommand,
  };
})();