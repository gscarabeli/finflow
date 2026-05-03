import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import { Resend } from 'resend'
import pg from 'pg'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)

const JWT_SECRET       = process.env.JWT_SECRET || 'finflow-dev-secret-change-in-production'
const TOKEN_EXPIRATION = '7d'
const PORT             = process.env.PORT || 4000
const CLIENT_DIST      = resolve(__dirname, '..', 'dist')
const RESEND_API_KEY   = process.env.RESEND_API_KEY || ''
const APP_URL          = process.env.APP_URL || `http://localhost:${PORT}`
const FROM_EMAIL       = 'FinFlow <onboarding@resend.dev>'
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || ''

// Lista de e-mails permitidos — quando não configurada, qualquer um pode se cadastrar
const ALLOWED_EMAILS = process.env.ALLOWED_EMAILS
  ? new Set(process.env.ALLOWED_EMAILS.split(',').map(e => e.trim().toLowerCase()))
  : null

const resend = new Resend(RESEND_API_KEY)

// ─── Database ─────────────────────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL,
      email          TEXT UNIQUE NOT NULL,
      password_hash  TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      couple_id      TEXT,
      profile        JSONB NOT NULL DEFAULT '{}',
      sonhos         JSONB NOT NULL DEFAULT '[]',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS couples (
      id         TEXT PRIMARY KEY,
      members    TEXT[] NOT NULL,
      sonhos     JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS pending_tokens (
      token         TEXT PRIMARY KEY,
      type          TEXT NOT NULL,
      user_id       TEXT,
      partner_email TEXT,
      expires_at    BIGINT NOT NULL
    );
  `)
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
function mapUser(row) {
  if (!row) return null
  return {
    id:            row.id,
    name:          row.name,
    email:         row.email,
    passwordHash:  row.password_hash,
    emailVerified: row.email_verified,
    coupleId:      row.couple_id,
    profile:       row.profile || {},
    sonhos:        row.sonhos  || [],
    createdAt:     row.created_at,
  }
}

function mapCouple(row) {
  if (!row) return null
  return { id: row.id, members: row.members, sonhos: row.sonhos || [], createdAt: row.created_at }
}

async function getUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  return mapUser(rows[0])
}

async function getUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email])
  return mapUser(rows[0])
}

async function getCoupleById(id) {
  const { rows } = await pool.query('SELECT * FROM couples WHERE id = $1', [id])
  return mapCouple(rows[0])
}

async function getToken(token, type) {
  const { rows } = await pool.query(
    'SELECT * FROM pending_tokens WHERE token = $1 AND type = $2',
    [token, type]
  )
  return rows[0] || null
}

async function deleteToken(token) {
  await pool.query('DELETE FROM pending_tokens WHERE token = $1', [token])
}

async function deleteTokensByUserAndType(userId, type) {
  await pool.query('DELETE FROM pending_tokens WHERE user_id = $1 AND type = $2', [userId, type])
}

// Retorna os sonhos do dono (casal ou usuário solo) + função para salvar
async function getSonhosOwner(userId) {
  const user = await getUserById(userId)
  if (user.coupleId) {
    const couple = await getCoupleById(user.coupleId)
    return {
      sonhos: couple.sonhos || [],
      save: (sonhos) => pool.query('UPDATE couples SET sonhos = $1 WHERE id = $2', [JSON.stringify(sonhos), user.coupleId]),
    }
  }
  return {
    sonhos: user.sonhos || [],
    save: (sonhos) => pool.query('UPDATE users SET sonhos = $1 WHERE id = $2', [JSON.stringify(sonhos), userId]),
  }
}

// ─── Turnstile ────────────────────────────────────────────────────────────────
async function verifyTurnstile(token) {
  if (!TURNSTILE_SECRET) return
  if (!token) throw Object.assign(new Error('Verificação de segurança necessária'), { status: 400 })
  const res  = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token }),
  })
  const data = await res.json()
  if (!data.success) throw Object.assign(new Error('Verificação de segurança falhou. Tente novamente.'), { status: 400 })
}

// ─── Express ──────────────────────────────────────────────────────────────────
const app = express()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc:  ["'self'", 'https://challenges.cloudflare.com'],
      frameSrc:   ["'self'", 'https://challenges.cloudflare.com'],
      imgSrc:     ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://generativelanguage.googleapis.com', 'https://challenges.cloudflare.com'],
    },
  },
}))

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`)
    }
    next()
  })
}

app.use(cors({ origin: process.env.NODE_ENV === 'production' ? false : true, credentials: true }))
app.use(express.json())

// ─── Rate limiting ────────────────────────────────────────────────────────────
const rateLimitMap = new Map()

function getClientIp(req) {
  return (
    req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.ip
  )
}

function rateLimit(maxRequests = 5, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const ip    = getClientIp(req)
    const key   = `${ip}:${req.path}`
    const now   = Date.now()
    const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs, strikes: 0 }

    if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + windowMs }

    entry.count++
    rateLimitMap.set(key, entry)

    if (entry.count > maxRequests) {
      entry.strikes = (entry.strikes || 0) + 1
      const penaltyMs = windowMs * Math.min(entry.strikes, 8)
      entry.resetAt   = now + penaltyMs
      rateLimitMap.set(key, entry)
      const minutes = Math.ceil(penaltyMs / 60000)
      return res.status(429).json({ error: `Muitas tentativas. Tente novamente em ${minutes} minuto(s).` })
    }
    next()
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt + 60 * 60 * 1000) rateLimitMap.delete(key)
  }
}, 60 * 60 * 1000)

// ─── Email cooldown ───────────────────────────────────────────────────────────
const emailCooldownMap = new Map()

function isEmailOnCooldown(email, ms = 60 * 1000) {
  const last = emailCooldownMap.get(email.toLowerCase())
  return last && Date.now() - last < ms
}
function markEmailSent(email) { emailCooldownMap.set(email.toLowerCase(), Date.now()) }

setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [k, ts] of emailCooldownMap.entries()) { if (ts < cutoff) emailCooldownMap.delete(k) }
}, 10 * 60 * 1000)

// ─── Honeypot ─────────────────────────────────────────────────────────────────
function honeypot(req, res, next) {
  if (req.body?._hp) return res.status(200).json({ message: 'ok' })
  next()
}

// ─── Misc helpers ─────────────────────────────────────────────────────────────
function sanitize(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/<script|<iframe|<object|<embed|javascript:/gi, '').trim()
}
function isValidEmail(email)    { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }
function isStrongPassword(p)    { return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(p) }
function isEmailAllowed(email)  { return !ALLOWED_EMAILS || ALLOWED_EMAILS.has(email.toLowerCase().trim()) }

function hashPassword(password) {
  const salt    = randomBytes(16).toString('hex')
  const derived = pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex')
  return `${salt}:${derived}`
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const derived = pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex')
  try { return timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex')) } catch { return false }
}

function generateToken(length = 32) { return randomBytes(length).toString('hex') }
function signJWT(payload) { return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION }) }

function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token não fornecido' })
  try { req.user = jwt.verify(token, JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Token inválido ou expirado' }) }
}

function emptyProfile(name) {
  return {
    nome: name, contas: [],
    investimentos: { reserva: { atual: 0, meta: 0 }, previdencia: 0, acoes: 0, fundos: 0, cdi: 0 },
    transacoes: [],
  }
}

// ─── Email templates ──────────────────────────────────────────────────────────
function emailVerificationTemplate(name, url) {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0f14;color:#e8eaf0;border-radius:16px">
    <h1 style="color:#3b82f6;font-size:24px;margin-bottom:8px">fin<span style="color:#e8eaf0">.</span>flow</h1>
    <h2 style="font-size:18px;margin-bottom:16px">Confirme seu e-mail</h2>
    <p style="color:#9aa0b8;margin-bottom:24px">Olá, ${name}! Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.</p>
    <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Confirmar e-mail</a>
    <p style="color:#5c6380;font-size:12px;margin-top:24px">Link válido por 24 horas. Se não foi você, ignore este e-mail.</p>
  </div>`
}

function passwordResetTemplate(name, url) {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0f14;color:#e8eaf0;border-radius:16px">
    <h1 style="color:#3b82f6;font-size:24px;margin-bottom:8px">fin<span style="color:#e8eaf0">.</span>flow</h1>
    <h2 style="font-size:18px;margin-bottom:16px">Redefinir senha</h2>
    <p style="color:#9aa0b8;margin-bottom:24px">Olá, ${name}! Recebemos uma solicitação para redefinir sua senha.</p>
    <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Redefinir senha</a>
    <p style="color:#5c6380;font-size:12px;margin-top:24px">Link válido por 1 hora. Se não foi você, sua senha permanece a mesma.</p>
  </div>`
}

function coupleInviteTemplate(inviterName, inviteeName, url) {
  return `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0f14;color:#e8eaf0;border-radius:16px">
    <h1 style="color:#3b82f6;font-size:24px;margin-bottom:8px">fin<span style="color:#e8eaf0">.</span>flow</h1>
    <h2 style="font-size:18px;margin-bottom:16px">Convite para o Casal 💑</h2>
    <p style="color:#9aa0b8;margin-bottom:24px">Olá, ${inviteeName}! <strong style="color:#e8eaf0">${inviterName}</strong> te convidou para gerenciar as finanças do casal juntos no FinFlow.</p>
    <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Aceitar convite</a>
    <p style="color:#5c6380;font-size:12px;margin-top:24px">Link válido por 48 horas.</p>
  </div>`
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/auth/register', rateLimit(3), honeypot, async (req, res) => {
  const { name, email, password, cfToken } = req.body
  try { await verifyTurnstile(cfToken) } catch (e) { return res.status(e.status || 400).json({ error: e.message }) }

  if (!name || !email || !password) return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' })
  if (!isValidEmail(email))         return res.status(400).json({ error: 'E-mail inválido' })
  if (!isStrongPassword(password))  return res.status(400).json({ error: 'Senha não atende aos requisitos de segurança' })

  const normalizedEmail = email.toLowerCase().trim()

  if (!isEmailAllowed(normalizedEmail))
    return res.status(403).json({ error: 'Cadastro não disponível.' })

  if (await getUserByEmail(normalizedEmail))
    return res.status(409).json({ error: 'E-mail já cadastrado' })

  if (isEmailOnCooldown(normalizedEmail))
    return res.status(429).json({ error: 'Aguarde 1 minuto antes de tentar novamente.' })

  const userId  = `u${Date.now()}`
  const vToken  = generateToken()
  const expires = Date.now() + 24 * 60 * 60 * 1000

  await pool.query(
    `INSERT INTO users (id, name, email, password_hash, email_verified, profile, sonhos)
     VALUES ($1, $2, $3, $4, FALSE, $5, '[]')`,
    [userId, sanitize(name), normalizedEmail, hashPassword(password), JSON.stringify(emptyProfile(sanitize(name)))]
  )
  await pool.query(
    `INSERT INTO pending_tokens (token, type, user_id, expires_at) VALUES ($1, 'verification', $2, $3)`,
    [vToken, userId, expires]
  )

  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${vToken}`
  try {
    await resend.emails.send({
      from: FROM_EMAIL, to: normalizedEmail,
      subject: 'Confirme seu e-mail — FinFlow',
      html: emailVerificationTemplate(sanitize(name), verifyUrl),
    })
    markEmailSent(normalizedEmail)
  } catch (err) { console.error('Erro ao enviar e-mail:', err) }

  return res.status(201).json({ message: 'Conta criada! Verifique seu e-mail para ativar.' })
})

app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token inválido' })

  const entry = await getToken(token, 'verification')
  if (!entry) return res.status(400).json({ error: 'Token inválido ou já utilizado' })
  if (Date.now() > entry.expires_at) {
    await deleteToken(token)
    return res.status(400).json({ error: 'Token expirado. Solicite um novo e-mail de verificação.' })
  }

  await pool.query('UPDATE users SET email_verified = TRUE WHERE id = $1', [entry.user_id])
  await deleteToken(token)
  return res.redirect(`${APP_URL}/?verified=true`)
})

app.post('/api/auth/resend-verification', rateLimit(3), honeypot, async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' })

  const normalizedEmail = email.toLowerCase().trim()
  if (isEmailOnCooldown(normalizedEmail))
    return res.status(429).json({ error: 'Aguarde 1 minuto antes de solicitar outro e-mail.' })

  const user = await getUserByEmail(normalizedEmail)
  if (!user || user.emailVerified)
    return res.json({ message: 'Se o e-mail existir e não estiver verificado, você receberá um novo link.' })

  await deleteTokensByUserAndType(user.id, 'verification')

  const token   = generateToken()
  const expires = Date.now() + 24 * 60 * 60 * 1000
  await pool.query(
    `INSERT INTO pending_tokens (token, type, user_id, expires_at) VALUES ($1, 'verification', $2, $3)`,
    [token, user.id, expires]
  )

  await resend.emails.send({
    from: FROM_EMAIL, to: user.email,
    subject: 'Novo link de verificação — FinFlow',
    html: emailVerificationTemplate(user.name, `${APP_URL}/api/auth/verify-email?token=${token}`),
  })
  markEmailSent(normalizedEmail)
  return res.json({ message: 'Se o e-mail existir e não estiver verificado, você receberá um novo link.' })
})

app.post('/api/auth/login', rateLimit(10), async (req, res) => {
  const { email, password, cfToken } = req.body
  if (!email || !password) return res.status(400).json({ error: 'E-mail e senha obrigatórios' })
  try { await verifyTurnstile(cfToken) } catch (e) { return res.status(e.status || 400).json({ error: e.message }) }

  const normalizedEmail = email.toLowerCase().trim()
  if (!isEmailAllowed(normalizedEmail)) return res.status(403).json({ error: 'Acesso não autorizado.' })

  const user = await getUserByEmail(normalizedEmail)
  if (!user || !verifyPassword(password, user.passwordHash))
    return res.status(401).json({ error: 'E-mail ou senha incorretos' })
  if (!user.emailVerified)
    return res.status(403).json({ error: 'E-mail não verificado. Verifique sua caixa de entrada.', code: 'EMAIL_NOT_VERIFIED' })

  const token = signJWT({ userId: user.id, email: user.email })
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, coupleId: user.coupleId } })
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const user = await getUserById(req.user.userId)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  return res.json({ id: user.id, name: user.name, email: user.email, coupleId: user.coupleId })
})

app.post('/api/auth/forgot-password', rateLimit(3), honeypot, async (req, res) => {
  const { email, cfToken } = req.body
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' })
  try { await verifyTurnstile(cfToken) } catch (e) { return res.status(e.status || 400).json({ error: e.message }) }

  const normalizedEmail = email.toLowerCase().trim()
  if (isEmailOnCooldown(normalizedEmail))
    return res.status(429).json({ error: 'Aguarde 1 minuto antes de solicitar outro e-mail.' })

  const user = await getUserByEmail(normalizedEmail)
  if (!user) return res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' })

  await deleteTokensByUserAndType(user.id, 'reset')

  const token   = generateToken()
  const expires = Date.now() + 60 * 60 * 1000
  await pool.query(
    `INSERT INTO pending_tokens (token, type, user_id, expires_at) VALUES ($1, 'reset', $2, $3)`,
    [token, user.id, expires]
  )

  await resend.emails.send({
    from: FROM_EMAIL, to: user.email,
    subject: 'Redefinir senha — FinFlow',
    html: passwordResetTemplate(user.name, `${APP_URL}/?reset=${token}`),
  })
  markEmailSent(normalizedEmail)
  return res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' })
})

app.post('/api/auth/reset-password', rateLimit(5), async (req, res) => {
  const { token, password } = req.body
  if (!token || !password)    return res.status(400).json({ error: 'Token e nova senha obrigatórios' })
  if (!isStrongPassword(password)) return res.status(400).json({ error: 'Senha não atende aos requisitos de segurança' })

  const entry = await getToken(token, 'reset')
  if (!entry) return res.status(400).json({ error: 'Token inválido ou já utilizado' })
  if (Date.now() > entry.expires_at) {
    await deleteToken(token)
    return res.status(400).json({ error: 'Token expirado. Solicite uma nova redefinição.' })
  }

  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(password), entry.user_id])
  await deleteToken(token)
  return res.json({ message: 'Senha redefinida com sucesso!' })
})

app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Campos obrigatórios' })
  if (!isStrongPassword(newPassword))   return res.status(400).json({ error: 'Nova senha não atende aos requisitos' })

  const user = await getUserById(req.user.userId)
  if (!verifyPassword(currentPassword, user.passwordHash))
    return res.status(401).json({ error: 'Senha atual incorreta' })

  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(newPassword), user.id])
  return res.json({ message: 'Senha alterada com sucesso!' })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  COUPLE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/couple/invite', authMiddleware, rateLimit(3), honeypot, async (req, res) => {
  const { partnerEmail } = req.body
  if (!partnerEmail || !isValidEmail(partnerEmail))
    return res.status(400).json({ error: 'E-mail do parceiro inválido' })
  if (isEmailOnCooldown(partnerEmail))
    return res.status(429).json({ error: 'Aguarde 1 minuto antes de enviar outro convite.' })

  const inviter = await getUserById(req.user.userId)
  if (inviter.coupleId) return res.status(400).json({ error: 'Você já faz parte de um casal' })
  if (inviter.email === partnerEmail.toLowerCase().trim())
    return res.status(400).json({ error: 'Você não pode se convidar' })

  const partner     = await getUserByEmail(partnerEmail.toLowerCase().trim())
  const partnerName = partner?.name || partnerEmail.split('@')[0]
  if (partner?.coupleId) return res.status(400).json({ error: 'Este usuário já faz parte de um casal' })

  await deleteTokensByUserAndType(inviter.id, 'invite')

  const token   = generateToken()
  const expires = Date.now() + 48 * 60 * 60 * 1000
  await pool.query(
    `INSERT INTO pending_tokens (token, type, user_id, partner_email, expires_at) VALUES ($1, 'invite', $2, $3, $4)`,
    [token, inviter.id, partnerEmail.toLowerCase().trim(), expires]
  )

  const inviteUrl = partner
    ? `${APP_URL}/?invite=${token}`
    : `${APP_URL}/?invite=${token}&register=true`

  await resend.emails.send({
    from: FROM_EMAIL, to: partnerEmail.toLowerCase().trim(),
    subject: `${inviter.name} te convidou para o FinFlow 💑`,
    html: coupleInviteTemplate(inviter.name, partnerName, inviteUrl),
  })
  markEmailSent(partnerEmail)
  return res.json({ message: 'Convite enviado!' })
})

app.post('/api/couple/accept', authMiddleware, async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'Token obrigatório' })

  const invite = await getToken(token, 'invite')
  if (!invite) return res.status(400).json({ error: 'Convite inválido ou já utilizado' })
  if (Date.now() > invite.expires_at) {
    await deleteToken(token)
    return res.status(400).json({ error: 'Convite expirado. Peça um novo convite.' })
  }

  const accepter = await getUserById(req.user.userId)
  const inviter  = await getUserById(invite.user_id)

  if (!inviter)          return res.status(400).json({ error: 'Quem enviou o convite não existe mais' })
  if (accepter.coupleId) return res.status(400).json({ error: 'Você já faz parte de um casal' })
  if (inviter.coupleId)  return res.status(400).json({ error: 'Quem te convidou já faz parte de outro casal' })

  const coupleId = `couple_${Date.now()}`
  await pool.query(
    `INSERT INTO couples (id, members, sonhos) VALUES ($1, $2, '[]')`,
    [coupleId, [inviter.id, accepter.id]]
  )
  await pool.query('UPDATE users SET couple_id = $1 WHERE id = ANY($2)', [coupleId, [inviter.id, accepter.id]])
  await deleteToken(token)
  return res.json({ message: 'Casal formado com sucesso!', coupleId })
})

app.delete('/api/couple', authMiddleware, async (req, res) => {
  const user = await getUserById(req.user.userId)
  if (!user.coupleId) return res.status(400).json({ error: 'Você não faz parte de um casal' })

  const couple = await getCoupleById(user.coupleId)
  if (couple) {
    await pool.query('UPDATE users SET couple_id = NULL WHERE id = ANY($1)', [couple.members])
    await pool.query('DELETE FROM couples WHERE id = $1', [user.coupleId])
  }
  return res.json({ message: 'Você saiu do casal.' })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/profile', authMiddleware, async (req, res) => {
  const user = await getUserById(req.user.userId)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  if (user.coupleId) {
    const couple  = await getCoupleById(user.coupleId)
    const members = await Promise.all(couple.members.map(id => getUserById(id)))
    const me      = members.find(m => m.id === user.id)
    const partner = members.find(m => m.id !== user.id)
    return res.json({ eu: me.profile, parceiro: partner?.profile ?? null })
  }

  return res.json({ eu: user.profile })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  SONHOS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/sonhos', authMiddleware, async (req, res) => {
  const owner = await getSonhosOwner(req.user.userId)
  return res.json(owner.sonhos)
})

app.post('/api/sonhos', authMiddleware, async (req, res) => {
  const sonho = req.body
  if (!sonho?.nome || !sonho?.meta) return res.status(400).json({ error: 'Dados do sonho inválidos' })

  const owner   = await getSonhosOwner(req.user.userId)
  const created = { ...sonho, nome: sanitize(sonho.nome), notas: sanitize(sonho.notas || ''), id: `s${Date.now()}` }
  const updated = [...owner.sonhos, created]
  await owner.save(updated)
  return res.json(created)
})

app.put('/api/sonhos/:id', authMiddleware, async (req, res) => {
  const owner = await getSonhosOwner(req.user.userId)
  const idx   = owner.sonhos.findIndex(s => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Sonho não encontrado' })
  owner.sonhos[idx] = { ...owner.sonhos[idx], ...req.body, nome: sanitize(req.body.nome || owner.sonhos[idx].nome) }
  await owner.save(owner.sonhos)
  return res.json(owner.sonhos[idx])
})

app.delete('/api/sonhos/:id', authMiddleware, async (req, res) => {
  const owner   = await getSonhosOwner(req.user.userId)
  const updated = owner.sonhos.filter(s => s.id !== req.params.id)
  await owner.save(updated)
  return res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  TRANSACTIONS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/transactions', authMiddleware, async (req, res) => {
  const user = await getUserById(req.user.userId)
  const data = req.body

  if (!data?.desc || typeof data.valor !== 'number' || !data.tipo || !data.cat || !data.data)
    return res.status(400).json({ error: 'Dados da transação inválidos' })

  const tx      = { ...data, desc: sanitize(data.desc), cat: sanitize(data.cat), id: `t${Date.now()}` }
  const profile = { ...user.profile }

  if (data.contaId) {
    const ci = profile.contas.findIndex(c => c.id === data.contaId)
    if (ci !== -1) profile.contas[ci].saldo += data.tipo === 'entrada' ? data.valor : -data.valor
  }

  profile.transacoes = [tx, ...(profile.transacoes || [])]
  await pool.query('UPDATE users SET profile = $1 WHERE id = $2', [JSON.stringify(profile), user.id])
  return res.json(tx)
})

app.put('/api/transactions/:id', authMiddleware, async (req, res) => {
  const user    = await getUserById(req.user.userId)
  const profile = { ...user.profile }
  const idx     = profile.transacoes.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Transação não encontrada' })

  const old  = profile.transacoes[idx]
  const data = req.body

  if (old.contaId) {
    const ci = profile.contas.findIndex(c => c.id === old.contaId)
    if (ci !== -1) profile.contas[ci].saldo += old.tipo === 'entrada' ? -old.valor : old.valor
  }
  if (data.contaId) {
    const ci = profile.contas.findIndex(c => c.id === data.contaId)
    if (ci !== -1) profile.contas[ci].saldo += data.tipo === 'entrada' ? data.valor : -data.valor
  }

  profile.transacoes[idx] = {
    ...old, ...data,
    desc: sanitize(data.desc || old.desc),
    cat:  sanitize(data.cat  || old.cat),
    updatedAt: new Date().toISOString(),
  }

  await pool.query('UPDATE users SET profile = $1 WHERE id = $2', [JSON.stringify(profile), user.id])
  return res.json(profile.transacoes[idx])
})

app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
  const user    = await getUserById(req.user.userId)
  const profile = { ...user.profile, transacoes: user.profile.transacoes.filter(t => t.id !== req.params.id) }
  await pool.query('UPDATE users SET profile = $1 WHERE id = $2', [JSON.stringify(profile), user.id])
  return res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  INVESTIMENTOS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.put('/api/investimentos', authMiddleware, async (req, res) => {
  const user    = await getUserById(req.user.userId)
  const profile = { ...user.profile, investimentos: { ...user.profile.investimentos, ...req.body } }
  await pool.query('UPDATE users SET profile = $1 WHERE id = $2', [JSON.stringify(profile), user.id])
  return res.json(profile.investimentos)
})

// ═══════════════════════════════════════════════════════════════════════════════
//  CONTAS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/contas', authMiddleware, async (req, res) => {
  const user = await getUserById(req.user.userId)
  return res.json({ contas: user.profile.contas || [] })
})

app.post('/api/contas', authMiddleware, async (req, res) => {
  const user = await getUserById(req.user.userId)
  const data = req.body
  if (!data?.nome || !data?.tipo || typeof data.saldo !== 'number')
    return res.status(400).json({ error: 'Dados da conta inválidos' })

  const conta   = { ...data, nome: sanitize(data.nome), id: `c${Date.now()}`, createdAt: new Date().toISOString() }
  const profile = { ...user.profile, contas: [...(user.profile.contas || []), conta] }
  await pool.query('UPDATE users SET profile = $1 WHERE id = $2', [JSON.stringify(profile), user.id])
  return res.json(conta)
})

app.put('/api/contas/:id', authMiddleware, async (req, res) => {
  const user    = await getUserById(req.user.userId)
  const profile = { ...user.profile }
  const idx     = profile.contas.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Conta não encontrada' })

  profile.contas[idx] = {
    ...profile.contas[idx], ...req.body,
    nome: sanitize(req.body.nome || profile.contas[idx].nome),
    updatedAt: new Date().toISOString(),
  }
  await pool.query('UPDATE users SET profile = $1 WHERE id = $2', [JSON.stringify(profile), user.id])
  return res.json(profile.contas[idx])
})

app.delete('/api/contas/:id', authMiddleware, async (req, res) => {
  const user    = await getUserById(req.user.userId)
  const profile = { ...user.profile, contas: user.profile.contas.filter(c => c.id !== req.params.id) }
  await pool.query('UPDATE users SET profile = $1 WHERE id = $2', [JSON.stringify(profile), user.id])
  return res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  GEMINI ROUTE
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/gemini', authMiddleware, async (req, res) => {
  const { prompt, maxTokens, temperature, model, apiKey } = req.body
  const key = apiKey || process.env.GEMINI_API_KEY
  if (!key || !prompt) return res.status(400).json({ error: 'Prompt ou chave da IA não configurados' })

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.5-flash-preview-05-20')}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt.userPrompt }] }],
          generationConfig: { temperature: temperature ?? 0.2, maxOutputTokens: maxTokens ?? 2048 },
        }),
      }
    )
    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error || 'Erro ao chamar Gemini' })
    return res.json(data)
  } catch {
    return res.status(500).json({ error: 'Erro de conexão com Gemini' })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════
//  STATIC
// ═══════════════════════════════════════════════════════════════════════════════

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(CLIENT_DIST))
  app.get('*', (req, res) => res.sendFile(resolve(CLIENT_DIST, 'index.html')))
}

// ─── Start ────────────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('ERRO: DATABASE_URL não configurada.')
    process.exit(1)
  }
  await initDB()
  app.listen(PORT, () => console.log(`FinFlow rodando em http://localhost:${PORT}`))
}

main().catch(err => { console.error('Falha ao iniciar:', err); process.exit(1) })
