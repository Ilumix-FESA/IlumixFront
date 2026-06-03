/* ============================================================
   ILUMIX — Página de Dados Históricos
   Exibe histórico de atributos por dispositivo em gráfico.
============================================================ */
const HistoryPage = (() => {
  let selectedLampId = '';
  let selectedAttribute = '';
  let lastN = 20;
  let historyChartInstance = null;

  async function render() {
    const el = document.getElementById('page-history');
    if (!el) return;

    const lampOptions = Data.bulbs.map(b => {
      const id = b._apiId || b.id || '';
      return `<option value="${String(id)}">${escapeHtml(b.name)} (${escapeHtml(id)})</option>`;
    }).join('');

    el.innerHTML = `
      <div class="page-inner">
        <div class="sec-hdr mb-4">
          <div class="sec-hdr__title">Dados Históricos</div>
          <div class="sec-hdr__action">Últimos ${lastN} registros</div>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4)">
          <div style="display:grid;grid-template-columns:1fr 1fr 160px 140px;gap:var(--sp-3);align-items:end;flex-wrap:wrap">
            <label class="input-group">
              <span>Selecionar dispositivo</span>
              <select id="history-lamp-select" class="input input--full">
                <option value="">Selecione um dispositivo</option>
                ${lampOptions}
              </select>
            </label>
            <label class="input-group">
              <span>Atributo</span>
              <select id="history-attribute-select" class="input input--full" disabled>
                <option value="">Selecione um dispositivo primeiro</option>
              </select>
            </label>
            <label class="input-group">
              <span>Registros</span>
              <select id="history-lastn-select" class="input input--full">
                ${[10, 20, 50, 100].map(v => `<option value="${v}" ${v === lastN ? 'selected' : ''}>Últimos ${v}</option>`).join('')}
              </select>
            </label>
            <button class="btn btn--primary" id="history-refresh-btn">Buscar histórico</button>
          </div>
        </div>

        <div id="history-result">
          <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
            Escolha um dispositivo e um atributo, depois clique em "Buscar histórico".
          </div>
        </div>
      </div>`;

    _bindEvents();
  }

  function _bindEvents() {
    const lampSelect = document.getElementById('history-lamp-select');
    const attrSelect = document.getElementById('history-attribute-select');
    const lastNSelect = document.getElementById('history-lastn-select');
    const refreshBtn = document.getElementById('history-refresh-btn');

    lampSelect?.addEventListener('change', async e => {
      selectedLampId = e.target.value;
      selectedAttribute = '';
      await _loadAttributesForDevice(selectedLampId);
    });
    attrSelect?.addEventListener('change', e => {
      selectedAttribute = e.target.value;
    });
    lastNSelect?.addEventListener('change', e => {
      lastN = Number(e.target.value) || 20;
    });
    refreshBtn?.addEventListener('click', loadHistory);
  }

  function _findBulb(lampId) {
    return Data.bulbs.find(b => String(b._apiId || b.id) === String(lampId));
  }

  async function _loadAttributesForDevice(lampId) {
    const attrSelect = document.getElementById('history-attribute-select');
    if (!attrSelect) return;

    if (!lampId) {
      attrSelect.disabled = true;
      attrSelect.innerHTML = '<option value="">Selecione um dispositivo primeiro</option>';
      return;
    }

    const bulb = _findBulb(lampId);
    const deviceTypeId = bulb?.deviceTypeId || bulb?.idDevice || 1;

    attrSelect.disabled = true;
    attrSelect.innerHTML = '<option value="">Carregando atributos...</option>';

    try {
      const raw = await Api.deviceTypes.getAttributes(deviceTypeId);
      const list = Array.isArray(raw) ? raw : [];
      const filtered = list.filter(a => {
        const name = (a.name || a.Name || '').trim().toLowerCase();
        return name && name !== 'state';
      });

      if (!filtered.length) {
        attrSelect.innerHTML = '<option value="">Nenhum atributo disponível</option>';
        selectedAttribute = '';
        return;
      }

      attrSelect.innerHTML = filtered.map(a => {
        const name = a.name || a.Name;
        return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }).join('');

      selectedAttribute = filtered[0].name || filtered[0].Name || '';
      attrSelect.disabled = false;
    } catch (error) {
      attrSelect.innerHTML = `<option value="">Erro ao carregar atributos</option>`;
      selectedAttribute = '';
      console.error('[HistoryPage] atributos:', error.message);
    }
  }

  async function loadHistory() {
    const resultEl = document.getElementById('history-result');
    if (!resultEl) return;

    if (!selectedLampId) {
      resultEl.innerHTML = `
        <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
          Selecione um dispositivo antes de buscar o histórico.
        </div>`;
      return;
    }

    const attrSelect = document.getElementById('history-attribute-select');
    selectedAttribute = attrSelect?.value || selectedAttribute;

    if (!selectedAttribute) {
      resultEl.innerHTML = `
        <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
          Selecione um atributo antes de buscar o histórico.
        </div>`;
      return;
    }

    if (typeof window.Chart !== 'function') {
      resultEl.innerHTML = `
        <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
          O gráfico ainda não carregou (Chart.js). Aguarde 1–2 segundos e tente novamente.
        </div>`;
      return;
    }

    resultEl.innerHTML = `
      <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
        Carregando dados históricos...
      </div>`;

    try {
      const data = await Api.devices.history(selectedLampId, lastN, selectedAttribute);
      let values = [];
      if (Array.isArray(data?.values)) {
        values = data.values;
      } else if (Array.isArray(data?.history)) {
        values = data.history;
      } else if (Array.isArray(data?.contextResponses)) {
        values = data.contextResponses[0]?.contextElement?.attributes?.[0]?.values || [];
      } else if (Array.isArray(data)) {
        values = data;
      }

      if (!values.length) {
        resultEl.innerHTML = `
          <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
            Nenhum dado histórico encontrado para o atributo "${escapeHtml(selectedAttribute)}".
          </div>`;
        return;
      }

      const labels = [];
      const chartData = [];
      const attrLabel = selectedAttribute;

      values.forEach(entry => {
        const time = entry.recvTime || entry.time || entry.timestamp || '';
        const value = entry.attrValue ?? entry.value ?? entry[attrLabel] ?? '';
        const formattedTime = time
          ? new Date(time).toLocaleString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '-';

        labels.push(formattedTime);
        chartData.push(Number(value));
      });

      resultEl.innerHTML = `
        <div class="card" style="padding:var(--sp-4)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-4)">
            <div style="font-size:13px;font-weight:600">Histórico: ${escapeHtml(attrLabel)}</div>
            <div style="font-size:12px;color:var(--text-lo)">${values.length} registro(s)</div>
          </div>
          <div style="position: relative; height: 350px; width: 100%;">
            <canvas id="historyChart"></canvas>
          </div>
        </div>`;

      const ctx = document.getElementById('historyChart').getContext('2d');

      if (historyChartInstance) {
        historyChartInstance.destroy();
      }

      historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: attrLabel,
            data: chartData,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label(context) {
                  return `${attrLabel}: ${context.parsed.y}`;
                },
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(0, 0, 0, 0.05)' },
            },
            x: {
              grid: { display: false },
            },
          },
        },
      });
    } catch (error) {
      resultEl.innerHTML = `
        <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
          Erro ao carregar histórico: ${escapeHtml(error.message || 'Falha na conexão')}
        </div>`;
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return { render };
})();
