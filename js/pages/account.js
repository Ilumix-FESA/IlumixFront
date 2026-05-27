/* ============================================================
   ILUMIX — Account Page
   ============================================================ */
const AccountPage = (() => {

  const PLANS = {
    starter:     { label: 'Starter',     price: 'Grátis',  sub: 'Até 5 dispositivos' },
    casa:        { label: 'Casa',         price: 'R$ 29/mês', sub: 'Dispositivos ilimitados' },
    empresarial: { label: 'Empresarial',  price: 'R$ 99/mês', sub: 'Tudo + suporte prioritário' },
  };

  function render() {
    const user = Api.getUser();
    const plan = localStorage.getItem('ilumix_plan') || 'starter';
    const p    = PLANS[plan] || PLANS.starter;
    const el   = document.getElementById('account-content');
    if (!el) return;

    el.innerHTML = `
      <!-- Avatar + nome -->
      <div class="card mb-4" style="display:flex;align-items:center;gap:var(--sp-4);padding:var(--sp-5)">
        <div style="width:64px;height:64px;border-radius:50%;background:var(--amber-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
        </div>
        <div>
          <div style="font-size:16px;font-weight:600;color:var(--text-hi)" id="acc-name">${user?.name || '—'}</div>
          <div style="font-size:12px;color:var(--text-mid);margin-top:2px" id="acc-email">${user?.email || '—'}</div>
          <span class="badge badge--on" style="margin-top:var(--sp-2)">Conta ativa</span>
        </div>
      </div>

      <!-- Meu Plano -->
      <div class="card mb-4">
        <div class="sec-hdr mb-3">
          <div class="sec-hdr__title">Meu Plano</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:var(--sp-3)">
          <div>
            <div style="font-size:18px;font-weight:600;color:var(--amber)">${p.label}</div>
            <div style="font-size:13px;color:var(--text-mid);margin-top:4px">${p.price} · ${p.sub}</div>
          </div>
          <button class="btn btn--ghost" id="btn-change-plan" style="flex-shrink:0">Mudar plano</button>
        </div>
      </div>

      <!-- Alterar e-mail -->
      <div class="card mb-4">
        <div class="sec-hdr mb-3">
          <div class="sec-hdr__title">Alterar E-mail</div>
        </div>
        <div class="input-wrap">
          <label>Novo e-mail</label>
          <input class="input" id="acc-new-email" type="email" placeholder="${user?.email || 'novo@email.com'}">
        </div>
        <div id="acc-email-err" style="color:#ff6b6b;font-size:12px;margin-bottom:var(--sp-2);display:none"></div>
        <button class="btn btn--primary btn--full" id="btn-update-email">Salvar e-mail</button>
      </div>

      <!-- Alterar senha -->
      <div class="card mb-4">
        <div class="sec-hdr mb-3">
          <div class="sec-hdr__title">Alterar Senha</div>
        </div>
        <div class="input-wrap">
          <label>Senha atual</label>
          <input class="input" id="acc-cur-pw" type="password" placeholder="••••••••">
        </div>
        <div class="input-wrap">
          <label>Nova senha</label>
          <input class="input" id="acc-new-pw" type="password" placeholder="Min. 8 caracteres">
        </div>
        <div class="input-wrap">
          <label>Confirmar nova senha</label>
          <input class="input" id="acc-conf-pw" type="password" placeholder="Repita a nova senha">
        </div>
        <div id="acc-pw-err" style="color:#ff6b6b;font-size:12px;margin-bottom:var(--sp-2);display:none"></div>
        <button class="btn btn--primary btn--full" id="btn-change-pw">Salvar senha</button>
      </div>

      <!-- Logout -->
      <div class="card mb-4">
        <div class="sec-hdr mb-3"><div class="sec-hdr__title">Sessão</div></div>
        <button class="btn btn--ghost btn--full" id="btn-logout" style="gap:var(--sp-2)">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sair da conta
        </button>
      </div>

      <!-- Zona de perigo -->
      <div class="card" style="border:1px solid #ff4d4d33">
        <div class="sec-hdr mb-3">
          <div class="sec-hdr__title" style="color:#ff6b6b">Zona de Perigo</div>
        </div>
        <p style="font-size:12px;color:var(--text-mid);margin-bottom:var(--sp-3)">
          Ao excluir sua conta, todas as lâmpadas, cômodos e cenas serão removidos permanentemente.
        </p>
        <div id="acc-del-err" style="color:#ff6b6b;font-size:12px;margin-bottom:var(--sp-2);display:none"></div>
        <button class="btn btn--full" id="btn-del-account"
          style="background:transparent;border:1px solid #ff4d4d55;color:#ff6b6b">
          Excluir minha conta
        </button>
      </div>`;

    bindEvents(user);
  }

  function bindEvents(user) {
    /* ── Mudar plano ── */
    document.getElementById('btn-change-plan').addEventListener('click', () => {
      let pendingPlan = localStorage.getItem('ilumix_plan') || 'starter';

      function buildModalHtml() {
        return `
          <div style="font-size:16px;font-weight:600;color:var(--text-hi);margin-bottom:16px">Escolha seu plano</div>
          <div class="plan-cards" id="modal-plan-cards">
            <div class="plan-card${pendingPlan==='starter'?' is-selected':''}" data-plan="starter">
              <div class="plan-card__name">Starter</div>
              <div class="plan-card__price">R$ 0<span class="plan-card__period">/mês</span></div>
              <div class="plan-card__badge">Grátis</div>
            </div>
            <div class="plan-card${pendingPlan==='casa'?' is-selected':''}" data-plan="casa">
              <div class="plan-card__name">Casa</div>
              <div class="plan-card__price">R$ 29<span class="plan-card__period">/mês</span></div>
              <div class="plan-card__badge">Popular</div>
            </div>
            <div class="plan-card${pendingPlan==='empresarial'?' is-selected':''}" data-plan="empresarial">
              <div class="plan-card__name">Empresarial</div>
              <div class="plan-card__price">R$ 99<span class="plan-card__period">/mês</span></div>
              <div class="plan-card__badge">Sem limites</div>
            </div>
          </div>
          <div class="cc-form${pendingPlan!=='starter'?' is-visible':''}" id="modal-cc-form">
            <div class="cc-form__header">
              <div class="cc-form__title">Dados de pagamento</div>
              <div class="cc-brands"><span class="cc-brand">VISA</span><span class="cc-brand">MASTER</span><span class="cc-brand">ELO</span></div>
            </div>
            <div style="margin-bottom:12px">
              <label style="font-size:12px;color:var(--text-mid);display:block;margin-bottom:6px">Número do cartão</label>
              <input class="input" id="modal-cc-number" type="text" placeholder="0000 0000 0000 0000" maxlength="19">
            </div>
            <div class="cc-row" style="margin-bottom:12px">
              <div>
                <label style="font-size:12px;color:var(--text-mid);display:block;margin-bottom:6px">Validade</label>
                <input class="input" id="modal-cc-expiry" type="text" placeholder="MM/AA" maxlength="5">
              </div>
              <div>
                <label style="font-size:12px;color:var(--text-mid);display:block;margin-bottom:6px">CVV</label>
                <input class="input" id="modal-cc-cvv" type="text" placeholder="000" maxlength="4">
              </div>
            </div>
            <div>
              <label style="font-size:12px;color:var(--text-mid);display:block;margin-bottom:6px">Nome no cartão</label>
              <input class="input" id="modal-cc-name" type="text" placeholder="Como aparece no cartão">
            </div>
            <div class="cc-notice">Dados não armazenados — apenas demonstração.</div>
          </div>
          <button class="btn btn--primary btn--full" id="modal-btn-save-plan" style="margin-top:20px" data-modal-close>Salvar plano</button>`;
      }

      Modal.open(buildModalHtml(), () => {});

      function wireModal() {
        Modal.getModal().querySelectorAll('.plan-card').forEach(card => {
          card.addEventListener('click', () => {
            Modal.getModal().querySelectorAll('.plan-card').forEach(c => c.classList.remove('is-selected'));
            card.classList.add('is-selected');
            pendingPlan = card.getAttribute('data-plan');
            const ccForm = Modal.getModal().querySelector('#modal-cc-form');
            if (pendingPlan === 'starter') ccForm.classList.remove('is-visible');
            else ccForm.classList.add('is-visible');
          });
        });

        Modal.getModal().querySelector('#modal-cc-number')?.addEventListener('input', function () {
          var v = this.value.replace(/\D/g, '').slice(0, 16);
          this.value = v.replace(/(.{4})/g, '$1 ').trim();
        });
        Modal.getModal().querySelector('#modal-cc-expiry')?.addEventListener('input', function () {
          var v = this.value.replace(/\D/g, '').slice(0, 4);
          if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
          this.value = v;
        });
        Modal.getModal().querySelector('#modal-cc-cvv')?.addEventListener('input', function () {
          this.value = this.value.replace(/\D/g, '').slice(0, 4);
        });

        Modal.getModal().querySelector('#modal-btn-save-plan')?.addEventListener('click', () => {
          localStorage.setItem('ilumix_plan', pendingPlan);
          Modal.close();
          AccountPage.render();
          toast('Plano atualizado!');
        });
      }

      wireModal();
    });

    /* ── Atualizar e-mail ── */
    document.getElementById('btn-update-email').addEventListener('click', async () => {
      const btn    = document.getElementById('btn-update-email');
      const errEl  = document.getElementById('acc-email-err');
      const newEmail = document.getElementById('acc-new-email').value.trim();
      errEl.style.display = 'none';

      if (!newEmail || !/^[^@]+@[^@]+\.[^@]+$/.test(newEmail)) {
        errEl.textContent = 'Informe um e-mail válido.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Salvando...';
      try {
        await Api.user.updateEmail(user.id, newEmail);
        const updated = { ...user, email: newEmail };
        Api.saveUser(updated);
        document.getElementById('acc-email').textContent = newEmail;
        document.getElementById('acc-new-email').value   = '';
        toast('E-mail atualizado com sucesso!');
      } catch(e) {
        errEl.textContent   = e.message;
        errEl.style.display = 'block';
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Salvar e-mail';
      }
    });

    /* ── Alterar senha ── */
    document.getElementById('btn-change-pw').addEventListener('click', async () => {
      const btn     = document.getElementById('btn-change-pw');
      const errEl   = document.getElementById('acc-pw-err');
      const curPw   = document.getElementById('acc-cur-pw').value;
      const newPw   = document.getElementById('acc-new-pw').value;
      const confPw  = document.getElementById('acc-conf-pw').value;
      errEl.style.display = 'none';

      if (!curPw || !newPw || !confPw) {
        errEl.textContent = 'Preencha todos os campos de senha.';
        errEl.style.display = 'block';
        return;
      }
      if (newPw.length < 8) {
        errEl.textContent = 'A nova senha deve ter no mínimo 8 caracteres.';
        errEl.style.display = 'block';
        return;
      }
      if (newPw !== confPw) {
        errEl.textContent = 'As senhas não coincidem.';
        errEl.style.display = 'block';
        return;
      }

      btn.disabled    = true;
      btn.textContent = 'Salvando...';
      try {
        await Api.user.changePassword(user.id, curPw, newPw, confPw);
        document.getElementById('acc-cur-pw').value  = '';
        document.getElementById('acc-new-pw').value  = '';
        document.getElementById('acc-conf-pw').value = '';
        toast('Senha alterada com sucesso!');
      } catch(e) {
        errEl.textContent   = e.message;
        errEl.style.display = 'block';
      } finally {
        btn.disabled    = false;
        btn.textContent = 'Salvar senha';
      }
    });

    /* ── Logout ── */
    document.getElementById('btn-logout').addEventListener('click', () => {
      if (confirm('Deseja sair da sua conta?')) Api.auth.logout();
    });

    /* ── Excluir conta ── */
    document.getElementById('btn-del-account').addEventListener('click', async () => {
      const errEl = document.getElementById('acc-del-err');
      errEl.style.display = 'none';

      const confirmed = confirm(
        '⚠️ Tem certeza? Esta ação é irreversível.\n\n' +
        'Todas as suas lâmpadas, cômodos e cenas serão excluídos permanentemente.'
      );
      if (!confirmed) return;

      try {
        await Api.user.delete(user.id);
        Api.clearTokens();
        window.location.href = 'cadastro.html';
      } catch(e) {
        errEl.textContent   = e.message;
        errEl.style.display = 'block';
      }
    });
  }

  return { render };
})();
