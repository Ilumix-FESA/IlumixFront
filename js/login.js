/* ============================================================
   ILUMIX — Login Page
   Autenticação via XMLHttpRequest (AJAX)
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  // Se já estiver logado, vai direto para o app
  if (localStorage.getItem('ilumix_token')) {
    window.location.href = 'index.html';
    return;
  }

  // ── Toggle visibilidade da senha ────────────────────────────
  var pwVisible = false;

  document.getElementById('toggle-pw').addEventListener('click', function () {
    pwVisible = !pwVisible;
    document.getElementById('password').type = pwVisible ? 'text' : 'password';
    document.getElementById('eye-icon').innerHTML = pwVisible
      ? '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>'
        + '<path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>'
        + '<line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
  });

  // ── Envio do formulário ─────────────────────────────────────
  document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    var emailInput = document.getElementById('email');
    var pwInput    = document.getElementById('password');
    var emailErr   = document.getElementById('email-error');
    var pwErr      = document.getElementById('pw-error');
    var btn        = document.getElementById('btn-login');

    var email = emailInput.value.trim();
    var pw    = pwInput.value;

    // Limpa erros anteriores
    emailErr.classList.remove('is-visible');
    emailInput.classList.remove('is-error');
    pwErr.classList.remove('is-visible');
    pwInput.classList.remove('is-error');

    // Validação
    var valid = true;
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      emailErr.classList.add('is-visible');
      emailInput.classList.add('is-error');
      valid = false;
    }
    if (!pw) {
      pwErr.classList.add('is-visible');
      pwInput.classList.add('is-error');
      valid = false;
    }
    if (!valid) return;

    // Estado de carregamento
    btn.classList.add('is-loading');
    btn.innerHTML = '<div class="spinner spinner--md spinner--dark"></div><span>Entrando...</span>';

    // ── Requisição AJAX ─────────────────────────────────────────
    var xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE_URL + '/api/auth/login');
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onload = function () {
      var data;
      try { data = JSON.parse(xhr.responseText); } catch (_) { data = {}; }

      if (xhr.status >= 200 && xhr.status < 300) {
        // Salva tokens e dados do usuário
        localStorage.setItem('ilumix_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('ilumix_refresh', data.refreshToken);
        }
        var u = data.user || {};
        localStorage.setItem('ilumix_user', JSON.stringify({
          id:    u.Id    || u.id,
          name:  u.Name  || u.name,
          email: u.Email || u.email
        }));

        // Exibe tela de sucesso
        document.getElementById('login-form-wrap').classList.add('is-hidden');
        document.getElementById('success-msg').classList.add('is-visible');
        setTimeout(function () { window.location.href = 'index.html'; }, 1800);

      } else {
        // Exibe mensagem de erro
        btn.classList.remove('is-loading');
        btn.innerHTML = '<span>Entrar</span>';
        pwErr.textContent = (data && data.message) ? data.message : 'Email ou senha inválidos.';
        pwErr.classList.add('is-visible');
        pwInput.classList.add('is-error');
      }
    };

    xhr.onerror = function () {
      btn.classList.remove('is-loading');
      btn.innerHTML = '<span>Entrar</span>';
      pwErr.textContent = 'Não foi possível conectar ao servidor.';
      pwErr.classList.add('is-visible');
      pwInput.classList.add('is-error');
    };

    xhr.send(JSON.stringify({ email: email, password: pw }));
  });

  // ── Modais ──────────────────────────────────────────────────
  function openModal(id) { document.getElementById(id).classList.add('is-open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('is-open'); }

  document.getElementById('link-forgot').addEventListener('click', function (e) { e.preventDefault(); openModal('modal-forgot'); });
  document.getElementById('link-terms').addEventListener('click', function (e) { e.preventDefault(); openModal('modal-terms'); });
  document.getElementById('link-privacy').addEventListener('click', function (e) { e.preventDefault(); openModal('modal-privacy'); });

  document.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.addEventListener('click', function () { closeModal(btn.getAttribute('data-close')); });
  });

  document.querySelectorAll('.auth-modal').forEach(function (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  document.getElementById('btn-forgot-send').addEventListener('click', function () {
    var email = document.getElementById('forgot-email').value.trim();
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      document.getElementById('forgot-email').classList.add('is-error');
      return;
    }
    document.getElementById('forgot-email').classList.remove('is-error');
    document.getElementById('btn-forgot-send').textContent = 'Link enviado!';
    document.getElementById('btn-forgot-send').disabled = true;
    setTimeout(function () { closeModal('modal-forgot'); }, 1500);
  });

});
