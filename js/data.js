/* ============================================================
   ILUMIX — Data Store v7
   Tudo vem da API. Comandos reais. Schedule executor incluído.
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

  /* ── Encontra Name do comando na lista de comandos da lâmpada ── */
  function _findCmd(cmds, ...possibleNames) {
    for (const n of possibleNames) {
      const c = cmds.find(c=>(c.name||c.Name||'').toLowerCase()===n.toLowerCase());
      if (c) return (c.name||c.Name).toLowerCase();
    }
    return null;
  }

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
    const stateRaw = getAttrVal('status','state','power')||'off';
    const isOn     = ['on','true','1','yes'].includes(stateRaw.toLowerCase());
    const briRaw   = parseInt(getAttrVal('brightness','luminosity')||'100');
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
    const name = bulb.on
      ? _findCmd(bulb._cmds,'on','Switch state','power on','ligar')
      : _findCmd(bulb._cmds,'off','Switch state','power off','desligar');
    if (name) _sendCmd(bulb, name, bulb.on?'On':'Off');
  }

  function _syncBrightness(bulb) {
    const name = _findCmd(bulb._cmds,'setbrightness','Set Brightness','brightness','brilho','luminosidade');
    if (name) _sendCmd(bulb, name, bulb.brightness);
  }

  function _syncColor(bulb) {
    const name = _findCmd(bulb._cmds,'setcolor','Set Color','color','cor');
    if (name) _sendCmd(bulb, name, bulb.color);
  }

  function _syncTemp(bulb) {
    const name = _findCmd(bulb._cmds,'setcolortemperature','Set Color Temperature','colortemperature','temperatura');
    if (name) _sendCmd(bulb, name, bulb.temp);
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
     Fluxo: POST /api/lamp → PUT /api/lamp/{id}/configure
  ══════════════════════════════════════════════════════════ */
  async function addBulb(name, roomId, ico) {
    // 1. Cria a lâmpada (backend gera commands e attributes)
    const createRes = await Api.lamps.create();
    const lampData  = createRes.lamp||createRes;
    const lampId    = lampData.id||lampData.Id||lampData._id;
    if (!lampId) throw new Error('Backend não retornou ID da lâmpada.');

    // 2. Configura nome + localização
    const room       = rooms.find(r=>r.id===roomId);
    const locationId = room?._apiId||'';
    await Api.lamps.configure(lampId, name, locationId, ico||'');

    // 3. Busca lâmpada completa com commands
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

  /* Constrói os LampSelecioned a partir das lâmpadas/rooms escolhidas e das settings da cena */
  function buildLampSelecioned(lampIds, locationIds, brightness, temp, color) {
    const allBulbIds = new Set(lampIds||[]);
    // Adiciona todas as lâmpadas dos rooms selecionados
    (locationIds||[]).forEach(rid => getBulbs(rid).forEach(b=>allBulbIds.add(b.id)));

    return [...allBulbIds].map(bid => {
      const b = bulbs.find(b=>b.id===bid);
      if (!b?._apiId) return null;
      const commands = [];
      // Liga a lâmpada
      const onCmd = _findCmd(b._cmds,'on','Switch state','ligar');
      if (onCmd) commands.push({ commandId:onCmd, value:'On' });
      // Brilho
      const briCmd = _findCmd(b._cmds,'setbrightness','Set Brightness','brightness');
      if (briCmd) commands.push({ commandId:briCmd, value:String(brightness) });
      // Cor
      const colCmd = _findCmd(b._cmds,'setcolor','Set Color','color');
      if (colCmd) commands.push({ commandId:colCmd, value:color });
      // Temperatura
      const tmpCmd = _findCmd(b._cmds,'setcolortemperature','Set Color Temperature','colortemperature');
      if (tmpCmd) commands.push({ commandId:tmpCmd, value:temp });
      return { lampId: b._apiId, commands };
    }).filter(Boolean);
  }

  async function addScene(d) {
    const lampSel = buildLampSelecioned(d.lampIds, d.locationIds, d.brightness, d.temp, d.color);
    const res  = await Api.scenes.create({...d, lampSelecioned:lampSel, locationSelecioned:[]});
    const sData= res.scene||res;
    const scene= _mapScene(sData);
    // garante os campos visuais mesmo que o backend não retorne completo
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

    // 1. Chama backend (marca ativo + executa LampSelecioned via Fiware se configurado)
    if (s._apiId) {
      try { await Api.scenes.activate(s._apiId); } catch(e) { console.warn('[scene activate backend]',e.message); }
    }

    // 2. Frontend executa diretamente nas lâmpadas (garante funcionamento mesmo sem Fiware)
    await _executeSceneOnLamps(s);

    // 3. Atualiza estado local
    scenes.forEach(x=>x.active=x.id===id);
    bulbs.filter(b=>b.on).forEach(b=>{
      b.brightness=s.brightness; b.color=s.color; b.temp=s.temp;
    });
    logCommand('Cena ativada: '+s.name, 'App');
  }

  async function _executeSceneOnLamps(scene) {
    // Executa comandos em cada lâmpada associada à cena
    const allCmds = []; // {bulb, commandName, value}

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
    // Se a cena não tem lâmpadas associadas, aplica em todas as lâmpadas acesas
    if (!allCmds.length) {
      for (const b of bulbs.filter(b=>b.on)) {
        const briCmd = _findCmd(b._cmds,'setbrightness','Set Brightness');
        const colCmd = _findCmd(b._cmds,'setcolor','Set Color');
        const tmpCmd = _findCmd(b._cmds,'setcolortemperature','Set Color Temperature','colortemperature');
        if (briCmd) allCmds.push({b, name:briCmd, value:String(scene.brightness)});
        if (colCmd) allCmds.push({b, name:colCmd, value:scene.color});
        if (tmpCmd) allCmds.push({b, name:tmpCmd, value:scene.temp});
      }
    }

    // Envia os comandos
    for (const {b, name, value} of allCmds) {
      await _sendCmd(b, name, value);
    }
  }

  /* ══════════════════════════════════════════════════════════
     SCHEDULE EXECUTOR
  ══════════════════════════════════════════════════════════ */
  function _startScheduler() {
    if (_schedTimer) clearInterval(_schedTimer);
    _checkSchedules(); // executa imediatamente no load
    _schedTimer = setInterval(_checkSchedules, 60_000); // verifica a cada minuto
  }

  async function _checkSchedules() {
    const now  = new Date();
    const hhmm = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
    const dow  = now.getDay(); // 0=Dom, 1=Seg...
    // Converte para índice do array [Seg,Ter,Qua,Qui,Sex,Sáb,Dom] = [0..6]
    const dayIdx = dow===0 ? 6 : dow-1;

    for (const sched of schedules) {
      if (!sched.on) continue;
      if (sched.time !== hhmm) continue;
      if (sched.days && !sched.days[dayIdx]) continue;
      // Evita executar duas vezes no mesmo minuto
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
      // Ativa a cena se configurada
      if (sched.sceneId) {
        await activateScene(sched.sceneId);
        logCommand('Rotina: '+sched.name+' → cena ativada', 'Rotina');
        return;
      }
      // Aplica ação genérica no target
      const targetBulbs =
        sched.targetType==='room' ? getBulbs(sched.targetId) :
        sched.targetType==='bulb' ? bulbs.filter(b=>b.id===sched.targetId) :
        bulbs;

      for (const b of targetBulbs) {
        // Por padrão, liga as lâmpadas
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
