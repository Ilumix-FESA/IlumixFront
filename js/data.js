/* ============================================================
   ILUMIX — Data Store v3
   Complete, flat, mutable arrays — no classes.
   In production, swap mutators for API calls.
   ============================================================ */

const Data = (() => {

  /* ─── Rooms ─── */
  let rooms = [
    { id: 'sala',       name: 'Sala de Estar',    icon: 'sofa',     color: '#E2B84A' },
    { id: 'quarto',     name: 'Quarto Principal',  icon: 'bed',      color: '#8B72D4' },
    { id: 'escritorio', name: 'Escritório',        icon: 'desk',     color: '#5BAD6A' },
    { id: 'cozinha',    name: 'Cozinha',           icon: 'kitchen',  color: '#5B9FD4' },
    { id: 'banheiro',   name: 'Banheiro',          icon: 'bath',     color: '#D4A832' },
    { id: 'garagem',    name: 'Garagem',           icon: 'garage',   color: '#948E76' },
  ];

  /* ─── Bulbs ─── */
  let bulbs = [
    { id: 'b1',  roomId: 'sala',       name: 'Luminária Central',   on: true,  brightness: 75, color: '#E2B84A', temp: '2700K', power: 9,  ip: '192.168.1.101', rssi: -52, status: 'online' },
    { id: 'b2',  roomId: 'sala',       name: 'Spot Sofá',           on: true,  brightness: 60, color: '#E2B84A', temp: '2700K', power: 3,  ip: '192.168.1.102', rssi: -61, status: 'online' },
    { id: 'b3',  roomId: 'sala',       name: 'Fita LED Painel',     on: false, brightness: 40, color: '#FF6B35', temp: '2200K', power: 2,  ip: '192.168.1.103', rssi: -74, status: 'online' },
    { id: 'b4',  roomId: 'quarto',     name: 'Plafon Teto',         on: true,  brightness: 30, color: '#E2B84A', temp: '2700K', power: 5,  ip: '192.168.1.110', rssi: -58, status: 'online' },
    { id: 'b5',  roomId: 'quarto',     name: 'Abajur Mesa',         on: true,  brightness: 20, color: '#FFB347', temp: '2200K', power: 1,  ip: '192.168.1.111', rssi: -63, status: 'online' },
    { id: 'b6',  roomId: 'escritorio', name: 'Painel LED',          on: true,  brightness: 90, color: '#F0E8D0', temp: '5000K', power: 10, ip: '192.168.1.120', rssi: -45, status: 'online' },
    { id: 'b7',  roomId: 'escritorio', name: 'Luminária Mesa',      on: true,  brightness: 85, color: '#F0E8D0', temp: '5000K', power: 2,  ip: '192.168.1.121', rssi: -49, status: 'online' },
    { id: 'b8',  roomId: 'cozinha',    name: 'Teto Principal',      on: false, brightness: 100,color: '#FFFFFF', temp: '4000K', power: 0,  ip: '192.168.1.130', rssi: -70, status: 'online' },
    { id: 'b9',  roomId: 'cozinha',    name: 'Spot Bancada',        on: false, brightness: 80, color: '#FFFFFF', temp: '4000K', power: 0,  ip: null,            rssi: null,status: 'offline' },
    { id: 'b10', roomId: 'cozinha',    name: 'Fita Under Cabinet',  on: false, brightness: 50, color: '#FFD700', temp: '3000K', power: 0,  ip: null,            rssi: null,status: 'offline' },
    { id: 'b11', roomId: 'banheiro',   name: 'Espelho',             on: false, brightness: 100,color: '#FFFFFF', temp: '6500K', power: 0,  ip: '192.168.1.140', rssi: -66, status: 'online' },
    { id: 'b12', roomId: 'garagem',    name: 'Lâmpada Teto 1',     on: false, brightness: 100,color: '#FFFFFF', temp: '4000K', power: 0,  ip: '192.168.1.150', rssi: -80, status: 'online' },
    { id: 'b13', roomId: 'garagem',    name: 'Lâmpada Teto 2',     on: false, brightness: 100,color: '#FFFFFF', temp: '4000K', power: 0,  ip: null,            rssi: null,status: 'offline' },
  ];

  /* ─── Party mode state ─── */
  let partyRooms = {};

  /* ─── Scenes ─── */
  let scenes = [
    { id: 's1', name: 'Manhã Energizante', icon: 'sun',    brightness: 100, temp: '6500K', color: '#F0E8D0', desc: 'Luz fria e intensa para o dia', active: false },
    { id: 's2', name: 'Modo Noturno',      icon: 'moon',   brightness: 20,  temp: '2700K', color: '#E2B84A', desc: 'Luz quente e suave para relaxar', active: true  },
    { id: 's3', name: 'Foco Total',        icon: 'focus',  brightness: 80,  temp: '5000K', color: '#F0E8D0', desc: 'Equilibrada para produtividade', active: false },
    { id: 's4', name: 'Cinema em Casa',    icon: 'film',   brightness: 5,   temp: '2200K', color: '#FF6B35', desc: 'Ambiente cinematográfico', active: false },
    { id: 's5', name: 'Jantar Especial',   icon: 'dinner', brightness: 40,  temp: '2700K', color: '#E2B84A', desc: 'Âmbar suave para refeições', active: false },
    { id: 's6', name: 'Modo Festa',        icon: 'party',  brightness: 100, temp: '2200K', color: '#FF00FF', desc: 'Cores vibrantes e animação', active: false },
  ];

  /* ─── Schedules ─── */
  let schedules = [
    { id: 1, time: '06:30', name: 'Despertar Suave',  desc: 'Luminosidade gradual',        days: [1,1,1,1,1,0,0], sceneId: 's1', targetType: 'all',  targetId: null, on: true  },
    { id: 2, time: '08:00', name: 'Modo Trabalho',    desc: 'Foco no escritório',          days: [1,1,1,1,1,0,0], sceneId: 's3', targetType: 'room', targetId: 'escritorio', on: true  },
    { id: 3, time: '19:00', name: 'Modo Tarde',       desc: 'Temperatura mais quente',     days: [1,1,1,1,1,1,1], sceneId: 's5', targetType: 'all',  targetId: null, on: true  },
    { id: 4, time: '22:30', name: 'Boa Noite',        desc: 'Desliga tudo exceto quarto',  days: [1,1,1,1,1,1,1], sceneId: 's2', targetType: 'room', targetId: 'quarto', on: true  },
  ];

  /* ─── Voice commands ─── */
  let voiceCommands = [
    { id: 'v1', phrase: 'Apagar tudo',  icon: 'off',    action: 'all_off',      roomId: null, bulbId: null, sceneId: null },
    { id: 'v2', phrase: 'Modo cinema',  icon: 'film',   action: 'scene',        roomId: null, bulbId: null, sceneId: 's4' },
    { id: 'v3', phrase: 'Luz da sala',  icon: 'toggle', action: 'toggle_room',  roomId: 'sala', bulbId: null, sceneId: null },
  ];

  /* ─── Command history ─── */
  let commandHistory = [
    { time: '21:40', cmd: 'Ativar: Modo Noturno', source: 'App' },
    { time: '21:12', cmd: 'Desligar: Cozinha',    source: 'App' },
    { time: '20:45', cmd: 'Brilho 80% — Sala',    source: 'Voz' },
    { time: '19:00', cmd: 'Modo Tarde (rotina)',   source: 'Rotina' },
  ];

  /* ─── Wifi network ─── */
  let wifiNetwork = { ssid: 'Casa_2.4G', password: '', gateway: '192.168.1.1' };

  /* ─── Energy mock ─── */
  const energyHourly = [
    {label:'0h',v:0.02},{label:'3h',v:0.01},{label:'6h',v:0.08},{label:'9h',v:0.15},
    {label:'12h',v:0.18},{label:'15h',v:0.22},{label:'18h',v:0.20},{label:'21h',v:0.12},
  ];

  /* ═══ HELPERS ═══ */
  function uid() { return '_' + Math.random().toString(36).slice(2,9); }

  function getBulbs(roomId) { return bulbs.filter(b => b.roomId === roomId); }

  function roomStats(roomId) {
    const rb = getBulbs(roomId);
    const on = rb.filter(b => b.on);
    return {
      total: rb.length,
      active: on.length,
      power: rb.reduce((s,b) => s + (b.on ? b.power : 0), 0),
      avgBri: on.length ? Math.round(on.reduce((s,b) => s + b.brightness, 0) / on.length) : 0,
    };
  }

  function totalPower() { return bulbs.reduce((s,b) => s + (b.on ? b.power : 0), 0); }
  function activeBulbs() { return bulbs.filter(b => b.on).length; }
  function activeScene() { return scenes.find(s => s.active) || null; }

  /* ═══ MUTATORS — Rooms ═══ */
  function addRoom(name, icon, color) {
    const id = uid();
    rooms.push({ id, name, icon: icon || 'bulb', color: color || '#E2B84A' });
    return id;
  }
  function editRoom(id, data) {
    const r = rooms.find(r => r.id === id);
    if (r) Object.assign(r, data);
  }
  function deleteRoom(id) {
    rooms = rooms.filter(r => r.id !== id);
    bulbs = bulbs.filter(b => b.roomId !== id);
  }

  /* ═══ MUTATORS — Bulbs ═══ */
  function addBulb(roomId, name, data={}) {
    const id = uid();
    bulbs.push({ id, roomId, name, on: false, brightness: 100, color: '#FFFFFF', temp: '4000K', power: 5, ip: null, rssi: null, status: 'offline', ...data });
    return id;
  }
  function editBulb(id, data)  { const b = bulbs.find(b=>b.id===id); if(b) Object.assign(b,data); }
  function deleteBulb(id)      { bulbs = bulbs.filter(b=>b.id!==id); }
  function toggleBulb(id)      { const b = bulbs.find(b=>b.id===id); if(b) b.on=!b.on; }
  function setBrightness(id,v) { const b = bulbs.find(b=>b.id===id); if(b) b.brightness=Math.max(0,Math.min(100,v)); }
  function setColor(id,c)      { const b = bulbs.find(b=>b.id===id); if(b) b.color=c; }
  function setTemp(id,t)       { const b = bulbs.find(b=>b.id===id); if(b) b.temp=t; }

  function toggleRoom(roomId) {
    const rb = getBulbs(roomId);
    const anyOn = rb.some(b=>b.on);
    rb.forEach(b=>b.on=!anyOn);
  }

  /* ═══ MUTATORS — Party ═══ */
  function setParty(roomId, val) { partyRooms[roomId] = val; }
  function isParty(roomId) { return !!partyRooms[roomId]; }

  /* ═══ MUTATORS — Scenes ═══ */
  function addScene(data) {
    const id = uid();
    scenes.push({ id, active: false, ...data });
    return id;
  }
  function editScene(id, data) { const s=scenes.find(s=>s.id===id); if(s) Object.assign(s,data); }
  function deleteScene(id)     { scenes=scenes.filter(s=>s.id!==id); }
  function activateScene(id)   { scenes.forEach(s=>s.active=s.id===id); }

  /* ═══ MUTATORS — Schedules ═══ */
  function addSchedule(data) {
    const id = Date.now();
    schedules.push({ id, on: true, ...data });
    return id;
  }
  function editSchedule(id, data) { const s=schedules.find(s=>s.id===id); if(s) Object.assign(s,data); }
  function deleteSchedule(id)     { schedules=schedules.filter(s=>s.id!==id); }
  function toggleSchedule(id)     { const s=schedules.find(s=>s.id===id); if(s) s.on=!s.on; }

  /* ═══ MUTATORS — Voice ═══ */
  function addVoiceCmd(data) {
    const id = uid();
    voiceCommands.push({ id, ...data });
    return id;
  }
  function editVoiceCmd(id, data) { const v=voiceCommands.find(v=>v.id===id); if(v) Object.assign(v,data); }
  function deleteVoiceCmd(id)     { voiceCommands=voiceCommands.filter(v=>v.id!==id); }

  function executeVoice(vc) {
    switch(vc.action) {
      case 'all_off':     bulbs.forEach(b=>b.on=false); break;
      case 'all_on':      bulbs.forEach(b=>b.on=true);  break;
      case 'toggle_room': if(vc.roomId) toggleRoom(vc.roomId); break;
      case 'toggle_bulb': if(vc.bulbId) toggleBulb(vc.bulbId); break;
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
    get rooms()    { return rooms; },
    get bulbs()    { return bulbs; },
    get scenes()   { return scenes; },
    get schedules(){ return schedules; },
    get voiceCommands() { return voiceCommands; },
    get commandHistory(){ return commandHistory; },
    get wifiNetwork()   { return wifiNetwork; },
    get energyHourly()  { return energyHourly; },

    uid, getBulbs, roomStats, totalPower, activeBulbs, activeScene,

    addRoom, editRoom, deleteRoom,
    addBulb, editBulb, deleteBulb, toggleBulb, setBrightness, setColor, setTemp, toggleRoom,
    setParty, isParty,
    addScene, editScene, deleteScene, activateScene,
    addSchedule, editSchedule, deleteSchedule, toggleSchedule,
    addVoiceCmd, editVoiceCmd, deleteVoiceCmd, executeVoice,
    logCommand,
  };
})();
