# 💰 FinFlow — Gestão Financeira Pessoal

Sistema completo de gestão financeira pessoal com backend Node.js e frontend React. Inclui controle de contas, transações, investimentos, sonhos e consultoria com IA integrada.

---

## 🚀 Como Rodar (Passo a Passo)

### Pré-requisitos

Você precisa ter o **Node.js** instalado na sua máquina.

**Verificar se já tem:**
```bash
node -v
```
Se aparecer um número de versão (ex: `v20.11.0`), está pronto. Se não, baixe em: https://nodejs.org (escolha a versão LTS)

---

### 1. Extraia o projeto

Descompacte o arquivo `finflow.zip` em uma pasta de sua escolha. Por exemplo:
```
C:\Users\SeuNome\projetos\finflow\   (Windows)
~/projetos/finflow/                  (Mac/Linux)
```

---

### 2. Abra o terminal na pasta do projeto

**Windows:** Clique com o botão direito dentro da pasta → "Abrir no Terminal" (ou PowerShell)

**Mac:** Clique com o botão direito na pasta → "Novo Terminal na Pasta"

**Linux:** Abra o terminal e navegue com `cd ~/projetos/finflow`

---

### 3. Instale as dependências

```bash
npm install
```

Aguarde o download (pode levar 1–2 minutos na primeira vez).

---

### 4. Inicie o backend e o frontend

Abra dois terminais separados.

No primeiro terminal, inicie o backend:
```bash
npm run start:server
```

No segundo terminal, inicie o frontend:
```bash
npm run dev
```

Você verá algo assim no terminal:
```
  VITE v5.x.x  ready in 400 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

### 5. Acesse no navegador

Abra: **http://localhost:5173**

**Primeiro acesso:** Defina uma senha única para toda a conta, depois escolha qual perfil acessar (Gustavo, Larissa ou Casal).

---

## 🛑 Para parar o servidor

No terminal, pressione `Ctrl + C`

---

## 📁 Estrutura do Projeto

```
finflow/
├── server/
│   ├── index.js              ← Backend Express com API REST
│   └── state.json            ← Dados persistidos localmente
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Header.jsx    ← Navegação, perfis e temas
│   │   │   └── UI.jsx        ← Componentes reutilizáveis
│   │   ├── Login/
│   │   │   └── Login.jsx     ← Sistema de login único + seleção de perfil
│   │   ├── Dashboard/
│   │   │   └── Dashboard.jsx ← Controle financeiro + edição de transações
│   │   ├── Contas/
│   │   │   └── Contas.jsx    ← CRUD completo de contas/cartões
│   │   ├── Investimentos/
│   │   │   └── Investimentos.jsx ← Portfólio e reserva de emergência
│   │   ├── Sonhos/
│   │   │   └── Sonhos.jsx    ← Metas e sonhos do casal
│   │   └── IAChat/
│   │       └── IAChat.jsx    ← Consultoria com IA integrada
│   ├── data/
│   │   └── mockData.js       ← Dados fictícios iniciais
│   ├── hooks/
│   │   └── useUtils.js       ← Funções auxiliares (formatação, etc.)
│   ├── store/
│   │   └── useStore.js       ← Estado global (Zustand)
│   ├── App.jsx               ← App principal com roteamento
│   ├── main.jsx              ← Ponto de entrada React
│   └── index.css             ← Estilos globais + variáveis CSS
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

---

## ⚙️ Funcionalidades Completas

### 🔐 Sistema de Autenticação
- **Login único**: Uma senha para acessar toda a conta
- **Seleção de perfil**: Após login, escolha entre Gustavo, Larissa ou Casal
- **Perfis diferenciados**: Cada perfil tem dados independentes
- **Logout**: Disponível no cabeçalho da aplicação

### 🎨 Temas Personalizáveis
- **4 temas**: Azul (padrão), Rosa (Larissa), Verde (Casal), Laranja (Sunset)
- **Por perfil**: Cada perfil pode ter um tema diferente
- **Dinâmico**: Mudança instantânea de cores e interface

### 📊 Dashboard Completo
- **Visão financeira**: Entradas, saídas e saldo do mês
- **Saldo VR**: Vale Refeição separado do saldo principal
- **Transações**: Lista completa com edição e exclusão
- **Gráficos**: Pizza e barras por categoria de gastos
- **Responsivo**: Layout adaptado para mobile/tablet/desktop
- **Perfil Casal**: Apenas visualização (sem criar/editar)

### 💳 Contas e Cartões (CRUD Completo)
- **Tipos suportados**: Conta Corrente, Investimento, Vale Refeição, Cartão de Crédito
- **Operações**: Criar, editar, excluir contas
- **Saldo automático**: Atualização em tempo real
- **Perfil Casal**: Apenas visualização consolidada

### 📈 Investimentos e Reserva
- **Reserva de emergência**: Meta configurável com progresso visual
- **Portfólio**: CDB, Fundos, Previdência, Ações
- **Gráfico visual**: Distribuição da carteira
- **Transações**: Adicionar/remover investimentos
- **Responsividade**: Interface otimizada para todos os dispositivos

### 🎯 Sonhos e Metas
- **Objetivos compartilhados**: Disponível apenas no perfil Casal
- **Progresso visual**: Barras de progresso para cada sonho
- **Cálculo automático**: Quanto guardar por mês para atingir prazos
- **Reordenação**: Arrastar e soltar para ajustar prioridades
- **CRUD completo**: Criar, editar, excluir sonhos
- **Emojis**: Personalização visual dos objetivos

### 🤖 Consultoria IA Integrada
- **Google Gemini**: Análise inteligente dos seus dados financeiros
- **Contexto real**: IA usa suas transações, contas e investimentos
- **Prompts pré-definidos**: Sugestões rápidas para diferentes análises
- **Transparência**: Visualização do JSON enviado para a IA
- **Disponível apenas no perfil Casal**

### 📱 Responsividade Total
- **Mobile-first**: Interface otimizada para smartphones
- **Tablet**: Layout adaptado para tablets
- **Desktop**: Experiência completa em telas grandes
- **Touch-friendly**: Controles adequados para toque
- **Tipografia**: Fonte Sora consistente em todos os dispositivos

---

## 🤖 Configuração da IA

A chave do Google AI Studio está pré-configurada no backend. Para trocar:

1. Edite `DEFAULT_GEMINI_API_KEY` em `server/index.js`
2. Ou defina a variável de ambiente `GEMINI_API_KEY`

A IA só é chamada na aba **Consultoria IA** e as requisições são proxyadas pelo backend local.

---

## 💾 Dados e Persistência

- **Backend local**: Dados salvos em `server/state.json`
- **SessionStorage**: Dados de sessão no navegador
- **Sincronização**: Dados carregados automaticamente por perfil
- **Export**: Console do navegador → `localStorage` para exportar

---

## 🔐 Segurança

### Como funciona
1. **Senha única**: Uma senha para toda a conta
2. **Hash PBKDF2**: Senha processada no backend (100k iterações)
3. **Rate limiting**: Máximo 5 tentativas a cada 15 minutos
4. **Local**: Autenticação processada localmente

### ⚠️ Avisos Importantes
- **Não use senhas reais/sensíveis**
- **Dados visíveis**: localStorage acessível via DevTools
- **Desenvolvimento**: Sistema para uso pessoal local
- **Produção**: Considere OAuth/JWT para segurança real

---

## 🎨 Temas Disponíveis

| Tema | Cor Principal | Visual | Perfil Sugerido |
|---|---|---|---|
| **Azul** | Azul ciano | Noturno limpo | Gustavo |
| **Rosa** | Rosa/Magenta | Noturno quente | Larissa |
| **Verde** | Verde esperança | Noturno natural | Casal |
| **Laranja** | Laranja/Ouro | Noturno sunset | Personalizado |

---

## 🚀 Deploy no Render

O FinFlow está configurado para deploy completo no Render.

### Passos para deploy

1. **Build local** (opcional para testar):
```bash
npm run build
```

2. **Suba para GitHub**:
```bash
git init
git add .
git commit -m "FinFlow completo"
git remote add origin https://github.com/seu-usuario/finflow.git
git push -u origin main
```

3. **Deploy no Render**:
   - Acesse https://render.com
   - Conecte seu repositório Git
   - Crie um **Web Service**
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:server`
   - **Environment**: `NODE_ENV=production`
   - **(Opcional)**: `GEMINI_API_KEY` para IA

4. **Acesse**: URL gerada pelo Render

### ⚠️ Sobre GitHub Pages
O GitHub Pages **não funciona** mais pois o sistema agora requer backend Node.js para autenticação e funcionalidades completas.

---

## 🛠 Personalização

### Dados Iniciais
Edite `src/data/mockData.js` para alterar:
- Nomes dos perfis
- Contas bancárias iniciais
- Transações de exemplo
- Metas de investimento
- Sonhos do casal

### Temas
Modifique as variáveis CSS em `src/components/Login/Login.jsx` para criar novos temas.

---

## 🔄 Resetar Dados

Para começar do zero:

1. **Frontend**: Abra DevTools (F12) → Application → Local Storage → Delete itens `finflow_*`
2. **Backend**: Delete `server/state.json` e reinicie o servidor
3. **Recarregue** a página

Ou via console:
```javascript
Object.keys(localStorage).forEach(k => {
  if (k.startsWith('finflow_')) localStorage.removeItem(k)
})
```

---

## 🐛 Problemas Comuns

**"npm não é reconhecido"**
→ Instale Node.js em https://nodejs.org

**"Porta 5173 ocupada"**
→ `npm run dev -- --port 3000`

**"Erro de módulo"**
→ Execute `npm install` novamente

**"Esqueci a senha"**
→ Delete `finflow_pwd_hash` no localStorage via DevTools

**"IA não responde"**
→ Verifique API Key do Google Gemini

**"Perfil Casal sem botões"**
→ Normal! É uma restrição de design para visualização consolidada

---

## 📦 Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| **React** | 18.x | Interface interativa |
| **Vite** | 5.x | Build tool e dev server |
| **Node.js/Express** | 18.x | Backend API REST |
| **Tailwind CSS** | 3.x | Estilização responsiva |
| **Zustand** | 4.x | Gerenciamento de estado |
| **Recharts** | 2.x | Gráficos interativos |
| **Google Gemini** | 2.5-flash | IA integrada |
| **Lucide React** | 0.344 | Ícones modernos |
| **React Markdown** | 9.x | Renderização de texto IA |

---

## 📈 Status do Projeto

✅ **Funcionalidades Implementadas:**
- Sistema de login único com perfis
- Dashboard completo com edição de transações
- CRUD de contas e cartões
- Gestão de investimentos e reserva
- Sistema de sonhos e metas
- Consultoria IA integrada
- Temas personalizáveis
- Responsividade total
- Deploy no Render

🔄 **Próximas Melhorias:**
- Export/import de dados
- Relatórios PDF
- Notificações push
- Sincronização em nuvem

---

**FinFlow** — Sua gestão financeira pessoal completa e inteligente! 🚀
