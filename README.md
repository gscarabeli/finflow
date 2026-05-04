# FinFlow — Gestão Financeira Pessoal

Sistema de gestão financeira com contas individuais, sistema de casal, controle de transações, cartões de crédito, investimentos, sonhos e consultoria com IA.

---

## Pré-requisitos

- **Node.js 18+** — verifique com `node -v`. Se não tiver, baixe em https://nodejs.org (versão LTS)

---

## Rodando localmente

### 1. Instale as dependências

```bash
npm install
```

### 2. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

Variáveis obrigatórias para desenvolvimento:

```env
JWT_SECRET=qualquer-string-aleatoria-forte
RESEND_API_KEY=re_...           # https://resend.com
GEMINI_API_KEY=AIza...          # https://aistudio.google.com/apikey
DATABASE_URL=postgresql://...   # Supabase ou PostgreSQL local
APP_URL=http://localhost:4000
NODE_ENV=development
```

Para ativar a verificação anti-bot (opcional em dev):

```env
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA   # chave de teste (sempre passa)
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
```

### 3. Inicie o servidor

```bash
npm start          # backend (porta 4000)
npm run dev        # frontend (porta 5173, em outro terminal)
```

Acesse: **http://localhost:5173**

### 4. Crie sua conta

Na tela de login, clique em **Criar conta**. Você receberá um e-mail de verificação antes de conseguir acessar.

---

## Estrutura do Projeto

```
finflow/
├── server/
│   └── index.js          ← API REST (Express + JWT + PBKDF2 + PostgreSQL)
├── src/
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Header.jsx       ← Navegação, troca Solo/Casal, invite, calculadora
│   │   │   ├── BankLogo.jsx     ← Logos e tipos de contas
│   │   │   └── UI.jsx           ← Componentes reutilizáveis
│   │   ├── Login/
│   │   │   └── Login.jsx        ← Login, cadastro, verificação, reset
│   │   ├── Dashboard/
│   │   │   └── Dashboard.jsx    ← Transações, saldo, gráficos por categoria
│   │   ├── Contas/
│   │   │   └── Contas.jsx       ← CRUD de contas e cartões
│   │   ├── APagar/
│   │   │   └── APagar.jsx       ← Contas a pagar, vencimentos, status
│   │   ├── Credito/
│   │   │   └── Credito.jsx      ← Faturas de cartão, ciclo, histórico
│   │   ├── Investimentos/
│   │   │   └── Investimentos.jsx ← Portfólio e reserva de emergência
│   │   ├── Sonhos/
│   │   │   └── Sonhos.jsx       ← Metas e sonhos com progresso
│   │   └── IAChat/
│   │       └── IAChat.jsx       ← Consultoria com Google Gemini
│   ├── data/
│   │   └── mockData.js          ← Constantes de categorias e cores
│   ├── hooks/
│   │   ├── useSecurity.js       ← Armazenamento seguro (sessionStorage)
│   │   └── useUtils.js          ← Funções auxiliares (formatação, etc.)
│   ├── services/
│   │   └── apiClient.js         ← Chamadas à API REST
│   ├── store/
│   │   └── useStore.js          ← Estado global (Zustand)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── index.html
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## Funcionalidades

### Autenticação
- Cadastro com verificação de e-mail (link expira em 24h)
- Login com JWT (token válido por 7 dias)
- Recuperação de senha por e-mail (link expira em 1h)
- Anti-bot via Cloudflare Turnstile (configurável)
- Rate limiting com backoff progressivo

### Sistema de Casal
- Convite por e-mail para conectar contas
- Visão **Solo**: dados próprios com edição completa
- Visão **Casal**: dados consolidados (soma de saldos, transações de ambos)
- Sonhos compartilhados entre os dois perfis

### Contas e Cartões
- Tipos: Conta Corrente, Investimento, Vale Refeição, Vale Benefício, Cartão de Crédito, Corrente + Cartão
- Tipo **Corrente + Cartão**: conta que também funciona como cartão de crédito (ex: Nubank, Inter)
- Logo visual por banco (Santander, Nubank, Inter, Itaú, Bradesco e mais)
- Campos adicionais para cartões: limite e dia de fechamento

### Dashboard
- Entradas, saídas e saldo do mês
- Lista de transações com edição e exclusão
- Gráficos de pizza e barras por categoria (tooltip com nome correto)
- Seleção de cartão de crédito ao registrar uma saída
- Responsivo (mobile/tablet/desktop)

### Contas a Pagar
- Cadastro de compromissos com vencimento e categoria
- Status automático: Pago, Vencido, Vence hoje, Pendente
- Marcar como pago cria automaticamente uma transação de saída (reflete no saldo do mês)
- Resumo: total pendente, total pago, vencidos

### Crédito
- Seleção de cartão com reordenação por arrastar e soltar
- Fatura em aberto calculada pelo ciclo (dia de fechamento configurável)
- Projeção da próxima fatura (lançamentos agendados)
- Barra visual de uso do limite
- Gráfico de histórico dos últimos 6 meses

### Investimentos
- Reserva de emergência com meta e progresso visual
- Portfólio: CDB/CDI, Fundos, Previdência, Ações
- Gráfico de distribuição da carteira

### Sonhos e Metas
- Progresso visual por objetivo
- Cálculo de quanto guardar por mês para o prazo
- Reordenação por arrastar e soltar
- Disponível em Solo e Casal

### Consultoria IA
- Google Gemini com contexto financeiro real (transações, contas, investimentos)
- Prompts pré-definidos para análises comuns
- Disponível em Solo e Casal

### Temas
- Cor do tema personalizável por picker (16 presets + cor livre)
- Tema independente por modo de visualização (Solo / Casal)
- Todos os tons (bg, text, border) derivados automaticamente da cor escolhida

---

## Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| React | 18.x | Interface |
| Vite | 5.x | Build e dev server |
| Node.js / Express | 18.x | API REST |
| PostgreSQL (Supabase) | — | Banco de dados |
| Zustand | 5.x | Estado global |
| Tailwind CSS | 3.x | Estilização |
| Recharts | 2.x | Gráficos |
| @dnd-kit | 6.x | Drag and drop |
| Google Gemini | 2.5-flash | IA |
| Resend | — | Envio de e-mails |
| Cloudflare Turnstile | — | Anti-bot |
| Lucide React | — | Ícones |
| jsonwebtoken | 9.x | JWT |

---

## Problemas Comuns

**E-mail de verificação não chegou**
→ Verifique spam. Reenvie pelo link na tela de login.

**"IA não responde"**
→ Verifique se `GEMINI_API_KEY` está configurada no backend.

**"Porta 5173 ocupada"**
→ `npm run dev -- --port 3000`

**Esqueci a senha**
→ Use o link "Esqueci minha senha" na tela de login — você receberá um e-mail com instruções.

---

## Deploy

Veja [DEPLOYMENT.md](DEPLOYMENT.md) para instruções completas de deploy no Render.
