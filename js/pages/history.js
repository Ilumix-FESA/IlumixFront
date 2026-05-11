/* ============================================================
   ILUMIX — Página de Dados Históricos
   Exibe o histórico de luminosidade por lâmpada em Gráfico.
============================================================ */
const HistoryPage = (() => {
  let selectedLampId = '';
  let lastN = 20;
  let historyChartInstance = null; // Variável para controlar a instância do gráfico

  async function render() {
    const el = document.getElementById('page-history');
    if (!el) return;

    const lampOptions = Data.bulbs.map(b => {
      const id = b._apiId || b.id || '';
      return `<option value="${id}">${escapeHtml(b.name)} (${escapeHtml(id)})</option>`;
    }).join('');

    el.innerHTML = `
      <div class="page-inner">
        <div class="sec-hdr mb-4">
          <div class="sec-hdr__title">Dados Históricos</div>
          <div class="sec-hdr__action">Últimos ${lastN} registros</div>
        </div>

        <div class="card" style="margin-bottom:var(--sp-4)">
          <div style="display:grid;grid-template-columns:1fr 200px 140px;gap:var(--sp-3);align-items:end;flex-wrap:wrap">
            <label class="input-group">
              <span>Selecionar lâmpada</span>
              <select id="history-lamp-select" class="input input--full">
                <option value="">Selecione uma lâmpada</option>
                ${lampOptions}
              </select>
            </label>
            <label class="input-group">
              <span>Registrar</span>
              <select id="history-lastn-select" class="input input--full">
                ${[10,20,50,100].map(v => `<option value="${v}" ${v===lastN?'selected':''}>Últimos ${v}</option>`).join('')}
              </select>
            </label>
            <button class="btn btn--primary" id="history-refresh-btn">Buscar histórico</button>
          </div>
        </div>

        <div id="history-result">
          <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
            Escolha uma lâmpada e clique em "Buscar histórico" para ver os dados.
          </div>
        </div>
      </div>`;

    _bindEvents();
  }

  function _bindEvents() {
    const lampSelect = document.getElementById('history-lamp-select');
    const lastNSelect = document.getElementById('history-lastn-select');
    const refreshBtn = document.getElementById('history-refresh-btn');

    lampSelect?.addEventListener('change', e => {
      selectedLampId = e.target.value;
    });
    lastNSelect?.addEventListener('change', e => {
      lastN = Number(e.target.value) || 20;
    });
    refreshBtn?.addEventListener('click', loadHistory);
  }

  async function loadHistory() {
    const resultEl = document.getElementById('history-result');
    if (!resultEl) return;
    if (!selectedLampId) {
      resultEl.innerHTML = `
        <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
          Selecione uma lâmpada antes de buscar o histórico.
        </div>`;
      return;
    }

    resultEl.innerHTML = `
      <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
        Carregando dados históricos...
      </div>`;

    try {
      const data = await Api.lamps.history(selectedLampId, lastN);
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
            Nenhum dado histórico encontrado para esta lâmpada.
          </div>`;
        return;
      }

      // Arrays para alimentar o gráfico
      const labels = [];
      const chartData = [];

      values.forEach(entry => {
        const time = entry.recvTime || entry.time || entry.timestamp || '';
        const value = entry.attrValue ?? entry.value ?? entry.luminosity ?? '';
        
        // Formata a data para exibir no eixo X de forma mais limpa
        const formattedTime = time ? new Date(time).toLocaleString('pt-BR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
        
        labels.push(formattedTime);
        chartData.push(Number(value)); // Garante que o valor seja numérico
      });

      resultEl.innerHTML = `
        <div class="card" style="padding:var(--sp-4)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--sp-4)">
            <div style="font-size:13px;font-weight:600">Luminosidade histórica</div>
            <div style="font-size:12px;color:var(--text-lo)">${values.length} registro(s)</div>
          </div>
          <div style="position: relative; height: 350px; width: 100%;">
            <canvas id="historyChart"></canvas>
          </div>
        </div>`;

      // Inicializa o Chart.js
      const ctx = document.getElementById('historyChart').getContext('2d');
      
      // Se já existir um gráfico renderizado antes, destrua-o para não bugar o novo
      if (historyChartInstance) {
        historyChartInstance.destroy();
      }

      historyChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Luminosidade',
            data: chartData,
            borderColor: '#4f46e5', // Cor do tema (Indigo)
            backgroundColor: 'rgba(79, 70, 229, 0.1)', // Preenchimento com opacidade
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            fill: true,
            tension: 0.3 // Deixa a linha com curva suave
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false // Oculta a legenda do topo, pois já sabemos que é luminosidade
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `Luminosidade: ${context.parsed.y}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: 100, // Sugere o topo como 100 (se for porcentagem)
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });

    } catch (error) {
      resultEl.innerHTML = `
        <div class="card" style="padding:var(--sp-4);color:var(--text-lo)">
          Erro ao carregar histórico: ${escapeHtml(error.message || 'Falha na conexão')}
        </div>`;
    }
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return { render };
})();