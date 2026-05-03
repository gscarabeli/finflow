import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import { Resend } from 'resend'
import { readFile, writeFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const STATE_PATH = resolve(__dirname, 'state.json')

const JWT_SECRET = process.env.JWT_SECRET || 'finflow-dev-secret-change-in-production'
const TOKEN_EXPIRATION = '7d'
const PORT = process.env.PORT || 4000
const CLIENT_DIST = resolve(__dirname, '..', 'dist')
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`
const FROM_EMAIL = 'FinFlow <onboarding@resend.dev>'

const resend = new Resend(RESEND_API_KEY)

// ─── Express setup ────────────────────────────────────────────────────────────
const app = express()

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://generativelanguage.googleapis.com'],
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

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true,
}))
app.use(express.json())

// ─── State helpers ────────────────────────────────────────────────────────────
async function loadState() {
  try {
    const raw = await readFile(STATE_PATH, 'utf-8')
    return JSON.parse(raw)
  } catch {
    const empty = { users: {}, couples: {}, pendingVerifications: {}, pendingResets: {}, pendingInvites: {} }
    await writeFile(STATE_PATH, JSON.stringify(empty, null, 2), 'utf-8')
    return empty
  }
}

async function saveState(data) {
  await writeFile(STATE_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex')
  return `${salt}:${derived}`
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const derived = pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex')
  try {
    return timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(hash, 'hex'))
  } catch {
    return false
  }
}

function generateToken(length = 32) {
  return randomBytes(length).toString('hex')
}

function signJWT(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION })
}

// ─── Middleware ───────────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = (req.headers.authorization || '').split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token não fornecido' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

// ─── Rate limiting simples por IP ─────────────────────────────────────────────
const rateLimitMap = new Map()
function rateLimit(maxRequests = 5, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const key = req.ip
    const now = Date.now()
    const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + windowMs }
    if (now > entry.resetAt) {
      entry.count = 0
      entry.resetAt = now + windowMs
    }
    entry.count++
    rateLimitMap.set(key, entry)
    if (entry.count > maxRequests) {
      const minutes = Math.ceil((entry.resetAt - now) / 60000)
      return res.status(429).json({ error: `Muitas tentativas. Tente novamente em ${minutes} minuto(s).` })
    }
    next()
  }
}

// ─── Sanitize ─────────────────────────────────────────────────────────────────
function sanitize(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/<script|<iframe|<object|<embed|javascript:/gi, '').trim()
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isStrongPassword(password) {
  // mínimo 8 chars, 1 maiúscula, 1 minúscula, 1 número, 1 especial
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password)
}

// ─── Email templates ──────────────────────────────────────────────────────────
function emailVerificationTemplate(name, url) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0f14;color:#e8eaf0;border-radius:16px">
      <h1 style="color:#3b82f6;font-size:24px;margin-bottom:8px">fin<span style="color:#e8eaf0">.</span>flow</h1>
      <h2 style="font-size:18px;margin-bottom:16px">Confirme seu e-mail</h2>
      <p style="color:#9aa0b8;margin-bottom:24px">Olá, ${name}! Clique no botão abaixo para confirmar seu e-mail e ativar sua conta.</p>
      <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Confirmar e-mail</a>
      <p style="color:#5c6380;font-size:12px;margin-top:24px">Link válido por 24 horas. Se não foi você, ignore este e-mail.</p>
    </div>`
}

function passwordResetTemplate(name, url) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0f14;color:#e8eaf0;border-radius:16px">
      <h1 style="color:#3b82f6;font-size:24px;margin-bottom:8px">fin<span style="color:#e8eaf0">.</span>flow</h1>
      <h2 style="font-size:18px;margin-bottom:16px">Redefinir senha</h2>
      <p style="color:#9aa0b8;margin-bottom:24px">Olá, ${name}! Recebemos uma solicitação para redefinir sua senha.</p>
      <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Redefinir senha</a>
      <p style="color:#5c6380;font-size:12px;margin-top:24px">Link válido por 1 hora. Se não foi você, sua senha permanece a mesma.</p>
    </div>`
}

function coupleInviteTemplate(inviterName, inviteeName, url) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0d0f14;color:#e8eaf0;border-radius:16px">
      <h1 style="color:#3b82f6;font-size:24px;margin-bottom:8px">fin<span style="color:#e8eaf0">.</span>flow</h1>
      <h2 style="font-size:18px;margin-bottom:16px">Convite para o Casal 💑</h2>
      <p style="color:#9aa0b8;margin-bottom:24px">Olá, ${inviteeName}! <strong style="color:#e8eaf0">${inviterName}</strong> te convidou para gerenciar as finanças do casal juntos no FinFlow.</p>
      <a href="${url}" style="display:inline-block;background:#3b82f6;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600">Aceitar convite</a>
      <p style="color:#5c6380;font-size:12px;margin-top:24px">Link válido por 48 horas.</p>
    </div>`
}

// ─── Empty profile factory ────────────────────────────────────────────────────
function emptyProfile(name) {
  return {
    nome: name,
    contas: [],
    investimentos: { reserva: { atual: 0, meta: 0 }, previdencia: 0, acoes: 0, fundos: 0, cdi: 0 },
    transacoes: [],
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/auth/register
app.post('/api/auth/register', rateLimit(5), async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'E-mail inválido' })
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: 'Senha não atende aos requisitos de segurança' })
  }

  const state = await loadState()
  const normalizedEmail = email.toLowerCase().trim()

  if (Object.values(state.users).some(u => u.email === normalizedEmail)) {
    return res.status(409).json({ error: 'E-mail já cadastrado' })
  }

  const userId = `u${Date.now()}`
  const verificationToken = generateToken()
  const verificationExpiry = Date.now() + 24 * 60 * 60 * 1000 // 24h

  state.users[userId] = {
    id: userId,
    name: sanitize(name),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    emailVerified: false,
    coupleId: null,
    profile: emptyProfile(sanitize(name)),
    createdAt: new Date().toISOString(),
  }

  state.pendingVerifications[verificationToken] = {
    userId,
    expiresAt: verificationExpiry,
  }

  await saveState(state)

  // Enviar e-mail de verificação
  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${verificationToken}`
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: 'Confirme seu e-mail — FinFlow',
      html: emailVerificationTemplate(sanitize(name), verifyUrl),
    })
  } catch (err) {
    console.error('Erro ao enviar e-mail de verificação:', err)
    // Não falha o registro, mas loga o erro
  }

  return res.status(201).json({ message: 'Conta criada! Verifique seu e-mail para ativar.' })
})

// GET /api/auth/verify-email?token=...
app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query
  if (!token) return res.status(400).json({ error: 'Token inválido' })

  const state = await loadState()
  const entry = state.pendingVerifications[token]

  if (!entry) return res.status(400).json({ error: 'Token inválido ou já utilizado' })
  if (Date.now() > entry.expiresAt) {
    delete state.pendingVerifications[token]
    await saveState(state)
    return res.status(400).json({ error: 'Token expirado. Solicite um novo e-mail de verificação.' })
  }

  state.users[entry.userId].emailVerified = true
  delete state.pendingVerifications[token]
  await saveState(state)

  // Redireciona pro frontend com sucesso
  return res.redirect(`${APP_URL}/?verified=true`)
})

// POST /api/auth/resend-verification
app.post('/api/auth/resend-verification', rateLimit(3), async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' })

  const state = await loadState()
  const user = Object.values(state.users).find(u => u.email === email.toLowerCase().trim())

  // Responde genérico para não vazar se e-mail existe
  if (!user || user.emailVerified) {
    return res.json({ message: 'Se o e-mail existir e não estiver verificado, você receberá um novo link.' })
  }

  // Remove tokens antigos deste usuário
  for (const [t, v] of Object.entries(state.pendingVerifications)) {
    if (v.userId === user.id) delete state.pendingVerifications[t]
  }

  const token = generateToken()
  state.pendingVerifications[token] = { userId: user.id, expiresAt: Date.now() + 24 * 60 * 60 * 1000 }
  await saveState(state)

  const verifyUrl = `${APP_URL}/api/auth/verify-email?token=${token}`
  await resend.emails.send({
    from: FROM_EMAIL,
    to: user.email,
    subject: 'Novo link de verificação — FinFlow',
    html: emailVerificationTemplate(user.name, verifyUrl),
  })

  return res.json({ message: 'Se o e-mail existir e não estiver verificado, você receberá um novo link.' })
})

// POST /api/auth/login
app.post('/api/auth/login', rateLimit(10), async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'E-mail e senha obrigatórios' })

  const state = await loadState()
  const user = Object.values(state.users).find(u => u.email === email.toLowerCase().trim())

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'E-mail ou senha incorretos' })
  }

  if (!user.emailVerified) {
    return res.status(403).json({ error: 'E-mail não verificado. Verifique sua caixa de entrada.', code: 'EMAIL_NOT_VERIFIED' })
  }

  const token = signJWT({ userId: user.id, email: user.email })
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, coupleId: user.coupleId } })
})

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  return res.json({ id: user.id, name: user.name, email: user.email, coupleId: user.coupleId })
})

// POST /api/auth/forgot-password
app.post('/api/auth/forgot-password', rateLimit(3), async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' })

  const state = await loadState()
  const user = Object.values(state.users).find(u => u.email === email.toLowerCase().trim())

  // Sempre responde genérico para não vazar info
  if (!user) return res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' })

  // Remove resets antigos deste usuário
  for (const [t, v] of Object.entries(state.pendingResets)) {
    if (v.userId === user.id) delete state.pendingResets[t]
  }

  const token = generateToken()
  state.pendingResets[token] = { userId: user.id, expiresAt: Date.now() + 60 * 60 * 1000 } // 1h
  await saveState(state)

  const resetUrl = `${APP_URL}/?reset=${token}`
  await resend.emails.send({
    from: FROM_EMAIL,
    to: user.email,
    subject: 'Redefinir senha — FinFlow',
    html: passwordResetTemplate(user.name, resetUrl),
  })

  return res.json({ message: 'Se o e-mail estiver cadastrado, você receberá as instruções.' })
})

// POST /api/auth/reset-password
app.post('/api/auth/reset-password', rateLimit(5), async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Token e nova senha obrigatórios' })
  if (!isStrongPassword(password)) return res.status(400).json({ error: 'Senha não atende aos requisitos de segurança' })

  const state = await loadState()
  const entry = state.pendingResets[token]

  if (!entry) return res.status(400).json({ error: 'Token inválido ou já utilizado' })
  if (Date.now() > entry.expiresAt) {
    delete state.pendingResets[token]
    await saveState(state)
    return res.status(400).json({ error: 'Token expirado. Solicite uma nova redefinição.' })
  }

  state.users[entry.userId].passwordHash = hashPassword(password)
  delete state.pendingResets[token]
  await saveState(state)

  return res.json({ message: 'Senha redefinida com sucesso!' })
})

// POST /api/auth/change-password
app.post('/api/auth/change-password', authMiddleware, async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Campos obrigatórios' })
  if (!isStrongPassword(newPassword)) return res.status(400).json({ error: 'Nova senha não atende aos requisitos' })

  const state = await loadState()
  const user = state.users[req.user.userId]
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return res.status(401).json({ error: 'Senha atual incorreta' })
  }

  user.passwordHash = hashPassword(newPassword)
  await saveState(state)
  return res.json({ message: 'Senha alterada com sucesso!' })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  COUPLE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/couple/invite — convida parceiro por e-mail
app.post('/api/couple/invite', authMiddleware, rateLimit(3), async (req, res) => {
  const { partnerEmail } = req.body
  if (!partnerEmail || !isValidEmail(partnerEmail)) return res.status(400).json({ error: 'E-mail do parceiro inválido' })

  const state = await loadState()
  const inviter = state.users[req.user.userId]

  if (inviter.coupleId) return res.status(400).json({ error: 'Você já faz parte de um casal' })
  if (inviter.email === partnerEmail.toLowerCase().trim()) return res.status(400).json({ error: 'Você não pode se convidar' })

  const partner = Object.values(state.users).find(u => u.email === partnerEmail.toLowerCase().trim())
  const partnerName = partner?.name || partnerEmail.split('@')[0]

  if (partner?.coupleId) return res.status(400).json({ error: 'Este usuário já faz parte de um casal' })

  // Remove convites antigos deste inviter
  for (const [t, v] of Object.entries(state.pendingInvites)) {
    if (v.inviterId === inviter.id) delete state.pendingInvites[t]
  }

  const token = generateToken()
  state.pendingInvites[token] = {
    inviterId: inviter.id,
    partnerEmail: partnerEmail.toLowerCase().trim(),
    expiresAt: Date.now() + 48 * 60 * 60 * 1000, // 48h
  }
  await saveState(state)

  const inviteUrl = partner
    ? `${APP_URL}/?invite=${token}` // já tem conta, vai direto
    : `${APP_URL}/?invite=${token}&register=true` // precisa criar conta

  await resend.emails.send({
    from: FROM_EMAIL,
    to: partnerEmail.toLowerCase().trim(),
    subject: `${inviter.name} te convidou para o FinFlow 💑`,
    html: coupleInviteTemplate(inviter.name, partnerName, inviteUrl),
  })

  return res.json({ message: 'Convite enviado!' })
})

// POST /api/couple/accept — aceita o convite
app.post('/api/couple/accept', authMiddleware, async (req, res) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'Token obrigatório' })

  const state = await loadState()
  const invite = state.pendingInvites[token]

  if (!invite) return res.status(400).json({ error: 'Convite inválido ou já utilizado' })
  if (Date.now() > invite.expiresAt) {
    delete state.pendingInvites[token]
    await saveState(state)
    return res.status(400).json({ error: 'Convite expirado. Peça um novo convite.' })
  }

  const accepter = state.users[req.user.userId]
  const inviter = state.users[invite.inviterId]

  if (!inviter) return res.status(400).json({ error: 'Quem enviou o convite não existe mais' })
  if (accepter.coupleId) return res.status(400).json({ error: 'Você já faz parte de um casal' })
  if (inviter.coupleId) return res.status(400).json({ error: 'Quem te convidou já faz parte de outro casal' })

  const coupleId = `couple_${Date.now()}`
  const couple = {
    id: coupleId,
    members: [inviter.id, accepter.id],
    sonhos: [],
    createdAt: new Date().toISOString(),
  }

  state.couples[coupleId] = couple
  state.users[inviter.id].coupleId = coupleId
  state.users[accepter.id].coupleId = coupleId
  delete state.pendingInvites[token]

  await saveState(state)
  return res.json({ message: 'Casal formado com sucesso!', coupleId })
})

// DELETE /api/couple — sair do casal
app.delete('/api/couple', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  if (!user.coupleId) return res.status(400).json({ error: 'Você não faz parte de um casal' })

  const couple = state.couples[user.coupleId]
  if (couple) {
    // Remove coupleId de todos os membros
    for (const memberId of couple.members) {
      if (state.users[memberId]) state.users[memberId].coupleId = null
    }
    delete state.couples[user.coupleId]
  }

  await saveState(state)
  return res.json({ message: 'Você saiu do casal.' })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  PROFILE ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/profile', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })

  if (user.coupleId) {
    const couple = state.couples[user.coupleId]
    const [m1, m2] = couple.members.map(id => state.users[id])
    return res.json({ eu: m1.profile, parceiro: m2.profile, sonhos: couple.sonhos })
  }

  return res.json({ eu: user.profile, sonhos: [] })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  SONHOS ROUTES (agora no casal ou no usuário solo)
// ═══════════════════════════════════════════════════════════════════════════════

function getSonhosOwner(state, userId) {
  const user = state.users[userId]
  if (user.coupleId) return state.couples[user.coupleId]
  return user // solo: sonhos ficam no user
}

app.get('/api/sonhos', authMiddleware, async (req, res) => {
  const state = await loadState()
  const owner = getSonhosOwner(state, req.user.userId)
  return res.json(owner.sonhos || [])
})

app.post('/api/sonhos', authMiddleware, async (req, res) => {
  const state = await loadState()
  const sonho = req.body
  if (!sonho?.nome || !sonho?.meta) return res.status(400).json({ error: 'Dados do sonho inválidos' })

  const owner = getSonhosOwner(state, req.user.userId)
  if (!owner.sonhos) owner.sonhos = []

  const created = { ...sonho, nome: sanitize(sonho.nome), notas: sanitize(sonho.notas || ''), id: `s${Date.now()}` }
  owner.sonhos.push(created)
  await saveState(state)
  return res.json(created)
})

app.put('/api/sonhos/:id', authMiddleware, async (req, res) => {
  const state = await loadState()
  const owner = getSonhosOwner(state, req.user.userId)
  const idx = (owner.sonhos || []).findIndex(s => s.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Sonho não encontrado' })
  owner.sonhos[idx] = { ...owner.sonhos[idx], ...req.body, nome: sanitize(req.body.nome || owner.sonhos[idx].nome) }
  await saveState(state)
  return res.json(owner.sonhos[idx])
})

app.delete('/api/sonhos/:id', authMiddleware, async (req, res) => {
  const state = await loadState()
  const owner = getSonhosOwner(state, req.user.userId)
  owner.sonhos = (owner.sonhos || []).filter(s => s.id !== req.params.id)
  await saveState(state)
  return res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  TRANSACTIONS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.post('/api/transactions', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  const data = req.body

  if (!data?.desc || typeof data.valor !== 'number' || !data.tipo || !data.cat || !data.data) {
    return res.status(400).json({ error: 'Dados da transação inválidos' })
  }

  const tx = { ...data, desc: sanitize(data.desc), cat: sanitize(data.cat), id: `t${Date.now()}` }

  // Atualiza saldo da conta se especificada
  if (data.contaId) {
    const contaIdx = user.profile.contas.findIndex(c => c.id === data.contaId)
    if (contaIdx !== -1) {
      user.profile.contas[contaIdx].saldo += data.tipo === 'entrada' ? data.valor : -data.valor
    }
  }

  user.profile.transacoes.unshift(tx)
  await saveState(state)
  return res.json(tx)
})

app.put('/api/transactions/:id', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  const idx = user.profile.transacoes.findIndex(t => t.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Transação não encontrada' })

  const old = user.profile.transacoes[idx]
  const data = req.body

  // Reverte saldo antigo
  if (old.contaId) {
    const ci = user.profile.contas.findIndex(c => c.id === old.contaId)
    if (ci !== -1) user.profile.contas[ci].saldo += old.tipo === 'entrada' ? -old.valor : old.valor
  }
  // Aplica novo saldo
  if (data.contaId) {
    const ci = user.profile.contas.findIndex(c => c.id === data.contaId)
    if (ci !== -1) user.profile.contas[ci].saldo += data.tipo === 'entrada' ? data.valor : -data.valor
  }

  user.profile.transacoes[idx] = {
    ...old, ...data,
    desc: sanitize(data.desc || old.desc),
    cat: sanitize(data.cat || old.cat),
    updatedAt: new Date().toISOString(),
  }
  await saveState(state)
  return res.json(user.profile.transacoes[idx])
})

app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  user.profile.transacoes = user.profile.transacoes.filter(t => t.id !== req.params.id)
  await saveState(state)
  return res.json({ success: true })
})

// ═══════════════════════════════════════════════════════════════════════════════
//  INVESTIMENTOS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.put('/api/investimentos', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  user.profile.investimentos = { ...user.profile.investimentos, ...req.body }
  await saveState(state)
  return res.json(user.profile.investimentos)
})

// ═══════════════════════════════════════════════════════════════════════════════
//  CONTAS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

app.get('/api/contas', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  return res.json({ contas: user.profile.contas })
})

app.post('/api/contas', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  const data = req.body
  if (!data?.nome || !data?.tipo || typeof data.saldo !== 'number') {
    return res.status(400).json({ error: 'Dados da conta inválidos' })
  }
  const conta = { ...data, nome: sanitize(data.nome), id: `c${Date.now()}`, createdAt: new Date().toISOString() }
  user.profile.contas.push(conta)
  await saveState(state)
  return res.json(conta)
})

app.put('/api/contas/:id', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  const idx = user.profile.contas.findIndex(c => c.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Conta não encontrada' })
  user.profile.contas[idx] = { ...user.profile.contas[idx], ...req.body, nome: sanitize(req.body.nome || user.profile.contas[idx].nome), updatedAt: new Date().toISOString() }
  await saveState(state)
  return res.json(user.profile.contas[idx])
})

app.delete('/api/contas/:id', authMiddleware, async (req, res) => {
  const state = await loadState()
  const user = state.users[req.user.userId]
  user.profile.contas = user.profile.contas.filter(c => c.id !== req.params.id)
  await saveState(state)
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
//  STATIC (produção)
// ═══════════════════════════════════════════════════════════════════════════════

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(CLIENT_DIST))
  app.get('*', (req, res) => res.sendFile(resolve(CLIENT_DIST, 'index.html')))
}

app.listen(PORT, () => console.log(`FinFlow backend rodando em http://localhost:${PORT}`))