# 🚀 Hospedagem do FinFlow

## ⚠️ AVISO IMPORTANTE DE SEGURANÇA

**NÃO use dados financeiros reais nesta versão hospedada.** Os dados são armazenados sem encriptação forte e podem ser comprometidos. Use apenas para teste e planejamento.

## Opções de Hospedagem

### 1. Render.com (Recomendado - Fácil)

#### Passos:
1. Crie conta em https://render.com
2. Conecte seu repositório Git
3. Crie um **Web Service**
4. Configure:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
5. Adicione variáveis de ambiente:
   - `JWT_SECRET`: uma string aleatória forte (gere em https://www.uuidgenerator.net/)
   - `GEMINI_API_KEY`: sua chave do Google AI Studio
   - `NODE_ENV`: `production`

#### Exemplo de configuração no Render:
```
Build Command: npm install && npm run build
Start Command: npm start
Environment: production
```

### 2. Railway (Alternativa)

1. Crie conta em https://railway.app
2. Conecte o repositório
3. Railway detecta automaticamente Node.js
4. Configure variáveis de ambiente iguais ao Render

### 3. VPS Próprio (Mais Seguro, Mas Caro)

Para mais controle, use um VPS (DigitalOcean, Linode, etc.):
- Instale Node.js
- Clone o repositório
- Configure Nginx como proxy reverso com HTTPS
- Use Let's Encrypt para certificado SSL

## Configuração de Produção

### 1. Variáveis de Ambiente

Copie `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

Edite `.env`:
```env
JWT_SECRET=uma-string-aleatoria-muito-forte-aqui
GEMINI_API_KEY=sua-chave-do-google-ai-studio
NODE_ENV=production
```

### 2. JWT Secret Seguro

**IMPORTANTE:** Nunca use o valor padrão em produção!

Gere um secret forte:
- Use https://www.uuidgenerator.net/ (versão 4)
- Ou gere via terminal: `openssl rand -hex 32`

### 4. Problemas Comuns no Deploy

#### ❌ Erro: "No matching version found for @types/react-dom@^18.3.12"
**Sintomas:** Build falha com erro de versão não encontrada
**Solução:** Use versões específicas que existem:
```json
"@types/react-dom": "^18.3.3"
```
Versões @types nem sempre seguem exatamente as versões do React.

#### ❌ Erro: "vite: not found"
**Sintomas:** Build falha porque Vite não está disponível
**Solução:** Mova dependências de build para `dependencies`:
```json
"dependencies": {
  "vite": "^5.4.11",
  "@vitejs/plugin-react": "^4.3.3",
  "tailwindcss": "^3.4.15",
  "autoprefixer": "^10.4.20",
  "postcss": "^8.4.49"
}
```

#### ❌ Erro: "sh: 1: [command]: not found"
**Sintomas:** Comandos não encontrados no ambiente Linux do Render
**Solução:** Use apenas `npm` scripts, não comandos globais

### 4. Backup de Dados

Como os dados ficam em `server/state.json`, faça backup regular:

```bash
# Script simples de backup
cp server/state.json backup-$(date +%Y%m%d).json
```

## Segurança Implementada

### ✅ Melhorias para Hospedagem
- HTTPS forçado em produção
- JWT tokens com expiração de 24h
- Helmet para headers de segurança
- CSP (Content Security Policy) básica
- Rate limiting ativo

### ❌ Limitações Conhecidas
- Dados não encriptados em repouso
- Sem 2FA
- Sem auditoria avançada
- Dependente da segurança do provedor de hospedagem

## Monitoramento

### Logs
O Render/Railway mostra logs em tempo real. Monitore por:
- Tentativas de login suspeitas
- Erros 401/403
- Uso excessivo da API

### Backup
- Exporte dados periodicamente via interface
- Mantenha backups locais seguros

## Custo Estimado

- **Render:** Gratuito para uso básico, ~$7/mês para sempre online
- **Railway:** ~$5/mês para hobby
- **VPS:** ~$5-10/mês dependendo do provedor

## Próximos Passos para Segurança Real

Se quiser usar dados reais, implemente:
1. Banco de dados (PostgreSQL)
2. Encriptação de dados
3. 2FA
4. Logs de auditoria
5. Pen testing

Mas isso transforma o projeto em uma aplicação enterprise.