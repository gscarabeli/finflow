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
│   │   │   ├── Header.jsx        ← Navegação, perfil e temas
│   │   │   └── UI.jsx            ← Componentes reutilizáveis
│   │   ├── Login/
│   │   │   └── Login.jsx         ← Tela de autenticação
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
│   ├── App.jsx                   ← App com temas dinâmicos
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

---

## ⚙️ Funcionalidades

### Autenticação
- Sistema de login por perfil com senha
- Senha salva localmente no navegador (com encoding básico)
- Logout disponível no cabeçalho

### Temas
- 4 temas personalizáveis (Azul, Rosa, Verde, Laranja)
- Cada perfil pode ter um tema diferente
- Alteração de fundo, texto e componentes dinamicamente

### Dashboard
- Visão de entradas, saídas e saldo do mês
- Saldo do Alelo (VR) exibido separadamente
- Lista de transações com categorias
- Gráficos de pizza e barras por categoria
- Gerenciamento de contas e cartões
- Adicionar e excluir transações
- Layout responsivo para mobile/tablet

### Investimentos
- Acompanhamento de reserva de emergência com barra de progresso
- Distribuição do portfólio (CDB, Fundos, Previdência, Ações)
- Gráfico visual da carteira
- Responsividade para telas menores

### Sonhos & Metas
- Cadastro de objetivos financeiros (Casa, Viagem, Aliança, etc.)
- Progresso visual de cada sonho
- Cálculo automático de quanto guardar por mês para atingir o prazo
- Linha do tempo de todos os sonhos
- Reordenação por arrastar e soltar — ajuste a prioridade dos sonhos facilmente
- Edição e exclusão de sonhos
- Disponível apenas no perfil "Casal" — sonhos compartilhados do casal

### Consultoria IA
- Chat com IA usando seus dados financeiros reais como contexto
- Análise de gastos, dicas de investimento e saúde financeira
- Prompts rápidos pré-definidos
- Exibe o JSON enviado para a IA (transparência total)

### Sistema de Perfis
- **Gustavo** — visão individual
- **Larissa** — visão individual
- **Casal** — visão consolidada (soma de tudo)

### Informações Especiais
- **Alelo (VR):** suporte para Vale Refeição separado do saldo principal
- **Responsividade:** funciona em desktop, tablet e mobile
- **Persistência:** todos os dados salvos automaticamente no localStorage

### Responsividade Mobile
- **Layout adaptativo**: Interface otimizada para desktop, tablet e mobile
- **Grids responsivas**: Cards e componentes se ajustam automaticamente ao tamanho da tela
- **Tipografia escalável**: Textos legíveis em qualquer dispositivo
- **Navegação touch-friendly**: Botões e controles adequados para toque
- **Consultoria IA**: Chat e contexto responsivos, sem overflow de texto
- **Dashboard**: Estatísticas organizadas em grid 2x2 no mobile, expandindo para 4 colunas no desktop

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
- **Autenticação local:** uso de senha com encoding básico (não criptografado — veja seção de segurança)
- **Para exportar seus dados:** abra o console do navegador (F12) → Console → `localStorage`

---

## 🔐 Autenticação e Segurança

### Como funciona

1. Na primeira vez que acessa, defina uma senha
2. Essa senha é armazenada no `localStorage` com encoding básico (não é criptografia forte)
3. O sistema valida a senha localmente e não envia nada para servidor externo

### ⚠️ Aviso de Segurança Importante

**NÃO use senhas sensíveis ou reais.** Este sistema foi desenvolvido para uso pessoal local e em repositórios públicos. A segurança é **limitada** porque:

- ❌ A senha é armazenada no navegador (visível via DevTools)
- ❌ O encoding é básico (`btoa`), não é criptografia real
- ❌ Qualquer pessoa com acesso ao seu PC pode ver a senha
- ❌ Se publicar em GitHub Pages, o código-fonte é público

**Recomendações:**
- Use uma senha simples (ex: `1234` ou `senha123`)
- Não guarde dados financeiros reais/sensíveis no localStorage público
- Se precisar segurança real, use um backend com autenticação OAuth/JWT
- Considere usar este sistema apenas para planejamento/simulação

---

## 🎨 Temas Personalizáveis

O FinFlow oferece **4 temas** que mudam cores de fundo, texto e interface:

| Tema | Cor Principal | Visual |
|---|---|---|
| **Azul** (padrão) | Azul ciano | Noturno limpo |
| **Rosa** (Larissa) | Rosa/Magenta | Noturno quente |
| **Verde** (Casal) | Verde esperança | Noturno natural |
| **Laranja** (Sunset) | Laranja/Ouro | Noturno quente/sunset |

Cada perfil (Gustavo, Larissa, Casal) pode ter um tema diferente. A preferência fica salva no localStorage.

---

## 🚀 Publicação em GitHub Pages

O FinFlow está pronto para ser publicado em GitHub Pages de forma estática.

### Passos para publicar

1. **Tenha um repositório Git:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Mude a URL base** (opcional, se usar `seu-usuario.github.io/finflow`):
   Edite `vite.config.js`:
   ```js
   export default defineConfig({
     base: './',  // ou '/finflow/' se em subdiretório
     plugins: [react()],
   })
   ```

3. **Build para produção:**
   ```bash
   npm run build
   ```

4. **Push para GitHub:**
   ```bash
   git remote add origin https://github.com/seu-usuario/seu-repo.git
   git branch -M main
   git push -u origin main
   ```

5. **Ative GitHub Pages nos settings:**
   - Vá em **Settings** → **Pages**
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Pasta: **/root** (ou `/dist` se usar outro build)

6. **Acesse:**
   ```
   https://seu-usuario.github.io
   ```

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

## 🔄 Resetar Dados e Senha

Para começar do zero (apagar todos os dados e senha salvos):

1. Abra o navegador em http://localhost:5173
2. Pressione **F12** (DevTools)
3. Vá na aba **Application** → **Local Storage** → **http://localhost:5173**
4. Delete os itens:
   - `finflow_auth`
   - `finflow_pwd_hash`
   - `finflow_eu`
   - `finflow_ela`
   - `finflow_sonhos`
   - Outros itens `finflow_*`
5. Recarregue a página (F5)
6. Acesse novamente — você poderá definir uma nova senha

Ou, via console (F12 → Console):
```javascript
// Limpar tudo
Object.keys(localStorage).forEach(k => {
  if (k.startsWith('finflow_')) localStorage.removeItem(k)
})
```

---

## 🐛 Problemas Comuns

**"npm não é reconhecido"**
→ Node.js não está instalado. Baixe em https://nodejs.org

**"Porta 5173 já está em uso"**
→ Execute `npm run dev -- --port 3000` para usar outra porta

**"Error: Cannot find module"**
→ Rode `npm install` novamente

**"Esqueci a senha"**
→ Abra o DevTools (F12), vá em **Application** → **Local Storage**, procure por `finflow_pwd_hash` e delete. Depois recarregue e defina uma nova.

**"IA não responde"**
→ Verifique se a API Key está correta e tem créditos em https://console.anthropic.com

**"Dados desapareceram"**
→ Se limpou o localStorage ou trocou de navegador, os dados se perdem. Use **Exportar dados** antes ou edite `mockData.js` para ter dados padrão.

---

## 📤 Deploy Automático (GitHub Pages)

Para facilitar o deploy, use o script npm incluído:

```bash
npm run deploy
```

Este script:
1. Faz build da aplicação
2. Push para a branch `gh-pages` do seu repositório
3. GitHub Pages detecta automaticamente e publica

**Pré-requisito:** você precisa ter um repositório Git configurado com remote `origin`.

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
