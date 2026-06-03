/* ============================================================
   ILUMIX — Página Sobre
   Exibe informações do sistema e dados dos alunos autores.
   ============================================================ */
const SobrePage = (() => {

  const alunos = [
    { nome: 'Laura',   ra: 'RA000000', curso: 'Engenharia da Computação' },
    { nome: 'Aluno 2', ra: 'RA000001', curso: 'Engenharia da Computação' },
  ];

  const tecnologias = [
    { nome: 'ASP.NET Core 8',  descricao: 'Backend REST API com autenticação JWT' },
    { nome: 'SQL Server',      descricao: 'Banco de dados relacional com stored procedures' },
    { nome: 'Fiware / Orion',  descricao: 'Plataforma IoT para gerenciamento de dispositivos' },
    { nome: 'STH-Comet',       descricao: 'Histórico temporal de dados IoT' },
    { nome: 'AWS EventBridge', descricao: 'Agendamento de rotinas automáticas em nuvem' },
    { nome: 'JWT + BCrypt',    descricao: 'Autenticação segura e hash de senhas' },
    { nome: 'Swagger / OAS',   descricao: 'Documentação interativa da API REST' },
    { nome: 'HTML / CSS / JS', descricao: 'Single Page Application sem frameworks' },
  ];

  function render() {
    const el = document.querySelector('#page-sobre .page-inner');
    if (!el) return;

    el.innerHTML = `
      <div class="sec-hdr mb-4">
        <div class="sec-hdr__title">Sobre o Sistema</div>
      </div>

      <!-- Apresentação -->
      <div class="card mb-4" style="padding:var(--sp-5)">
        <div style="display:flex;align-items:center;gap:var(--sp-4);margin-bottom:var(--sp-4)">
          <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="6" fill="#E2B84A" opacity=".92"/>
            <circle cx="16" cy="16" r="10" stroke="#E2B84A" stroke-width="1" opacity=".35"/>
            <circle cx="16" cy="16" r="14" stroke="#E2B84A" stroke-width=".5" opacity=".12"/>
          </svg>
          <div>
            <div style="font-size:22px;font-weight:600;color:var(--text-hi)">ilu<b>mix</b></div>
            <div style="font-size:12px;color:var(--text-lo);margin-top:2px">Smart Home IoT Platform</div>
          </div>
        </div>
        <p style="font-size:13px;color:var(--text-mid);line-height:1.7;margin:0">
          O <strong style="color:var(--text-hi)">Ilumix</strong> é um sistema de automação residencial
          desenvolvido como projeto acadêmico na disciplina de
          <strong style="color:var(--amber)">Sistemas Embarcados — EC5</strong> da
          <strong style="color:var(--text-hi)">FESA — Fundação Educacional do Município de Assis</strong>.
          A plataforma permite controlar lâmpadas inteligentes via protocolo IoT (Fiware/MQTT),
          criar cenas de iluminação personalizadas, agendar rotinas automáticas em nuvem (AWS)
          e acompanhar o histórico de dados dos dispositivos em tempo real.
        </p>
      </div>

      <!-- Funcionalidades -->
      <div class="sec-hdr mb-3">
        <div class="sec-hdr__title">Funcionalidades</div>
      </div>
      <div class="g4 mb-6">
        ${[
          ['Dispositivos', 'Controle de lâmpadas IoT com ajuste de brilho, cor e temperatura'],
          ['Cômodos',      'Organização de dispositivos por ambiente com upload de imagem'],
          ['Cenas',        'Perfis de iluminação personalizados ativáveis com um toque'],
          ['Horários',     'Rotinas automáticas agendadas via AWS EventBridge'],
          ['Histórico',    'Consulta de dados históricos de atributos IoT com filtros'],
          ['Relatórios',   'Análise gerencial de dispositivos por cômodo e status'],
        ].map(([t, d]) => `
          <div class="card" style="padding:var(--sp-4)">
            <div style="font-size:13px;font-weight:600;color:var(--amber);margin-bottom:6px">${t}</div>
            <div style="font-size:12px;color:var(--text-mid);line-height:1.6">${d}</div>
          </div>`).join('')}
      </div>

      <!-- Tecnologias -->
      <div class="sec-hdr mb-3">
        <div class="sec-hdr__title">Tecnologias Utilizadas</div>
      </div>
      <div class="card mb-6" style="overflow:hidden">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:10px 16px;font-size:11px;color:var(--text-lo);font-weight:500">Tecnologia</th>
              <th style="text-align:left;padding:10px 16px;font-size:11px;color:var(--text-lo);font-weight:500">Descrição</th>
            </tr>
          </thead>
          <tbody>
            ${tecnologias.map((t, i) => `
              <tr style="border-bottom:${i < tecnologias.length - 1 ? '1px solid var(--border)' : 'none'}">
                <td style="padding:10px 16px;font-size:12px;font-weight:600;color:var(--text-hi)">${t.nome}</td>
                <td style="padding:10px 16px;font-size:12px;color:var(--text-mid)">${t.descricao}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <!-- Autores -->
      <div class="sec-hdr mb-3">
        <div class="sec-hdr__title">Autores</div>
      </div>
      <div class="g${alunos.length} mb-6">
        ${alunos.map(a => `
          <div class="card" style="padding:var(--sp-5);text-align:center">
            <div style="
              width:56px;height:56px;border-radius:50%;
              background:var(--dark-3);border:1px solid var(--border);
              display:flex;align-items:center;justify-content:center;
              margin:0 auto var(--sp-3);
              font-size:20px;font-weight:600;color:var(--amber)">
              ${a.nome.charAt(0).toUpperCase()}
            </div>
            <div style="font-size:14px;font-weight:600;color:var(--text-hi);margin-bottom:4px">${a.nome}</div>
            <div style="font-size:11px;color:var(--amber);font-weight:500;margin-bottom:4px">${a.ra}</div>
            <div style="font-size:11px;color:var(--text-lo)">${a.curso}</div>
          </div>`).join('')}
      </div>

      <!-- Informações Acadêmicas -->
      <div class="card" style="padding:var(--sp-4);border-color:var(--amber-dim, #3d3010)">
        <div style="font-size:11px;color:var(--text-lo);line-height:1.8">
          <div><strong style="color:var(--text-mid)">Instituição:</strong> FESA — Fundação Educacional do Município de Assis</div>
          <div><strong style="color:var(--text-mid)">Curso:</strong> Engenharia da Computação</div>
          <div><strong style="color:var(--text-mid)">Disciplina:</strong> Sistemas Embarcados — 5º Semestre</div>
          <div><strong style="color:var(--text-mid)">Ano:</strong> 2026</div>
        </div>
      </div>
    `;
  }

  return { render };
})();
