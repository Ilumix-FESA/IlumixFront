/* ============================================================
   ILUMIX — Data Store v4
   Dados reais do backend + fallback mock para desenvolvimento.
   ============================================================ */

const Data = (() => {

  /* ─── Mock inicial (fallback) ─── */
  let rooms = [
    { id:'sala',       name:'Sala de Estar',   icon:'sofa',    color:'#E2B84A' },
    { id:'quarto',     name:'Quarto Principal', icon:'bed',     color:'#8B72D4' },
    { id:'escritorio', name:'Escritório',       icon:'desk',    color:'#5BAD6A' },
  ];
  let bulbs = [
    { id:'b1', roomId:'sala',       name:'Luminária Central', on:true,  brightness:75, color:'#E2B84A', temp:'2700K', power:9,  ip:'192.168.1.101', rssi:-52, status:'online' },
    { id:'b2', roomId:'quarto',     name:'Plafon Teto',      on:false, brightness:30, color:'#E2B84A', temp:'2700K', power:5,  ip:'192.168.1.110', rssi:-58, status:'online' },
    { id:'b3', roomId:'escritorio', name:'Painel LED',       on:true,  brightness:90, color:'#F0E8D0', temp:'5000K', power:10, ip:'192.168.1.120', rssi:-45, status:'online' },
  ];
  let scenes = [
    { id:'s1', name:'Manhã Energizante', icon:'sun',  brightness:100, temp:'6500K', color:'#F0E8D0', desc:'Luz fria para o dia', active:false },
    { id:'s2', name:'Modo Noturno',      icon:'moon', brightness:20,  temp:'2700K', color:'#E2B84A', desc:'Relaxar',             active:true  },
    { id:'s3', name:'Foco Total',        icon:'focus',brightness:80,  temp:'5000K', color:'#F0E8D0', desc:'Produtividade',       active:false },
  ];
  let schedules = [
    { id:1, time:'06:30', name:'Despertar Suave', days:[1,1,1,1,1,0,0], sceneId:'s1', targetType:'all', targetId:null, on:true },
    { id:2, time:'22:30', name:'Boa Noite',       days:[1,1,1,1,1,1,1], sceneId:'s2', targetType:'all', targetId:null, on:true },
  ];
  let voiceCommands = [
    { id:'v1', phrase:'Apagar tudo', icon:'off',  action:'all_off', roomId:null, bulbId:null, sceneId:null },
    { id:'v2', phrase:'Modo cinema', icon:'film', action:'scene',   roomId:null, bulbId:null, sceneId:'s2' },
  ];
  let commandHistory = [
    { time:'21:40', cmd:'Ativar: Modo Noturno', source:'App' },
  ];
  let partyRooms  = {};
  let wifiNetwork = { ssid:'Casa_2.4G', password:'', gateway:'192.168.1.1' };

  const energyHourly = [
    {label:'0h',v:0.02},{label:'3h',v:0.01},{label:'6h',v:0.08},{label:'9h',v:0.15},
    {label:'12h',v:0.18},{label:'15h',v:0.22},{label:'18h',v:0.20},{label:'21h',v:0.12},
  ];

  /* ── helpers ── */
  function uid() { return '_'+Math.random().toString(36).slice(2,9); }
  function getBulbs(roomId)  { return bulbs.filter(b=>b.roomId===roomId); }
  function roomStats(roomId) {
    const rb=getBulbs(roomId), on=rb.filter(b=>b.on);
    return { total:rb.length, active:on.length,
      power:rb.reduce((s,b)=>s+(b.on?b.power:0),0),
      avgBri:on.length?Math.round(on.reduce((s,b)=>s+b.brightness,0)/on.length):0 };
  }
  function totalPower()  { return bulbs.reduce((s,b)=>s+(b.on?b.power:0),0); }
  function activeBulbs() { return bulbs.filter(b=>b.on).length; }
  function activeScene() { return scenes.find(s=>s.active)||null; }

  /* ══════════════════════════════════════════════════════════
     API INTEGRATION — carrega dados reais do backend
  ══════════════════════════════════════════════════════════ */
  async function loadFromApi() {
    await Promise.allSettled([loadLocations(), loadLamps(), loadScenes()]);
  }

  async function loadLocations() {
    try {
      const data = await Api.locations.getAll();
      if (!Array.isArray(data) || data.length === 0) return;
      rooms = data.map(loc => ({
        id:     loc.id   || loc._id,
        name:   loc.name || loc.Name || 'Cômodo',
        icon:   loc.ico  || 'bulb',
        color:  '#E2B84A',
        _apiId: loc.id   || loc._id,
      }));
    } catch(e) { console.warn('[Data] locations fallback:', e.message); }
  }

  async function loadLamps() {
    try {
      const data = await Api.lamps.getAll();
      if (!Array.isArray(data) || data.length === 0) return;
      bulbs = data.map(lamp => {
        const attrs = lamp.attributes || lamp.Attributes || [];
        const getAttr = (...keys) => {
          for (const k of keys) {
            const a = attrs.find(a =>
              (a.name||a.Name||'').toLowerCase() === k.toLowerCase() ||
              (a.attributeId||a.AttributeId||a.atributo_Id||'') === k
            );
            if (a) return a.value ?? a.Value ?? '';
          }
          return null;
        };
        const stateRaw = getAttr('state','power','estado') || 'off';
        const isOn     = ['on','true','1'].includes(stateRaw.toLowerCase());
        const bri      = parseInt(getAttr('luminosity','brightness','brilho') || '100');
        const colorRaw = getAttr('color','cor') || '#FFFFFF';
        const colorMap = { white:'#FFFFFF',warm:'#FFD580',cool:'#CCE5FF',red:'#FF4040',blue:'#4080FF',green:'#40C080' };
        const colorVal = colorRaw.startsWith('#') ? colorRaw : (colorMap[colorRaw.toLowerCase()]||'#FFFFFF');
        const cmds     = lamp.commands || lamp.Commands || [];
        return {
          id:         lamp.id || lamp._id,
          roomId:     lamp.locationId || lamp.Location_id || null,
          name:       lamp.name || lamp.Name || 'Lâmpada',
          on:         isOn,
          brightness: isNaN(bri) ? 100 : bri,
          color:      colorVal,
          temp:       getAttr('temperature','colortemperature') || '4000K',
          power:      0,
          ip:         null,
          rssi:       null,
          status:     'online',
          _apiId:     lamp.id || lamp._id,
          _commands:  cmds,
          _attrs:     attrs,
        };
      });
    } catch(e) { console.warn('[Data] lamps fallback:', e.message); }
  }

  async function loadScenes() {
    try {
      const data = await Api.scenes.getAll();
      if (!Array.isArray(data) || data.length === 0) return;
      scenes = data.map(s => ({
        id:         s.id || s._id,
        name:       s.name || s.Name || 'Cena',
        icon:       s.ico  || 'scene',
        desc:       s.description || '',
        brightness: s.brightness  ?? 80,
        temp:       s.temp        || '2700K',
        color:      s.color       || '#E2B84A',
        active:     s.active      ?? false,
        _apiId:     s.id || s._id,
      }));
    } catch(e) { console.warn('[Data] scenes fallback:', e.message); }
  }

  /* ── Sync helpers ─────────────────────────────────────────── */
  async function syncToggle(bulb) {
    try {
      if (!bulb._apiId) return;
      const name = bulb.on ? 'on' : 'off';
      await Api.lamps.command(bulb._apiId, name, bulb.on ? 'On' : 'Off');
    } catch(e) { console.warn('[Data] toggle sync:', e.message); }
  }
  async function syncBrightness(bulb) {
    try {
      if (!bulb._apiId) return;
      await Api.lamps.command(bulb._apiId, 'setBrightness', String(bulb.brightness));
    } catch(e) { console.warn('[Data] brightness sync:', e.message); }
  }
  async function syncColor(bulb) {
    try {
      if (!bulb._apiId) return;
      await Api.lamps.command(bulb._apiId, 'setColor', bulb.color);
    } catch(e) { console.warn('[Data] color sync:', e.message); }
  }

  /* ══════════════════════════════════════════════════════════
     MUTATORS — Rooms (sincronizado com API)
  ══════════════════════════════════════════════════════════ */
  async function addRoom(name, iconKey, color) {
    try {
      const res = await Api.locations.create(name, iconKey||'bulb');
      const newRoom = {
        id:     res.location?.id || res.location?._id || uid(),
        name,
        icon:   iconKey || 'bulb',
        color:  color   || '#E2B84A',
        _apiId: res.location?.id || res.location?._id,
      };
      rooms.push(newRoom);
      return newRoom.id;
    } catch(e) {
      console.warn('[Data] addRoom API error:', e.message);
      const id = uid();
      rooms.push({ id, name, icon: iconKey||'bulb', color: color||'#E2B84A' });
      return id;
    }
  }
  async function editRoom(id, data) {
    const r = rooms.find(r=>r.id===id);
    if (!r) return;
    Object.assign(r, data);
    try {
      if (r._apiId) await Api.locations.update(r._apiId, r.name, r.ico||r.icon||'');
    } catch(e) { console.warn('[Data] editRoom API:', e.message); if(typeof toast==='function') toast('Erro ao editar cômodo: '+e.message); }
  }
  async function deleteRoom(id) {
    const r = rooms.find(r=>r.id===id);
    rooms = rooms.filter(r=>r.id!==id);
    bulbs = bulbs.filter(b=>b.roomId!==id);
    try {
      if (r?._apiId) await Api.locations.delete(r._apiId);
    } catch(e) { console.warn('[Data] deleteRoom API:', e.message); if(typeof toast==='function') toast('Erro ao excluir cômodo: '+e.message); }
  }

  /* ══════════════════════════════════════════════════════════
     MUTATORS — Bulbs
  ══════════════════════════════════════════════════════════ */
  async function addBulb(roomId, name, data={}) {
    try {
      const res = await Api.lamps.create();
      const lampId = res.lamp?.id || res.lamp?._id;
      if (lampId) {
        const room = rooms.find(r=>r.id===roomId);
        await Api.lamps.configure(lampId, name, room?._apiId||roomId, '');
      }
      const newBulb = {
        id:roomId+'_'+Date.now(), roomId, name,
        on:false, brightness:100, color:'#FFFFFF', temp:'4000K', power:5,
        ip:null, rssi:null, status:'offline',
        _apiId: lampId, ...data
      };
      bulbs.push(newBulb);
      return newBulb.id;
    } catch(e) {
      console.warn('[Data] addBulb API:', e.message);
      if(typeof toast==='function') toast('Erro ao salvar lâmpada: '+e.message);
      const id = uid();
      bulbs.push({ id, roomId, name, on:false, brightness:100, color:'#FFFFFF', temp:'4000K', power:5, ip:null, rssi:null, status:'offline', ...data });
      return id;
    }
  }
  function editBulb(id, data)  { const b=bulbs.find(b=>b.id===id); if(b) Object.assign(b,data); }
  async function deleteBulb(id) {
    const b = bulbs.find(b=>b.id===id);
    bulbs = bulbs.filter(b=>b.id!==id);
    try { if(b?._apiId) await Api.lamps.delete(b._apiId); }
    catch(e) { console.warn('[Data] deleteBulb API:', e.message); }
  }
  function toggleBulb(id)      { const b=bulbs.find(b=>b.id===id); if(b){ b.on=!b.on; syncToggle(b); } }
  function setBrightness(id,v) { const b=bulbs.find(b=>b.id===id); if(b){ b.brightness=Math.max(0,Math.min(100,v)); syncBrightness(b); } }
  function setColor(id,c)      { const b=bulbs.find(b=>b.id===id); if(b){ b.color=c; syncColor(b); } }
  function setTemp(id,t)       { const b=bulbs.find(b=>b.id===id); if(b) b.temp=t; }
  function toggleRoom(roomId)  {
    const rb=getBulbs(roomId), anyOn=rb.some(b=>b.on);
    rb.forEach(b=>{ b.on=!anyOn; syncToggle(b); });
  }

  /* ── Party ── */
  function setParty(roomId,val){ partyRooms[roomId]=val; }
  function isParty(roomId)     { return !!partyRooms[roomId]; }

  /* ══════════════════════════════════════════════════════════
     MUTATORS — Scenes (sincronizado com API)
  ══════════════════════════════════════════════════════════ */
  async function addScene(data) {
    try {
      const res = await Api.scenes.create(data);
      const s   = res.scene;
      const newScene = {
        id:         s?.id || s?._id || uid(),
        name:       data.name,
        icon:       data.icon  || 'scene',
        desc:       data.desc  || '',
        brightness: data.brightness || 80,
        temp:       data.temp  || '2700K',
        color:      data.color || '#E2B84A',
        active:     false,
        _apiId:     s?.id || s?._id,
      };
      scenes.push(newScene);
      return newScene.id;
    } catch(e) {
      console.warn('[Data] addScene API:', e.message);
      if(typeof toast==='function') toast('Erro ao salvar cena: '+e.message);
      const id = uid();
      scenes.push({ id, active:false, ...data });
      return id;
    }
  }
  async function editScene(id, data) {
    const s = scenes.find(s=>s.id===id);
    if (s) Object.assign(s, data);
    try {
      if (s?._apiId) await Api.scenes.update(s._apiId, data);
    } catch(e) { console.warn('[Data] editScene API:', e.message); if(typeof toast==='function') toast('Erro ao editar cena: '+e.message); }
  }
  async function deleteScene(id) {
    const s = scenes.find(s=>s.id===id);
    scenes = scenes.filter(s=>s.id!==id);
    try { if(s?._apiId) await Api.scenes.delete(s._apiId); }
    catch(e) { console.warn('[Data] deleteScene API:', e.message); }
  }
  async function activateScene(id) {
    scenes.forEach(s=>s.active=s.id===id);
    const s = scenes.find(s=>s.id===id);
    // Aplica propriedades visuais nas lâmpadas localmente
    if (s) {
      bulbs.filter(b=>b.on).forEach(b=>{
        b.brightness = s.brightness;
        b.color      = s.color;
        b.temp       = s.temp;
      });
    }
    try {
      if (s?._apiId) await Api.scenes.activate(s._apiId);
    } catch(e) { console.warn('[Data] activateScene API:', e.message); }
  }

  /* ── Schedules ── */
  function addSchedule(data)        { const id=Date.now(); schedules.push({id,on:true,...data}); return id; }
  function editSchedule(id,data)    { const s=schedules.find(s=>s.id===id); if(s) Object.assign(s,data); }
  function deleteSchedule(id)       { schedules=schedules.filter(s=>s.id!==id); }
  function toggleSchedule(id)       { const s=schedules.find(s=>s.id===id); if(s) s.on=!s.on; }

  /* ── Voice ── */
  function addVoiceCmd(data)        { const id=uid(); voiceCommands.push({id,...data}); return id; }
  function editVoiceCmd(id,data)    { const v=voiceCommands.find(v=>v.id===id); if(v) Object.assign(v,data); }
  function deleteVoiceCmd(id)       { voiceCommands=voiceCommands.filter(v=>v.id!==id); }
  function executeVoice(vc) {
    switch(vc.action){
      case 'all_off':     bulbs.forEach(b=>{b.on=false;syncToggle(b);}); break;
      case 'all_on':      bulbs.forEach(b=>{b.on=true; syncToggle(b);}); break;
      case 'toggle_room': if(vc.roomId)  toggleRoom(vc.roomId);  break;
      case 'toggle_bulb': if(vc.bulbId)  toggleBulb(vc.bulbId);  break;
      case 'scene':       if(vc.sceneId) activateScene(vc.sceneId); break;
    }
    logCommand(`Voz: "${vc.phrase}"`, 'Voz');
  }

  function logCommand(cmd, source='App') {
    commandHistory.unshift({
      time: new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
      cmd, source,
    });
    if (commandHistory.length > 50) commandHistory.pop();
  }

  /* Public */
  return {
    get rooms()         { return rooms; },
    get bulbs()         { return bulbs; },
    get scenes()        { return scenes; },
    get schedules()     { return schedules; },
    get voiceCommands() { return voiceCommands; },
    get commandHistory(){ return commandHistory; },
    get wifiNetwork()   { return wifiNetwork; },
    get energyHourly()  { return energyHourly; },

    uid, getBulbs, roomStats, totalPower, activeBulbs, activeScene,
    loadFromApi,

    addRoom,    editRoom,    deleteRoom,
    addBulb,    editBulb,    deleteBulb,    toggleBulb, setBrightness, setColor, setTemp, toggleRoom,
    setParty,   isParty,
    addScene,   editScene,   deleteScene,   activateScene,
    addSchedule,editSchedule,deleteSchedule,toggleSchedule,
    addVoiceCmd,editVoiceCmd,deleteVoiceCmd,executeVoice,
    logCommand,
  };
})();
