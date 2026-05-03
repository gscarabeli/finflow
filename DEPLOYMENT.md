# Deploy do FinFlow

O FinFlow é um monorepo: o mesmo servidor Express serve a API e os arquivos estáticos do React em produção.

---

## Render.com (recomendado)

### 1. Suba o código para o GitHub

```bash
git add .
git commit -m "deploy"
git push
```

### 2. Crie um Web Service no Render

- **Runtime:** Node
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`

### 3. Configure as variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `NODE_ENV` | Sim | `production` |
| `JWT_SECRET` | Sim | String aleatória forte (use `openssl rand -hex 32`) |
| `APP_URL` | Sim | URL pública do serviço, ex: `https://finflow-xxxx.onrender.com` |
| `RESEND_API_KEY` | Sim | Chave do Resend para envio de e-mails |
| `GEMINI_API_KEY` | Sim | Chave do Google AI Studio para a IA |
| `PORT` | Não | Padrão `4000` |
| `VITE_TURNSTILE_SITE_KEY` | Não | Site key do Cloudflare Turnstile (anti-bot) |
| `TURNSTILE_SECRET_KEY` | Não | Secret key do Cloudflare Turnstile |

> **Atenção:** `VITE_TURNSTILE_SITE_KEY` é embutida no bundle React no momento do build. Se adicionar/alterar essa variável, é necessário um novo deploy completo (não apenas reiniciar).

### 4. Acesse

A URL gerada pelo Render já serve tanto a API quanto o frontend.

---

## Outras opções

### Railway

1. Crie conta em https://railway.app
2. Conecte o repositório — Railway detecta Node.js automaticamente
3. Configure as mesmas variáveis de ambiente listadas acima

### VPS (DigitalOcean, Linode, etc.)

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/finflow.git
cd finflow

# Instale dependências e faça o build
npm install
npm run build

# Configure variáveis de ambiente
cp .env.example .env
# edite .env com os valores reais

# Inicie
npm start
```

Configure Nginx como proxy reverso e use Let's Encrypt para HTTPS.

---

## Variáveis opcionais: Cloudflare Turnstile

O Turnstile adiciona verificação anti-bot na tela de login (sem selecionar imagens). Sem as variáveis configuradas, os formulários funcionam normalmente sem verificação.

Para ativar:
1. Crie um site em https://dash.cloudflare.com → Turnstile
2. Configure o domínio permitido (ex: `finflow-xxxx.onrender.com`)
3. Adicione `VITE_TURNSTILE_SITE_KEY` e `TURNSTILE_SECRET_KEY` no Render
4. Faça um novo deploy para que o frontend inclua a chave no bundle

---

## Persistência de dados

Os dados ficam em `server/state.json`. No Render (plano gratuito), o disco é efêmero — os dados são perdidos a cada deploy ou reinicialização.

Para persistência permanente:
- Use o plano pago do Render com disco persistente, ou
- Migre para um banco de dados (PostgreSQL no Render, por exemplo)

---

## Problemas comuns no build

**"vite: not found"**
→ Confirme que `vite` está em `dependencies` (não em `devDependencies`) no `package.json`.

**"No matching version found for @types/react-dom"**
→ Use `@types/react-dom: "^18.3.3"` em vez de versões que não existem.

**VITE_ env var não aparece no frontend após deploy**
→ Variáveis `VITE_*` são embutidas no build. Adicionar no painel e reiniciar não basta — é preciso um novo build completo.
