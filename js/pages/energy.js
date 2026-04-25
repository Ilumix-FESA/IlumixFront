/* ============================================================
   ILUMIX — Energy page
   ============================================================ */
const EnergyPage = (() => {

  function render() {
    chart(); roomBars(); savings(); bindTabs();
  }

  function chart() {
    const el = document.getElementById('energy-chart');
    if (!el) return;
    const data = Data.energyHourly;
    const max  = Math.max(...data.map(d=>d.v));
    el.innerHTML = `<div class="energy-chart">
      ${data.map((d,i)=>`
        <div class="energy-col">
          <div class="energy-col__bar-wrap">
            <div class="energy-col__bar${i===7?' is-now':''}" style="height:${Math.round((d.v/max)*90)}%" title="${d.v} kWh"></div>
          </div>
          <div class="energy-col__lbl">${d.label}</div>
        </div>`).join('')}
    </div>`;
  }

  function roomBars() {
    const el = document.getElementById('room-energy');
    if (!el) return;
    const data = Data.rooms.map(r => {
      const s = Data.roomStats(r.id);
      return { name: r.name, w: s.power };
    });
    const max = Math.max(...data.map(d=>d.w), 1);
    el.innerHTML = data.map(d=>`
      <div class="ebar">
        <div class="ebar__name">${d.name}</div>
        <div class="ebar__track"><div class="ebar__fill" style="width:${Math.round(d.w/max*100)}%"></div></div>
        <div class="ebar__val">${d.w}W</div>
      </div>`).join('');
  }

  function savings() {
    const el = document.getElementById('savings-breakdown');
    if (!el) return;
    const rows = [
      { label:'Automação',   pct:52, val:'R$ 16', color: 'var(--amber)' },
      { label:'Horários',    pct:30, val:'R$ 9',  color: 'var(--green)' },
      { label:'Modo festa',  pct:8,  val:'R$ 2',  color: 'var(--purple)' },
      { label:'Sensors',     pct:10, val:'R$ 3',  color: 'var(--blue)' },
    ];
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3)">
        <div>
          <div style="font-size:10px;color:var(--text-mid);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">Economia Total no Mês</div>
          <div style="font-size:32px;font-weight:300;color:var(--text-hi);letter-spacing:-1px">R$ <b style="font-weight:600">31</b></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--text-mid);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">vs mês anterior</div>
          <div style="font-size:20px;color:var(--green);font-weight:600">−22%</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--text-mid);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:var(--sp-3)">Origem da Economia</div>
      ${rows.map(r=>`
        <div class="savings-row">
          <div class="savings-row__label">${r.label}</div>
          <div class="savings-row__track">
            <div class="savings-row__fill" style="width:${r.pct}%;background:${r.color}"></div>
          </div>
          <div class="savings-row__val">${r.val}</div>
        </div>`).join('')}
      <div style="margin-top:var(--sp-4);padding:var(--sp-3);background:var(--dark-3);border-radius:var(--r-md);display:flex;gap:var(--sp-4)">
        <div style="text-align:center;flex:1"><div style="font-size:18px;font-weight:300;color:var(--amber)">18 <span style="font-size:11px">kWh</span></div><div style="font-size:10px;color:var(--text-lo);margin-top:2px">Este mês</div></div>
        <div style="text-align:center;flex:1"><div style="font-size:18px;font-weight:300;color:var(--green)">4.2 <span style="font-size:11px">kg</span></div><div style="font-size:10px;color:var(--text-lo);margin-top:2px">CO₂ evitado</div></div>
        <div style="text-align:center;flex:1"><div style="font-size:18px;font-weight:300;color:var(--blue)">R$ 22</div><div style="font-size:10px;color:var(--text-lo);margin-top:2px">Custo est.</div></div>
      </div>`;
  }

  function bindTabs() {
    document.querySelectorAll('#energy-tabs .tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#energy-tabs .tab').forEach(x=>x.classList.remove('is-active'));
        t.classList.add('is-active');
      });
    });
  }

  return { render };
})();
