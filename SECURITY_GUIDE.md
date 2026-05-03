# Segurança do FinFlow

## O que está implementado

### Autenticação
- **PBKDF2-SHA256** com 100.000 iterações e salt aleatório de 16 bytes por senha (padrão OWASP)
- **Comparação em tempo constante** (`timingSafeEqual`) — protege contra timing attacks
- **JWT** com expiração de 7 dias, assinado com `JWT_SECRET`
- **Verificação de e-mail** obrigatória antes do primeiro login
- **Recuperação de senha** por link de e-mail com token de uso único (expira em 1h)

### Anti-bot
- **Cloudflare Turnstile** nos formulários de login, cadastro e recuperação de senha
- **Honeypot** (campo invisível) — bots que preenchem são silenciosamente ignorados
- Quando `TURNSTILE_SECRET_KEY` não está configurada, a verificação é pulada

### Rate Limiting
- Implementado por IP + rota, com backoff progressivo
- Login: 10 tentativas por 15 minutos
- Cadastro / recuperação / reenvio: 3 tentativas por 15 minutos
- Bloqueio cresce a cada strike (até 8x a janela original)
- E-mails: cooldown de 1 minuto por endereço

### Headers HTTP
- **Helmet** configura headers de segurança automaticamente
- **CSP** restringe origens de scripts, estilos, fontes, frames e conexões
- **HTTPS forçado** em produção (redirecionamento 301 via `x-forwarded-proto`)

### Sanitização
- Entradas de texto passam por `sanitize()` no backend — remove tags `<script>`, `<iframe>`, `javascript:` etc.
- Validação de e-mail e força de senha no backend (independente do frontend)

### Controle de acesso
- Todas as rotas de dados exigem JWT válido via `authMiddleware`
- Cada usuário acessa apenas seus próprios dados
- Dados do parceiro só são expostos quando há `coupleId` configurado

---

## Limitações conhecidas

| Risco | Status |
|---|---|
| Dados em `server/state.json` sem encriptação em repouso | Limitação aceita — não há segredos no arquivo além de hashes de senha |
| Sem 2FA | Não implementado |
| Sem banco de dados real (PostgreSQL) | `state.json` é um arquivo JSON simples |
| Disco efêmero no Render gratuito | Dados perdidos a cada deploy |

---

## Recursos externos usados

| Serviço | Finalidade | Dados enviados |
|---|---|---|
| Resend | E-mails transacionais (verificação, reset, convite) | Nome e e-mail do usuário |
| Google Gemini | Consultoria IA | Resumo financeiro anonimizado (sem senhas ou tokens) |
| Cloudflare Turnstile | Verificação anti-bot | Nenhum dado pessoal |

---

## Próximos passos recomendados

Para um nível de segurança enterprise:

- **Banco de dados** — migrar de `state.json` para PostgreSQL com backups automáticos
- **Encriptação em repouso** — cifrar campos sensíveis no banco
- **2FA** — TOTP via biblioteca como `otplib`
- **Audit log** — registrar todas as ações sensíveis com timestamp e IP
- **Pen testing** — teste profissional de penetração antes de escalar
- **LGPD** — política de privacidade e mecanismo de exclusão de dados

---

## Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Cloudflare Turnstile Docs](https://developers.cloudflare.com/turnstile/)
- [Helmet.js](https://helmetjs.github.io/)
