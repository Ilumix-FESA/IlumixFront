/* ============================================================
   ILUMIX — Relatórios Gerenciais
   Tela de consulta de dispositivos com múltiplos filtros.
   Requisito: 2ª tela gerencial com mínimo 2 filtros por tela.
   ============================================================ */
const ReportsPage = (() => {

  let _filterRoom   = 'todos';
  let _filterStatus = 'todos';
  let _filterType   = 'todos';
  let _sortBy       = 'name';

  function render() {
    const el = document.querySelector('#page-reports .page-inner');
    if (!el) return;

    el.innerHTML = `
      <div class="sec-hdr mb-4">
        <div class="sec-hdr__title">Relatório de Dispositivos</div>
      </div>

      <!-- Barra de filtros -->
      <div id="rep-filter-bar" style="
        background:var(--dark-2);border:1px solid var(--border);
        border-radius:var(--r-lg);padding:16px 20px;margin-bottom:24px">
        <div style="font-size:11px;color:var(--text-lo);font-weight:500;margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px">Filtros</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end">

          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="font-size:11px;color:var(--text-lo)">Cômodo</label>
            <select id="rep-room" style="
              background:var(--dark-3);border:1px solid var(--border);
              color:var(--text-hi);font-size:12px;padding:6px 10px;
              border-radius:var(--r-md);min-width:150px">
              <option value="todos">Todos os cômodos</option>
              ${Data.rooms.map(r => `<option value="${r.id}" ${String(r.id) === _filterRoom ? 'selected' : ''}>${r.name}</option>`).join('')}
            </select>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="font-size:11px;color:var(--text-lo)">Status</label>
            <select id="rep-status" style="
              background:var(--dark-3);border:1px solid var(--border);
              color:var(--text-hi);font-size:12px;padding:6px 10px;
              border-radius:var(--r-md);min-width:130px">
              <option value="todos"  ${_filterStatus === 'todos' ? 'selected' : ''}>Todos</option>
              <option value="on"     ${_filterStatus === 'on'    ? 'selected' : ''}>Ligados</option>
              <option value="off"    ${_filterStatus === 'off'   ? 'selected' : ''}>Desligados</option>
            </select>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="font-size:11px;color:var(--text-lo)">Tipo de dispositivo</label>
            <select id="rep-type" style="
              background:var(--dark-3);border:1px solid var(--border);
              color:var(--text-hi);font-size:12px;padding:6px 10px;
              border-radius:var(--r-md);min-width:160px">
              <option value="todos">Todos os tipos</option>
              ${Data.deviceTypes.map(t => `<option value="${t.id}" ${String(t.id) === _filterType ? 'selected' : ''}>${t.name}</option>`).join('')}
            </select>
          </div>

          <div style="display:flex;flex-direction:column;gap:6px">
            <label style="font-size:11px;color:var(--text-lo)">Ordenar por</label>
            <select id="rep-sort" style="
              background:var(--dark-3);border:1px solid var(--border);
              color:var(--text-hi);font-size:12px;padding:6px 10px;
              border-radius:var(--r-md);min-width:130px">
              <option value="name"   ${_sortBy === 'name'   ? 'selected' : ''}>Nome</option>
              <option value="room"   ${_sortBy === 'room'   ? 'selected' : ''}>Cômodo</option>
              <option value="status" ${_sortBy === 'status' ? 'selected' : ''}>Status</option>
              <option value="bri"    ${_sortBy === 'bri'    ? 'selected' : ''}>Brilho</option>
            </select>
          </div>

          <button id="rep-clear" style="
            background:transparent;border:1px solid var(--border);
            color:var(--text-lo);font-size:12px;padding:6px 14px;
            border-radius:var(--r-md);cursor:pointer;margin-top:auto">
            Limpar filtros
          </button>
        </div>
      </div>

      <!-- Sumário de resultados -->
      <div id="rep-summary" style="margin-bottom:16px"></div>

      <!-- Tabela de resultados -->
      <div id="rep-table" style="
        background:var(--dark-2);border:1px solid var(--border);
        border-radius:var(--r-lg);overflow:hidden"></div>
    `;

    _bindEvents();
    _renderTable();
  }

  function _bindEvents() {
    document.getElementById('rep-room').addEventListener('change', e => { _filterRoom = e.target.value; _renderTable(); });
    document.getElementById('rep-status').addEventListener('change', e => { _filterStatus = e.target.value; _renderTable(); });
    document.getElementById('rep-type').addEventListener('change', e => { _filterType = e.target.value; _renderTable(); });
    document.getElementById('rep-sort').addEventListener('change', e => { _sortBy = e.target.value; _renderTable(); });
    document.getElementById('rep-clear').addEventListener('click', () => {
      _filterRoom = 'todos';
      _filterStatus = 'todos';
      _filterType = 'todos';
      _sortBy = 'name';
      render();
    });
  }

  function _applyFilters() {
    return Data.bulbs
      .filter(b => _filterRoom === 'todos'   || String(b.roomId)   === String(_filterRoom))
      .filter(b => _filterStatus === 'todos' || (_filterStatus === 'on' ? b.on : !b.on))
      .filter(b => _filterType === 'todos'   || String(b.deviceId) === String(_filterType));
  }

  function _applySort(list) {
    return [...list].sort((a, b) => {
      if (_sortBy === 'name')   return (a.name || '').localeCompare(b.name || '');
      if (_sortBy === 'room')   return (a.roomName || '').localeCompare(b.roomName || '');
      if (_sortBy === 'status') return (b.on ? 1 : 0) - (a.on ? 1 : 0);
      if (_sortBy === 'bri')    return (b.brightness || 0) - (a.brightness || 0);
      return 0;
    });
  }

  function _getRoomName(roomId) {
    if (!roomId) return '—';
    const r = Data.rooms.find(r => String(r.id) === String(roomId));
    return r ? r.name : '—';
  }

  function _renderTable() {
    const filtered = _applyFilters();
    const sorted   = _applySort(filtered);

    const summary = document.getElementById('rep-summary');
    const tableEl = document.getElementById('rep-table');
    if (!summary || !tableEl) return;

    const ligados    = filtered.filter(b => b.on).length;
    const desligados = filtered.length - ligados;

    summary.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        <div style="font-size:12px;color:var(--text-lo)">
          <span style="color:var(--text-hi);font-weight:600">${filtered.length}</span> dispositivo(s) encontrado(s)
        </div>
        <div style="font-size:12px;color:var(--text-lo)">
          <span style="color:#4ade80;font-weight:600">${ligados}</span> ligado(s)
        </div>
        <div style="font-size:12px;color:var(--text-lo)">
          <span style="color:var(--text-mid);font-weight:600">${desligados}</span> desligado(s)
        </div>
      </div>`;

    if (!sorted.length) {
      tableEl.innerHTML = `
        <div style="text-align:center;padding:40px 16px;color:var(--text-lo);font-size:13px">
          Nenhum dispositivo encontrado para os filtros selecionados.
        </div>`;
      return;
    }

    tableEl.innerHTML = `
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--border)">
            <th style="text-align:left;padding:10px 16px;font-size:11px;color:var(--text-lo);font-weight:500">Dispositivo</th>
            <th style="text-align:left;padding:10px 16px;font-size:11px;color:var(--text-lo);font-weight:500">Cômodo</th>
            <th style="text-align:center;padding:10px 16px;font-size:11px;color:var(--text-lo);font-weight:500">Status</th>
            <th style="text-align:center;padding:10px 16px;font-size:11px;color:var(--text-lo);font-weight:500">Brilho</th>
            <th style="text-align:left;padding:10px 16px;font-size:11px;color:var(--text-lo);font-weight:500">Tipo</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((b, i) => {
            const roomName   = _getRoomName(b.roomId);
            const typeName   = (Data.deviceTypes.find(t => String(t.id) === String(b.deviceId)) || {}).name || '—';
            const brightness = b.on ? (b.brightness || 100) : 0;
            const isLast     = i === sorted.length - 1;
            return `
              <tr style="border-bottom:${isLast ? 'none' : '1px solid var(--border)'}">
                <td style="padding:11px 16px">
                  <div style="font-size:13px;font-weight:500;color:var(--text-hi)">${b.name || '—'}</div>
                  <div style="font-size:11px;color:var(--text-lo);margin-top:2px">${b.idFiware || ''}</div>
                </td>
                <td style="padding:11px 16px;font-size:12px;color:var(--text-mid)">${roomName}</td>
                <td style="padding:11px 16px;text-align:center">
                  <span style="
                    display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:500;
                    background:${b.on ? 'rgba(74,222,128,.12)' : 'rgba(255,255,255,.04)'};
                    color:${b.on ? '#4ade80' : 'var(--text-lo)'}">
                    ${b.on ? 'Ligado' : 'Desligado'}
                  </span>
                </td>
                <td style="padding:11px 16px;text-align:center">
                  <div style="display:flex;align-items:center;gap:8px;justify-content:center">
                    <div style="flex:1;max-width:80px;height:4px;background:var(--dark-3);border-radius:2px;overflow:hidden">
                      <div style="height:100%;width:${brightness}%;background:var(--amber);border-radius:2px;transition:width .3s"></div>
                    </div>
                    <span style="font-size:11px;color:var(--text-lo);min-width:28px">${brightness}%</span>
                  </div>
                </td>
                <td style="padding:11px 16px;font-size:12px;color:var(--text-lo)">${typeName}</td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>`;
  }

  return { render };
})();
