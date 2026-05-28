/* ============================================================
   ILUMIX — Cadastro Page
   Registro em 4 passos via XMLHttpRequest (AJAX)
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  var currentStep  = 1;
  var selectedPlan = 'starter';

  // ── Navegação entre passos ──────────────────────────────────

  function goStep(n) {
    document.getElementById('step-' + currentStep).classList.remove('is-active');
    currentStep = n;
    document.getElementById('step-' + n).classList.add('is-active');
    updateStepUI();
    document.querySelector('.panel-right').scrollTo(0, 0);
  }

  function updateStepUI() {
    var titles = [
      '',
      'Criar <b>conta gratuita</b>',
      'Seus <b>dados</b>',
      'Seu <b>endereço</b>',
      'Escolha seu <b>plano</b>',
    ];
    var subs = [
      '',
      'Já tem conta? <a href="login.html">Entrar</a>',
      'Passo 2 de 4 — Dados pessoais',
      'Passo 3 de 4 — Onde você mora?',
      'Passo 4 de 4 — Quase lá!',
    ];

    document.getElementById('form-title').innerHTML  = titles[currentStep];
    document.getElementById('form-sub').innerHTML    = subs[currentStep];
    document.getElementById('progress-fill').style.width = (currentStep / 4 * 100) + '%';
    document.getElementById('progress-label').textContent = 'Passo ' + currentStep + ' de 4';

    for (var i = 1; i <= 4; i++) {
      var num = document.getElementById('step-num-' + i);
      var lbl = document.getElementById('step-lbl-' + i);
      num.classList.remove('active', 'done');
      lbl.classList.remove('active', 'done');
      if (i < currentStep)   { num.classList.add('done');   lbl.classList.add('done');   num.innerHTML = '✓'; }
      if (i === currentStep) { num.classList.add('active'); lbl.classList.add('active'); if (num.innerHTML === '✓') num.innerHTML = String(i); }
      if (i > currentStep)   { num.innerHTML = String(i); }
    }
  }

  // ── Helpers de validação ────────────────────────────────────

  function setErr(id, show) {
    var el = document.getElementById(id);
    if (el) el.classList.toggle('is-visible', show);
  }

  function setFieldErr(inputId, show) {
    var el = document.getElementById(inputId);
    if (el) el.classList.toggle('is-error', show);
  }

  // ── Força da senha ──────────────────────────────────────────

  document.getElementById('f-password').addEventListener('input', function () {
    var val   = this.value;
    var block = document.getElementById('pw-strength');
    var fill  = document.getElementById('pw-fill');
    var label = document.getElementById('pw-label');

    if (!val) { block.classList.remove('is-visible'); return; }
    block.classList.add('is-visible');

    var score = 0;
    if (val.length >= 8)          score++;
    if (/[A-Z]/.test(val))        score++;
    if (/[0-9]/.test(val))        score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    var levels = [
      { w: '25%',  c: '#B56060', t: 'Muito fraca' },
      { w: '50%',  c: '#D4A832', t: 'Fraca' },
      { w: '75%',  c: '#5BAD6A', t: 'Boa' },
      { w: '100%', c: '#E2B84A', t: 'Forte' },
    ];
    var l = levels[score - 1] || levels[0];
    fill.style.width      = l.w;
    fill.style.background = l.c;
    label.textContent     = l.t;
    label.style.color     = l.c;
  });

  // ── Máscara de telefone ─────────────────────────────────────

  document.getElementById('f-telefone').addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '');
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6)      v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
    else if (v.length > 2) v = '(' + v.slice(0,2) + ') ' + v.slice(2);
    else if (v.length > 0) v = '(' + v;
    this.value = v;
  });

  // ── Máscaras de cartão ──────────────────────────────────────

  document.getElementById('cc-number').addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '').slice(0, 16);
    this.value = v.replace(/(.{4})/g, '$1 ').trim();
  });

  document.getElementById('cc-expiry').addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    this.value = v;
  });

  document.getElementById('cc-cvv').addEventListener('input', function () {
    this.value = this.value.replace(/\D/g, '').slice(0, 4);
  });

  // ── CEP — máscara e busca via AJAX ─────────────────────────

  var cepTimer = null;

  document.getElementById('f-cep').addEventListener('input', function () {
    var v = this.value.replace(/\D/g, '');
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    this.value = v;

    if (v.replace('-', '').length === 8) {
      clearTimeout(cepTimer);
      cepTimer = setTimeout(function () { fetchCEP(v.replace('-', '')); }, 400);
    } else {
      document.getElementById('address-block').classList.remove('is-visible');
      document.getElementById('address-manual').classList.remove('is-visible');
    }
  });

  function fetchCEP(cep) {
    var statusEl = document.getElementById('cep-status');
    var blockEl  = document.getElementById('address-block');
    var manual   = document.getElementById('address-manual');

    statusEl.classList.add('is-visible');
    document.getElementById('cep-status-text').textContent = 'Buscando endereço...';
    blockEl.classList.remove('is-visible');
    setErr('err-cep', false);
    setFieldErr('f-cep', false);
    document.getElementById('f-cep').classList.remove('is-ok');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://viacep.com.br/ws/' + cep + '/json/');

    xhr.onload = function () {
      statusEl.classList.remove('is-visible');
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (_) { data = { erro: true }; }

      if (data.erro) {
        setErr('err-cep', true);
        setFieldErr('f-cep', true);
        return;
      }

      document.getElementById('addr-logradouro').textContent = data.logradouro || '—';
      document.getElementById('addr-bairro').textContent     = data.bairro     || '—';
      document.getElementById('addr-cidade').textContent     = data.localidade  || '—';
      document.getElementById('addr-estado').textContent     = data.uf          || '—';
      blockEl.classList.add('is-visible');
      manual.classList.add('is-visible');
      document.getElementById('f-cep').classList.add('is-ok');
    };

    xhr.onerror = function () {
      statusEl.classList.remove('is-visible');
      document.getElementById('cep-status-text').textContent = 'Erro ao buscar. Verifique o CEP.';
      statusEl.classList.add('is-visible');
      setTimeout(function () { statusEl.classList.remove('is-visible'); }, 3000);
    };

    xhr.send();
  }

  // ── Passo 1 ─────────────────────────────────────────────────

  document.getElementById('btn-step1').addEventListener('click', function () {
    var email = document.getElementById('f-email').value.trim();
    var pw    = document.getElementById('f-password').value;
    var pw2   = document.getElementById('f-password2').value;
    var ok    = true;

    setErr('err-email', false); setFieldErr('f-email', false);
    setErr('err-pw', false);    setFieldErr('f-password', false);
    setErr('err-pw2', false);   setFieldErr('f-password2', false);

    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { setErr('err-email', true); setFieldErr('f-email', true); ok = false; }
    if (pw.length < 8) { setErr('err-pw', true); setFieldErr('f-password', true); ok = false; }
    if (pw !== pw2)    { setErr('err-pw2', true); setFieldErr('f-password2', true); ok = false; }
    if (ok) goStep(2);
  });

  // ── Passo 2 ─────────────────────────────────────────────────

  document.getElementById('btn-back-2').addEventListener('click', function () { goStep(1); });

  document.getElementById('btn-step2').addEventListener('click', function () {
    var nome  = document.getElementById('f-nome').value.trim();
    var sobre = document.getElementById('f-sobrenome').value.trim();
    var nasc  = document.getElementById('f-nascimento').value;
    var ok    = true;

    setErr('err-nome', false);      setFieldErr('f-nome', false);
    setErr('err-sobrenome', false); setFieldErr('f-sobrenome', false);
    setErr('err-nasc', false);      setFieldErr('f-nascimento', false);

    if (!nome)  { setErr('err-nome', true);     setFieldErr('f-nome', true); ok = false; }
    if (!sobre) { setErr('err-sobrenome', true); setFieldErr('f-sobrenome', true); ok = false; }
    if (!nasc)  { setErr('err-nasc', true);      setFieldErr('f-nascimento', true); ok = false; }
    else {
      var age = (Date.now() - new Date(nasc).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      if (age < 18) {
        document.getElementById('err-nasc').textContent = 'Você precisa ter ao menos 18 anos';
        setErr('err-nasc', true); setFieldErr('f-nascimento', true); ok = false;
      }
    }
    if (ok) goStep(3);
  });

  // ── Passo 3 ─────────────────────────────────────────────────

  document.getElementById('btn-back-3').addEventListener('click', function () { goStep(2); });

  document.getElementById('btn-step3').addEventListener('click', function () {
    var cep   = document.getElementById('f-cep').value.replace('-', '');
    var terms = document.getElementById('f-terms').checked;
    var ok    = true;

    setErr('err-cep', false);   setFieldErr('f-cep', false);
    setErr('err-terms', false);

    if (cep.length !== 8) { setErr('err-cep', true); setFieldErr('f-cep', true); ok = false; }
    if (!terms) { setErr('err-terms', true); ok = false; }
    if (ok) goStep(4);
  });

  // ── Passo 4 — seleção de plano ──────────────────────────────

  document.getElementById('btn-back-4').addEventListener('click', function () { goStep(3); });

  document.querySelectorAll('#reg-plan-cards .plan-card').forEach(function (card) {
    card.addEventListener('click', function () {
      document.querySelectorAll('#reg-plan-cards .plan-card').forEach(function (c) {
        c.classList.remove('is-selected');
      });
      card.classList.add('is-selected');
      selectedPlan = card.getAttribute('data-plan');

      var ccForm = document.getElementById('reg-cc-form');
      if (selectedPlan === 'starter') {
        ccForm.classList.remove('is-visible');
      } else {
        ccForm.classList.add('is-visible');
      }
    });
  });

  // ── Passo 4 — envio via AJAX ────────────────────────────────

  document.getElementById('btn-step4').addEventListener('click', function () {
    var btn     = document.getElementById('btn-step4');
    var btnText = document.getElementById('btn-step4-text');
    var btnIcon = btn.querySelector('svg');

    btn.classList.add('is-loading');
    btnText.textContent = 'Criando conta...';
    btnIcon.classList.add('is-hidden');

    var spinner = document.createElement('div');
    spinner.className = 'spinner spinner--md spinner--dark';
    btn.insertBefore(spinner, btn.firstChild);

    var nome  = document.getElementById('f-nome').value.trim();
    var email = document.getElementById('f-email').value.trim();
    var pw    = document.getElementById('f-password').value;
    var pw2   = document.getElementById('f-password2').value;

    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE_URL + '/api/Users/register');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (_) { data = {}; }

      if (xhr.status >= 200 && xhr.status < 300) {
        localStorage.setItem('ilumix_plan', selectedPlan);
        document.getElementById('form-body').classList.add('is-hidden');
        document.getElementById('success-screen').classList.add('is-visible');
        setTimeout(function () { window.location.href = 'login.html'; }, 2500);

      } else {
        btn.classList.remove('is-loading');
        btnText.textContent = 'Criar conta';
        btnIcon.classList.remove('is-hidden');
        var sp = btn.querySelector('.spinner');
        if (sp) sp.remove();

        var errEl = document.getElementById('api-error-msg');
        if (!errEl) {
          errEl = document.createElement('div');
          errEl.id = 'api-error-msg';
          errEl.className = 'api-error';
          btn.parentElement.insertBefore(errEl, btn);
        }
        errEl.textContent = (data && data.message) ? data.message : 'Erro ao criar conta. Tente novamente.';
      }
    };

    xhr.onerror = function () {
      btn.classList.remove('is-loading');
      btnText.textContent = 'Criar conta';
      btnIcon.classList.remove('is-hidden');
      var sp = btn.querySelector('.spinner');
      if (sp) sp.remove();

      var errEl = document.getElementById('api-error-msg');
      if (!errEl) {
        errEl = document.createElement('div');
        errEl.id = 'api-error-msg';
        errEl.className = 'api-error';
        btn.parentElement.insertBefore(errEl, btn);
      }
      errEl.textContent = 'Não foi possível conectar ao servidor.';
    };

    xhr.send(JSON.stringify({ name: nome, email: email, password: pw, confirmPassword: pw2 }));
  });

  // ── Modais ──────────────────────────────────────────────────

  function openModal(id) { document.getElementById(id).classList.add('is-open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('is-open'); }

  document.getElementById('cad-link-terms').addEventListener('click', function (e) { e.preventDefault(); openModal('cad-modal-terms'); });
  document.getElementById('cad-link-privacy').addEventListener('click', function (e) { e.preventDefault(); openModal('cad-modal-privacy'); });

  document.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { closeModal(btn.getAttribute('data-close')); });
  });

  document.querySelectorAll('.auth-modal').forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal(modal.id);
    });
  });

});
