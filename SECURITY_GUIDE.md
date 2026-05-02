# 🔐 Guia de Segurança para FinFlow

## Melhorias Implementadas ✅

### 1. **Autenticação Forte**
- ✅ PBKDF2 com 100.000 iterações (OWASP 2023 recomendado)
- ✅ Salt aleatório de 16 bytes por senha
- ✅ Comparação de tempo constante (proteção contra timing attacks)
- ✅ Rate limiting: 5 tentativas a cada 15 minutos por perfil

**Antes:** `btoa(password)` (Base64 - não é seguro)
**Depois:** PBKDF2 com SHA-256 (padrão da indústria)

---

### 2. **Armazenamento Seguro**
- ✅ **sessionStorage** para dados sensíveis no navegador (expiram ao fechar aba)
- ✅ Dados financeiros do backend são gravados em `server/state.json`
- ✅ Limpeza completa de dados ao fazer logout
- ✅ Sem dados sensíveis em URLs ou cookies acessíveis

**Dados em sessionStorage:**
- Sessão autenticada
- Estado temporário do usuário

**Dados no backend local:**
- Transações e saldos
- Sonhos e metas
- Perfil e investimentos

---

### 3. **Input Sanitization (XSS Prevention)**
- ✅ Função `sanitizeInput()` para limpar tags HTML perigosas
- ✅ Validação de entrada com caracteres permitidos
- ✅ Bloqueio de `<script>`, `<iframe>`, `javascript:` etc
- ✅ Escapagem de caracteres especiais

---

### 4. **Proteção contra Força Bruta**
- ✅ Rate limiter integrado (5 tentativas / 15 min)
- ✅ Bloqueia tentativas repetidas
- ✅ Reseta após período expirado- ✅ Recomendado aplicar rate limiting também no backend para hospedagem real
---

## ⚠️ Limitações Conhecidas

### Segurança **Cliente-Side Only**
Enquanto backend não existir:

| Risco | Impacto | Mitigação |
|-------|--------|-----------|
| Usuário compartilha navegador | ALTO | Logout + limpeza de dados |
| Computador é roubado | ALTO | Sem encriptação em repouso |
| XSS complexo | MÉDIO | Input sanitization |
| Man-in-the-Middle (HTTP) | CRÍTICO | Não há - use HTTPS |
| Força bruta offline | MÉDIO | Rate limiting local |

---

## 🚀 Checklist para Levar a Produção

### Curto Prazo (Antes de Dados Reais)

- [ ] **HTTPS Obrigatório**
  ```bash
  # Usar Netlify, Vercel ou similar com SSL
  # Nunca enviar dados sensíveis por HTTP
  ```

- [ ] **2FA Autenticação**
  - Implementar TOTP (Google Authenticator) ou SMS
  - Biblioteca: `speakeasy` ou `otplib`

- [ ] **Backup Encriptado**
  - Exportar dados em JSON encriptado
  - Permitir import com senha

- [ ] **Logs de Auditoria**
  ```javascript
  // Registrar todas as ações sensíveis
  logAudit({
    action: 'delete_transaction',
    timestamp: new Date(),
    profile: 'eu',
    amount: 100.00,
  })
  ```

---

### Médio Prazo (Backend Seguro) ⭐⭐⭐ CRÍTICO

**Você DEVE implementar backend antes de dados reais:**

#### Arquitetura Recomendada
```
Frontend (React)
     ↓ HTTPS + JWT Token
Backend (Node.js + Express)
     ↓ PBKDF2 + Salt
PostgreSQL + Encryption
```

#### Backend Stack Recomendado
```javascript
// 1. Framework Web
- Express.js ou Fastify

// 2. Autenticação
- Passport.js + JWT
- bcrypt (Node.js PBKDF2)

// 3. Banco de Dados
- PostgreSQL (ACID transactions)
- TypeORM ou Prisma

// 4. Segurança
- helmet (headers)
- cors (CSRF)
- rate-limiter-flexible
- joi (validação)
- winston (logs)

// 5. Encriptação
- node-vault (Hashicorp Vault)
- crypto-js (campo específicos)
```

#### Implementação Backend - Exemplo
```javascript
// POST /api/login
app.post('/login', async (req, res) => {
  const { profile, password } = req.body
  
  // 1. Validar entrada
  const schema = Joi.object({
    profile: Joi.string().valid('eu', 'ela').required(),
    password: Joi.string().min(8).required(),
  })
  const { error, value } = schema.validate(req.body)
  if (error) return res.status(400).json({ error: error.details[0].message })
  
  // 2. Rate limiting no backend
  const limiter = new RateLimiter({ points: 5, duration: 900 }) // 5 em 15 min
  try {
    await limiter.consume(req.ip)
  } catch (err) {
    return res.status(429).json({ error: 'Muitas tentativas' })
  }
  
  // 3. Buscar usuário
  const user = await User.findOne({ profile })
  if (!user) {
    // Usar timing-safe compare
    await bcrypt.compare(password, '$2b$10$...') // hash dummy
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }
  
  // 4. Verificar senha (bcrypt é timing-safe)
  const validPassword = await bcrypt.compare(password, user.passwordHash)
  if (!validPassword) {
    return res.status(401).json({ error: 'Credenciais inválidas' })
  }
  
  // 5. Gerar JWT (experira em 1h)
  const token = jwt.sign(
    { id: user.id, profile: user.profile },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  )
  
  // 6. Retornar token (NÃO a senha ou dados sensíveis)
  return res.json({
    token,
    refreshToken, // Para renovar sem re-logar
    expiresIn: 3600,
  })
})

// GET /api/transactions (com autenticação)
app.get('/transactions', authenticateJWT, async (req, res) => {
  // authenticateJWT valida o JWT
  const { userId } = req.user
  
  // Dados vêm do backend, não do cliente
  const transactions = await Transaction.find({ userId })
  res.json(transactions)
})
```

#### Principais Mudanças Frontend
```javascript
// Antes (INSEGURO)
const data = loadSecurely('finflow_eu', {}) // localStorage

// Depois (SEGURO)
const { token } = await login(profile, password) // Backend
const data = await fetch('/api/user-data', {
  headers: { Authorization: `Bearer ${token}` }
}).then(r => r.json())

// Armazenar apenas o token (com expiração)
sessionStorage.setItem('auth_token', token)
sessionStorage.setItem('token_expires_at', Date.now() + 3600000)
```

---

### Longo Prazo (Enterprise)

- [ ] **2FA Avançado**
  - Biometria
  - WebAuthn (FIDO2)

- [ ] **Encriptação End-to-End**
  - Dados só descriptografados no cliente
  - Servidor nunca vê dados em claro

- [ ] **Seguro de Dados**
  - Cyber insurance
  - Responsabilidade civil

- [ ] **Conformidade Legal**
  - LGPD (Brasil)
  - GDPR (EU)
  - SOC 2 Type II

- [ ] **Penetration Testing**
  - Teste de segurança profissional
  - Anualmente

---

## 📋 Checklist de Segurança ao Usar Dados Reais

### Antes de Adicionar Dados Reais

- [ ] **Backup Regular**
  ```javascript
  // Exportar dados a cada semana
  const backup = JSON.stringify(profiles)
  localStorage.setItem('backup_' + Date.now(), backup)
  ```

- [ ] **Monitorar Browser**
  - Desabilitar extensões suspeitas
  - Checar histórico de requisições (DevTools Network)

- [ ] **Senha Forte**
  - Mínimo 12 caracteres
  - Letras, números, símbolos
  - Não usar senhas pessoais importantes

- [ ] **Não Compartilhar**
  - Nunca abra em navegadores públicos
  - Não compartilhe senhas
  - Não conte a ninguém sobre dados

- [ ] **Revisar Logs**
  - Check console.log para avisos
  - Validar de 15 em 15 dias

---

## 🔗 Recursos de Segurança

### Documentação
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

### Bibliotecas
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js/) - Hash de senha
- [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) - JWT
- [helmet](https://helmetjs.github.io/) - HTTP headers
- [rate-limiter-flexible](https://github.com/animir/node-rate-limiter-flexible) - Rate limiting

### Ferramentas
- [Have I Been Pwned](https://haveibeenpwned.com/) - Verificar vazamentos
- [SSL Labs](https://www.ssllabs.com/) - Testar HTTPS
- [Burp Suite](https://portswigger.net/burp) - Teste de penetração

---

## 📞 Próximos Passos

1. **Agora** ✅
   - Use o FinFlow com dados de teste
   - Familiarize-se com a interface

2. **Quando quiser dados reais** ⚠️
   - Implemente o backend (veja seção acima)
   - Configure HTTPS
   - Faça backup dos dados

3. **Segurança contínua** 🔄
   - Monitore vulnerabilidades
   - Atualize dependências
   - Faça auditorias de segurança

---

**Dúvidas? Confira SECURITY_AUDIT.md para a auditoria completa!**

