# 💰 FinFlow — Gestão Financeira Pessoal

Sistema web de gestão financeira pessoal, privado e local. Todos os dados ficam no seu navegador (localStorage). Nenhum dado é enviado para servidores externos.

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

### 4. Inicie o sistema

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

O sistema já inicia com dados fictícios (mock data) para você ver tudo funcionando imediatamente. ✅

---

## 🛑 Para parar o servidor

No terminal, pressione `Ctrl + C`

---

## 📁 Estrutura do Projeto

```
finflow/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Header.jsx        ← Navegação e troca de perfil
│   │   │   └── UI.jsx            ← Componentes reutilizáveis
│   │   ├── Dashboard/
│   │   │   └── Dashboard.jsx     ← Controle de caixa mensal
│   │   ├── Investimentos/
│   │   │   └── Investimentos.jsx ← Portfólio e reserva
│   │   ├── Sonhos/
│   │   │   └── Sonhos.jsx        ← Metas e sonhos do casal
│   │   └── IAChat/
│   │       └── IAChat.jsx        ← Consultoria com IA
│   ├── data/
│   │   └── mockData.js           ← Dados fictícios iniciais
│   ├── hooks/
│   │   └── useUtils.js           ← Funções auxiliares
│   ├── store/
│   │   └── useStore.js           ← Estado global (Zustand)
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## ⚙️ Funcionalidades

### Dashboard
- Visão de entradas, saídas e saldo do mês
- Lista de transações com categorias
- Gráficos de pizza e barras por categoria
- Gerenciamento de contas e cartões
- Adicionar e excluir transações

### Investimentos
- Acompanhamento de reserva de emergência com barra de progresso
- Distribuição do portfólio (CDB, Fundos, Previdência, Ações)
- Gráfico visual da carteira

### Sonhos & Metas
- Cadastro de objetivos financeiros (Casa, Viagem, Aliança, etc.)
- Progresso visual de cada sonho
- Cálculo automático de quanto guardar por mês para atingir o prazo
- Linha do tempo de todos os sonhos

### Consultoria IA
- Chat com IA usando seus dados financeiros reais como contexto
- Análise de gastos, dicas de investimento e saúde financeira
- Prompts rápidos pré-definidos
- Exibe o JSON enviado para a IA (transparência total)

### Sistema de Perfis
- **Lucas** — visão individual
- **Ana** — visão individual
- **Casal** — visão consolidada (soma de tudo)

---

## 🤖 Configurar a IA

1. Acesse: https://console.anthropic.com
2. Crie uma conta (gratuita para começar)
3. Vá em **API Keys** → **Create Key**
4. Copie a chave (começa com `sk-ant-api...`)
5. No FinFlow, vá na aba **Consultoria IA**
6. Cole a chave no campo amarelo e clique **Salvar**

A chave fica salva no localStorage do navegador e não é compartilhada com ninguém.

---

## 💾 Dados e Privacidade

- **100% local:** todos os dados ficam no `localStorage` do navegador
- **Sem servidor:** o sistema não faz nenhuma requisição externa (exceto para a API da Anthropic quando você usa a IA)
- **Sem cadastro:** não precisa de conta ou login
- **Para exportar seus dados:** abra o console do navegador (F12) → Console → `localStorage`

---

## 🛠 Personalizar os Dados Iniciais

Edite o arquivo `src/data/mockData.js` para alterar:
- Nomes dos perfis (`eu.nome`, `ela.nome`)
- Contas bancárias
- Transações iniciais
- Metas de investimento
- Sonhos do casal

Após editar, salve o arquivo — o Vite recarrega automaticamente.

---

## 🔄 Resetar Todos os Dados

Para começar do zero (apagar todos os dados salvos):

1. Abra o navegador em http://localhost:5173
2. Pressione **F12** (DevTools)
3. Vá na aba **Application** → **Local Storage** → **http://localhost:5173**
4. Clique com o botão direito → **Clear**
5. Recarregue a página (F5)

---

## 🐛 Problemas Comuns

**"npm não é reconhecido"**
→ Node.js não está instalado. Baixe em https://nodejs.org

**"Porta 5173 já está em uso"**
→ Execute `npm run dev -- --port 3000` para usar outra porta

**"Error: Cannot find module"**
→ Rode `npm install` novamente

**IA não responde**
→ Verifique se a API Key está correta e tem créditos em https://console.anthropic.com

---

## 📦 Tecnologias

| Tecnologia | Uso |
|---|---|
| React 18 | Interface |
| Vite 5 | Build tool / servidor local |
| Tailwind CSS | Estilização |
| Recharts | Gráficos |
| Zustand | Estado global |
| Lucide React | Ícones |
| Anthropic API | IA (opcional) |
| localStorage | Persistência de dados |
