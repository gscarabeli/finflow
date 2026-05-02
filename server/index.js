import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import jwt from 'jsonwebtoken'
import { readFile, writeFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash, randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto'
import dotenv from 'dotenv'

// Carregar variáveis de ambiente
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const STATE_PATH = resolve(__dirname, 'state.json')
const JWT_SECRET = process.env.JWT_SECRET || 'finflow-prod-secret-change-this-in-production'
const TOKEN_EXPIRATION = process.env.NODE_ENV === 'production' ? '24h' : '1h'
const PORT = process.env.PORT || 4000
const DEFAULT_GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_GOOGLE_AI_STUDIO_API_KEY'
const CLIENT_DIST = resolve(__dirname, '..', 'dist')

const app = express()
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}))

// Forçar HTTPS em produção
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`)
    } else {
      next()
    }
  })
}

app.use(cors({ origin: process.env.NODE_ENV === 'production' ? false : true, credentials: true }))
app.use(express.json())

async function loadState() {
  const raw = await readFile(STATE_PATH, 'utf-8')
  return JSON.parse(raw)
}

async function saveState(data) {
  await writeFile(STATE_PATH, JSON.stringify(data, null, 2), 'utf-8')
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const derived = pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex')
  return `${salt}:${derived}`
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const derived = pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex')
  const a = Buffer.from(derived, 'hex')
  const b = Buffer.from(hash, 'hex')
  return timingSafeEqual(a, b)
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION })
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.split(' ')[1]
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

function validateProfile(profile) {
  return ['eu', 'ela', 'casal'].includes(profile)
}

function sanitizeText(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/<script|<iframe|<object|<embed|javascript:/gi, '')
}

app.post('/api/auth/login', async (req, res) => {
  const { profile, password } = req.body
  if (!validateProfile(profile) || !password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Perfil ou senha inválidos' })
  }

  const state = await loadState()
  const storedHash = state.auth.passwordHash
  if (!storedHash) {
    const newHash = hashPassword(password)
    state.auth.passwordHash = newHash
    await saveState(state)
  }

  if (!verifyPassword(password, state.auth.passwordHash)) {
    return res.status(401).json({ error: 'Senha incorreta' })
  }

  const token = signToken({ profile })
  return res.json({ token, profile })
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  return res.json({ profile: req.user.profile })
})

app.get('/api/profile', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const state = await loadState()

  if (profile === 'casal') {
    return res.json({ eu: state.profiles.eu, ela: state.profiles.ela })
  }

  return res.json({ [profile]: state.profiles[profile] })
})

app.get('/api/sonhos', authMiddleware, async (req, res) => {
  const state = await loadState()
  return res.json(state.sonhos)
})

app.post('/api/sonhos', authMiddleware, async (req, res) => {
  const state = await loadState()
  const sonho = req.body
  if (!sonho || !sonho.nome || !sonho.meta) {
    return res.status(400).json({ error: 'Dados do sonho inválidos' })
  }
  const sanitized = {
    ...sonho,
    nome: sanitizeText(sonho.nome),
    notas: sanitizeText(sonho.notas || ''),
    id: `s${Date.now()}`,
  }
  state.sonhos.push(sanitized)
  await saveState(state)
  return res.json(sanitized)
})

app.put('/api/sonhos/:id', authMiddleware, async (req, res) => {
  const state = await loadState()
  const { id } = req.params
  const updatedFields = req.body
  const index = state.sonhos.findIndex((item) => item.id === id)
  if (index === -1) {
    return res.status(404).json({ error: 'Sonho não encontrado' })
  }
  state.sonhos[index] = {
    ...state.sonhos[index],
    ...updatedFields,
    nome: sanitizeText(updatedFields.nome || state.sonhos[index].nome),
    notas: sanitizeText(updatedFields.notas || state.sonhos[index].notas),
  }
  await saveState(state)
  return res.json(state.sonhos[index])
})

app.delete('/api/sonhos/:id', authMiddleware, async (req, res) => {
  const state = await loadState()
  const { id } = req.params
  state.sonhos = state.sonhos.filter((item) => item.id !== id)
  await saveState(state)
  return res.json({ success: true })
})

app.get('/api/transactions', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const state = await loadState()
  if (profile === 'casal') {
    return res.json({
      eu: state.profiles.eu.transacoes,
      ela: state.profiles.ela.transacoes,
    })
  }
  return res.json({ transacoes: state.profiles[profile].transacoes })
})

app.post('/api/transactions', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const data = req.body
  if (!data || !data.desc || typeof data.valor !== 'number' || !data.tipo || !data.cat || !data.data) {
    return res.status(400).json({ error: 'Dados da transação inválidos' })
  }
  const state = await loadState()
  const target = profile === 'casal' ? 'eu' : profile
  const transaction = {
    ...data,
    desc: sanitizeText(data.desc),
    cat: sanitizeText(data.cat),
    id: `t${Date.now()}`,
  }

  // Se for entrada e especificar conta, atualizar saldo da conta
  if (data.tipo === 'entrada' && data.contaId) {
    const contaIndex = state.profiles[target].contas.findIndex(c => c.id === data.contaId)
    if (contaIndex !== -1) {
      state.profiles[target].contas[contaIndex].saldo += data.valor
    }
  }

  // Se for saída e especificar conta, atualizar saldo da conta
  if (data.tipo === 'saida' && data.contaId) {
    const contaIndex = state.profiles[target].contas.findIndex(c => c.id === data.contaId)
    if (contaIndex !== -1) {
      state.profiles[target].contas[contaIndex].saldo -= data.valor
    }
  }

  state.profiles[target].transacoes.unshift(transaction)
  await saveState(state)
  return res.json(transaction)
})

app.put('/api/transactions/:id', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const target = profile === 'casal' ? 'eu' : profile
  const { id } = req.params
  const data = req.body
  const state = await loadState()
  const index = state.profiles[target].transacoes.findIndex((tx) => tx.id === id)
  if (index === -1) {
    return res.status(404).json({ error: 'Transação não encontrada' })
  }

  const oldTransaction = state.profiles[target].transacoes[index]

  // Reverter saldo da conta antiga se havia conta associada
  if (oldTransaction.contaId) {
    const oldContaIndex = state.profiles[target].contas.findIndex(c => c.id === oldTransaction.contaId)
    if (oldContaIndex !== -1) {
      if (oldTransaction.tipo === 'entrada') {
        state.profiles[target].contas[oldContaIndex].saldo -= oldTransaction.valor
      } else if (oldTransaction.tipo === 'saida') {
        state.profiles[target].contas[oldContaIndex].saldo += oldTransaction.valor
      }
    }
  }

  // Aplicar novo saldo se houver nova conta
  if (data.contaId) {
    const newContaIndex = state.profiles[target].contas.findIndex(c => c.id === data.contaId)
    if (newContaIndex !== -1) {
      if (data.tipo === 'entrada') {
        state.profiles[target].contas[newContaIndex].saldo += data.valor
      } else if (data.tipo === 'saida') {
        state.profiles[target].contas[newContaIndex].saldo -= data.valor
      }
    }
  }

  state.profiles[target].transacoes[index] = {
    ...state.profiles[target].transacoes[index],
    ...data,
    desc: data.desc ? sanitizeText(data.desc) : state.profiles[target].transacoes[index].desc,
    cat: data.cat ? sanitizeText(data.cat) : state.profiles[target].transacoes[index].cat,
    updatedAt: new Date().toISOString(),
  }
  await saveState(state)
  return res.json(state.profiles[target].transacoes[index])
})

app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const target = profile === 'casal' ? 'eu' : profile
  const state = await loadState()
  const { id } = req.params
  state.profiles[target].transacoes = state.profiles[target].transacoes.filter((tx) => tx.id !== id)
  await saveState(state)
  return res.json({ success: true })
})

app.put('/api/investimentos', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const data = req.body
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Dados de investimento inválidos' })
  }
  const state = await loadState()
  const target = profile === 'casal' ? 'eu' : profile
  state.profiles[target].investimentos = {
    ...state.profiles[target].investimentos,
    ...data,
  }
  await saveState(state)
  return res.json(state.profiles[target].investimentos)
})

// CRUD para Contas/Cartões
app.get('/api/contas', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const state = await loadState()
  if (profile === 'casal') {
    return res.json({
      eu: state.profiles.eu.contas,
      ela: state.profiles.ela.contas,
    })
  }
  return res.json({ contas: state.profiles[profile].contas })
})

app.post('/api/contas', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const data = req.body
  if (!data || !data.nome || !data.tipo || typeof data.saldo !== 'number') {
    return res.status(400).json({ error: 'Dados da conta inválidos' })
  }
  const state = await loadState()
  const target = profile === 'casal' ? 'eu' : profile
  const conta = {
    ...data,
    nome: sanitizeText(data.nome),
    tipo: sanitizeText(data.tipo),
    id: `c${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  state.profiles[target].contas.push(conta)
  await saveState(state)
  return res.json(conta)
})

app.put('/api/contas/:id', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const target = profile === 'casal' ? 'eu' : profile
  const { id } = req.params
  const data = req.body
  const state = await loadState()
  const index = state.profiles[target].contas.findIndex((conta) => conta.id === id)
  if (index === -1) {
    return res.status(404).json({ error: 'Conta não encontrada' })
  }
  state.profiles[target].contas[index] = {
    ...state.profiles[target].contas[index],
    ...data,
    nome: data.nome ? sanitizeText(data.nome) : state.profiles[target].contas[index].nome,
    tipo: data.tipo ? sanitizeText(data.tipo) : state.profiles[target].contas[index].tipo,
    updatedAt: new Date().toISOString(),
  }
  await saveState(state)
  return res.json(state.profiles[target].contas[index])
})

app.delete('/api/contas/:id', authMiddleware, async (req, res) => {
  const { profile } = req.user
  const target = profile === 'casal' ? 'eu' : profile
  const state = await loadState()
  const { id } = req.params
  state.profiles[target].contas = state.profiles[target].contas.filter((conta) => conta.id !== id)
  await saveState(state)
  return res.json({ success: true })
})

app.post('/api/gemini', authMiddleware, async (req, res) => {
  const { prompt, maxTokens, temperature, model } = req.body
  const apiKey = req.body.apiKey || DEFAULT_GEMINI_API_KEY
  if (!apiKey || !prompt) {
    return res.status(400).json({ error: 'Prompt ou chave de IA não configurado' })
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model || 'gemini-2.5-flash')}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: prompt.systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: prompt.userPrompt }] }],
          generationConfig: {
            temperature: temperature ?? 0.2,
            maxOutputTokens: maxTokens ?? 2048,
          },
        }),
      }
    )

    const data = await response.json()
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || 'Erro ao chamar Gemini' })
    }

    return res.json(data)
  } catch (error) {
    return res.status(500).json({ error: 'Erro de conexão com Gemini' })
  }
})

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(CLIENT_DIST))
  app.get('*', (req, res) => {
    res.sendFile(resolve(CLIENT_DIST, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`FinFlow backend rodando em http://localhost:${PORT}`)
})
