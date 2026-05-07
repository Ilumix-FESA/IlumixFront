# Ilumix Frontend — Como Rodar

## Pré-requisitos
- O backend rodando (veja `IlumixAPI-main/README.md`)
- [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) no VS Code **ou** qualquer servidor HTTP estático

## 1. Configurar a URL da API

Abra `js/api.js` e ajuste a variável na linha 1:

```js
// Desenvolvimento local:
const API_BASE_URL = 'http://localhost:5145';

// Produção (Railway/Render):
const API_BASE_URL = 'https://ilumix-api.up.railway.app';
```

## 2. Rodar localmente

### Opção A — VS Code Live Server (recomendado)
1. Abra a pasta `ilumix` no VS Code
2. Clique com o botão direito em `landing.html` → **Open with Live Server**
3. O app abre em `http://127.0.0.1:5500`

### Opção B — Python (qualquer terminal)
```bash
cd ilumix
python3 -m http.server 5500
# Acesse: http://localhost:5500
```

### Opção C — Node.js
```bash
npx serve ilumix -p 5500
```

## 3. Fluxo de uso

1. Acesse `landing.html` → página de apresentação
2. Clique em **Criar conta** → `cadastro.html`
3. Preencha nome, email, senha e conclua o cadastro
4. Faça login em `login.html`
5. Você é redirecionado para `index.html` → dashboard do app

## 4. Deploy no GitHub Pages

1. Faça push da pasta `ilumix` para um repositório GitHub
2. Vá em **Settings → Pages → Source: main branch / root**
3. Copie a URL gerada (ex: `https://seu-usuario.github.io/ilumix`)
4. No backend, adicione essa URL em `appsettings.json` → `AllowedOrigins`
5. No frontend, atualize `js/api.js` com a URL do backend em produção

## Estrutura de arquivos

```
ilumix/
├── landing.html          ← Página inicial (pública)
├── login.html            ← Login
├── cadastro.html         ← Criar conta
├── index.html            ← App principal (requer login)
├── css/
│   ├── variables.css
│   ├── base.css
│   ├── components.css
│   └── layout.css
└── js/
    ├── api.js            ← ⭐ Camada de API (NOVO)
    ├── data.js           ← Store de dados (mock + API)
    ├── router.js         ← Roteamento de páginas
    ├── ui.js             ← Componentes UI
    ├── main.js           ← Bootstrap (auth guard)
    └── pages/
        ├── dashboard.js
        ├── rooms.js
        ├── scenes.js
        ├── schedule.js
        ├── commands.js
        ├── energy.js
        └── wifi.js
```
