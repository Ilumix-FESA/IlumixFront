/* ============================================================
   ILUMIX — Energy page — consumo real baseado nas lâmpadas
   ============================================================ */
const EnergyPage = (() => {

  function render() { chart(); roomBars(); savings(); bindTabs(); }

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
    if (!Data.rooms.length) {
      el.innerHTML = `<div style="color:var(--text-lo);font-size:12px">Adicione cômodos para ver o consumo.</div>`;
      return;
    }
    const data = Data.rooms.map(r => { const s=Data.roomStats(r.id); return {name:r.name, w:s.power}; });
    const max  = Math.max(...data.map(d=>d.w), 1);
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
    const totalW  = Data.totalPower();
    const totalKwh= (totalW * 24 / 1000).toFixed(1);
    const custo   = (totalKwh * 30 * 0.80).toFixed(2); // R$0.80/kWh estimado
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-3)">
        <div>
          <div style="font-size:10px;color:var(--text-mid);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px">Consumo atual</div>
          <div style="font-size:32px;font-weight:300;color:var(--text-hi);letter-spacing:-1px">${totalW}<span style="font-size:14px;font-weight:400;color:var(--text-mid)"> W</span></div>
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;color:var(--text-mid);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Custo est./mês</div>
          <div style="font-size:20px;color:var(--amber);font-weight:600">R$ ${custo}</div>
        </div>
      </div>
      <div style="margin-top:var(--sp-4);padding:var(--sp-3);background:var(--dark-3);border-radius:var(--r-md);display:flex;gap:var(--sp-4)">
        <div style="text-align:center;flex:1">
          <div style="font-size:18px;font-weight:300;color:var(--amber)">${totalKwh} <span style="font-size:11px">kWh</span></div>
          <div style="font-size:10px;color:var(--text-lo);margin-top:2px">Estimativa/dia</div>
        </div>
        <div style="text-align:center;flex:1">
          <div style="font-size:18px;font-weight:300;color:var(--green)">${Data.bulbs.length}</div>
          <div style="font-size:10px;color:var(--text-lo);margin-top:2px">Lâmpadas</div>
        </div>
        <div style="text-align:center;flex:1">
          <div style="font-size:18px;font-weight:300;color:var(--blue)">${Data.activeBulbs()}</div>
          <div style="font-size:10px;color:var(--text-lo);margin-top:2px">Acesas agora</div>
        </div>
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
