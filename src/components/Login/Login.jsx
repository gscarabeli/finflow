import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, CheckCircle, XCircle, Loader } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { Card, Button } from '../shared/UI.jsx'

// ─── Password strength checker ────────────────────────────────────────────────
const PASSWORD_RULES = [
  { id: 'length',  label: 'Mínimo 8 caracteres',          test: p => p.length >= 8 },
  { id: 'upper',   label: 'Uma letra maiúscula',           test: p => /[A-Z]/.test(p) },
  { id: 'lower',   label: 'Uma letra minúscula',           test: p => /[a-z]/.test(p) },
  { id: 'number',  label: 'Um número',                     test: p => /\d/.test(p) },
  { id: 'special', label: 'Um caractere especial (!@#...)', test: p => /[^A-Za-z\d]/.test(p) },
]

function getStrength(password) {
  const passed = PASSWORD_RULES.filter(r => r.test(password)).length
  if (passed <= 1) return { level: 0, label: 'Muito fraca', color: 'var(--red)' }
  if (passed === 2) return { level: 1, label: 'Fraca',      color: '#f97316' }
  if (passed === 3) return { level: 2, label: 'Média',      color: 'var(--amber)' }
  if (passed === 4) return { level: 3, label: 'Boa',        color: '#84cc16' }
  return             { level: 4, label: 'Forte',            color: 'var(--green)' }
}

function PasswordStrength({ password }) {
  if (!password) return null
  const strength = getStrength(password)
  const rules = PASSWORD_RULES.map(r => ({ ...r, ok: r.test(password) }))

  return (
    <div className="mb-3">
      {/* barra de força */}
      <div className="flex gap-1 mb-1.5">
        {[0,1,2,3].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i < strength.level + 1 ? strength.color : 'var(--bg4)' }} />
        ))}
      </div>
      <div className="text-xs mb-2" style={{ color: strength.color }}>{strength.label}</div>
      <div className="grid grid-cols-1 gap-1">
        {rules.map(r => (
          <div key={r.id} className="flex items-center gap-1.5 text-xs"
            style={{ color: r.ok ? 'var(--green)' : 'var(--text3)' }}>
            {r.ok
              ? <CheckCircle size={11} style={{ color: 'var(--green)', flexShrink: 0 }} />
              : <XCircle size={11} style={{ color: 'var(--text3)', flexShrink: 0 }} />}
            {r.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function PasswordInput({ value, onChange, placeholder, label, onKeyPress }) {
  const [show, setShow] = useState(false)
  return (
    <div className="mb-3">
      {label && <div className="text-xs uppercase tracking-[0.25em] mb-2" style={{ color: 'var(--text3)' }}>{label}</div>}
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onKeyPress={onKeyPress}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors pr-10"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}
          autoComplete="current-password"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent cursor-pointer p-0"
          style={{ color: 'var(--text3)' }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
    </div>
  )
}

function Alert({ type, children }) {
  const styles = {
    error:   { background: 'var(--red-bg)',   color: 'var(--red)',   border: 'var(--red)' },
    success: { background: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green)' },
    info:    { background: 'var(--blue-bg)',  color: 'var(--blue)',  border: 'var(--blue)' },
  }
  const s = styles[type] || styles.info
  return (
    <div className="text-xs mb-3 p-2.5 rounded-lg border"
      style={{ background: s.background, color: s.color, borderColor: s.border }}>
      {children}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Login() {
  const { login, register } = useStore()

  // step: 'login' | 'register' | 'verify-pending' | 'forgot' | 'forgot-sent' | 'reset'
  const [step, setStep] = useState('login')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null) // { type, text }

  // Fields
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [password2, setPassword2] = useState('')
  const [resetToken, setResetToken] = useState('')

  // Detect ?verified=true or ?reset=TOKEN in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('verified') === 'true') {
      setMessage({ type: 'success', text: '✅ E-mail verificado! Você já pode fazer login.' })
      window.history.replaceState({}, '', window.location.pathname)
    }
    if (params.get('reset')) {
      setResetToken(params.get('reset'))
      setStep('reset')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  function reset() {
    setName(''); setEmail(''); setPassword(''); setPassword2('')
    setMessage(null)
  }

  function goTo(s) { reset(); setStep(s) }

  const handleEnter = (fn) => (e) => { if (e.key === 'Enter') fn() }

  // ── Login ──────────────────────────────────────────────────────────────────
  async function handleLogin() {
    if (!email || !password) return setMessage({ type: 'error', text: 'Preencha todos os campos' })
    setLoading(true); setMessage(null)
    try {
      await login(email, password)
      // useStore.login vai setar authenticated = true e o app redireciona
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        setMessage({ type: 'error', text: 'E-mail não verificado. Verifique sua caixa de entrada ou reenvie o link.' })
      } else {
        setMessage({ type: 'error', text: err.message || 'E-mail ou senha incorretos' })
      }
      setPassword('')
    } finally {
      setLoading(false)
    }
  }

  // ── Register ───────────────────────────────────────────────────────────────
  async function handleRegister() {
    if (!name || !email || !password || !password2) return setMessage({ type: 'error', text: 'Preencha todos os campos' })
    if (password !== password2) return setMessage({ type: 'error', text: 'As senhas não coincidem' })
    const allRules = PASSWORD_RULES.every(r => r.test(password))
    if (!allRules) return setMessage({ type: 'error', text: 'Sua senha não atende todos os requisitos' })

    setLoading(true); setMessage(null)
    try {
      await register(name, email, password)
      setStep('verify-pending')
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao criar conta' })
    } finally {
      setLoading(false)
    }
  }

  // ── Resend verification ────────────────────────────────────────────────────
  async function handleResend() {
    if (!email) return setMessage({ type: 'error', text: 'Informe seu e-mail' })
    setLoading(true); setMessage(null)
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setMessage({ type: 'success', text: data.message })
    } catch {
      setMessage({ type: 'error', text: 'Erro ao reenviar. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Forgot password ────────────────────────────────────────────────────────
  async function handleForgot() {
    if (!email) return setMessage({ type: 'error', text: 'Informe seu e-mail' })
    setLoading(true); setMessage(null)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setMessage({ type: 'success', text: data.message })
      setStep('forgot-sent')
    } catch {
      setMessage({ type: 'error', text: 'Erro ao enviar. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  // ── Reset password ─────────────────────────────────────────────────────────
  async function handleReset() {
    if (!password || !password2) return setMessage({ type: 'error', text: 'Preencha todos os campos' })
    if (password !== password2) return setMessage({ type: 'error', text: 'As senhas não coincidem' })
    const allRules = PASSWORD_RULES.every(r => r.test(password))
    if (!allRules) return setMessage({ type: 'error', text: 'Sua senha não atende todos os requisitos' })

    setLoading(true); setMessage(null)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMessage({ type: 'success', text: '✅ Senha redefinida com sucesso!' })
      setTimeout(() => goTo('login'), 2000)
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao redefinir senha' })
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  const inputClass = "w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors mb-3"
  const inputStyle = { background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'Sora', sans-serif" }
  const labelClass = "text-xs uppercase tracking-[0.25em] mb-2 block"

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <Card className="p-8">

          {/* Logo */}
          <div className="text-center mb-6">
            <div className="text-3xl font-semibold" style={{ color: 'var(--text)' }}>
              fin<span style={{ color: 'var(--blue)' }}>.</span>flow
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--text3)' }}>
              {{
                'login':         'Bem-vindo de volta 👋',
                'register':      'Crie sua conta gratuita',
                'verify-pending':'Verifique seu e-mail',
                'forgot':        'Esqueceu a senha?',
                'forgot-sent':   'E-mail enviado!',
                'reset':         'Criar nova senha',
              }[step]}
            </p>
          </div>

          {/* Alert */}
          {message && <Alert type={message.type}>{message.text}</Alert>}

          {/* ── LOGIN ── */}
          {step === 'login' && (
            <>
              <label className={labelClass} style={{ color: 'var(--text3)' }}>E-mail</label>
              <input type="email" placeholder="seu@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setMessage(null) }}
                onKeyPress={handleEnter(handleLogin)}
                className={inputClass} style={inputStyle} autoComplete="email" />

              <PasswordInput label="Senha" value={password} placeholder="••••••••"
                onChange={e => { setPassword(e.target.value); setMessage(null) }}
                onKeyPress={handleEnter(handleLogin)} />

              <div className="text-right mb-4">
                <button onClick={() => goTo('forgot')}
                  className="text-xs bg-transparent border-0 cursor-pointer"
                  style={{ color: 'var(--blue)' }}>
                  Esqueci minha senha
                </button>
              </div>

              <Button onClick={handleLogin} disabled={loading} className="w-full mb-3">
                {loading ? <><Loader size={14} className="inline animate-spin mr-2" />Entrando...</> : 'Entrar →'}
              </Button>

              <p className="text-center text-xs" style={{ color: 'var(--text3)' }}>
                Não tem conta?{' '}
                <button onClick={() => goTo('register')}
                  className="bg-transparent border-0 cursor-pointer font-semibold"
                  style={{ color: 'var(--blue)' }}>
                  Criar conta
                </button>
              </p>
            </>
          )}

          {/* ── REGISTER ── */}
          {step === 'register' && (
            <>
              <label className={labelClass} style={{ color: 'var(--text3)' }}>Nome</label>
              <input type="text" placeholder="Seu nome" value={name}
                onChange={e => { setName(e.target.value); setMessage(null) }}
                className={inputClass} style={inputStyle} autoComplete="name" />

              <label className={labelClass} style={{ color: 'var(--text3)' }}>E-mail</label>
              <input type="email" placeholder="seu@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setMessage(null) }}
                className={inputClass} style={inputStyle} autoComplete="email" />

              <PasswordInput label="Senha" value={password} placeholder="Crie uma senha forte"
                onChange={e => { setPassword(e.target.value); setMessage(null) }} />
              <PasswordStrength password={password} />

              <PasswordInput label="Confirmar senha" value={password2} placeholder="Repita a senha"
                onChange={e => { setPassword2(e.target.value); setMessage(null) }}
                onKeyPress={handleEnter(handleRegister)} />

              {password2 && password !== password2 && (
                <div className="text-xs mb-3" style={{ color: 'var(--red)' }}>
                  ✗ As senhas não coincidem
                </div>
              )}
              {password2 && password === password2 && password2.length > 0 && (
                <div className="text-xs mb-3" style={{ color: 'var(--green)' }}>
                  ✓ Senhas coincidem
                </div>
              )}

              <Button onClick={handleRegister} disabled={loading} className="w-full mb-3">
                {loading ? <><Loader size={14} className="inline animate-spin mr-2" />Criando conta...</> : 'Criar conta →'}
              </Button>

              <p className="text-center text-xs" style={{ color: 'var(--text3)' }}>
                Já tem conta?{' '}
                <button onClick={() => goTo('login')}
                  className="bg-transparent border-0 cursor-pointer font-semibold"
                  style={{ color: 'var(--blue)' }}>
                  Fazer login
                </button>
              </p>
            </>
          )}

          {/* ── VERIFY PENDING ── */}
          {step === 'verify-pending' && (
            <>
              <div className="text-center py-4">
                <div className="text-5xl mb-4">📬</div>
                <p className="text-sm mb-2" style={{ color: 'var(--text2)' }}>
                  Enviamos um link de confirmação para:
                </p>
                <p className="text-sm font-semibold mb-6" style={{ color: 'var(--blue)' }}>{email}</p>
                <p className="text-xs mb-6" style={{ color: 'var(--text3)' }}>
                  Verifique também sua caixa de spam. O link expira em 24 horas.
                </p>
              </div>

              <Button onClick={handleResend} disabled={loading} variant="ghost" className="w-full mb-3">
                {loading ? 'Reenviando...' : '🔁 Reenviar e-mail'}
              </Button>

              <p className="text-center text-xs" style={{ color: 'var(--text3)' }}>
                <button onClick={() => goTo('login')}
                  className="bg-transparent border-0 cursor-pointer"
                  style={{ color: 'var(--blue)' }}>
                  ← Voltar ao login
                </button>
              </p>
            </>
          )}

          {/* ── FORGOT ── */}
          {step === 'forgot' && (
            <>
              <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>

              <label className={labelClass} style={{ color: 'var(--text3)' }}>E-mail</label>
              <input type="email" placeholder="seu@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setMessage(null) }}
                onKeyPress={handleEnter(handleForgot)}
                className={inputClass} style={inputStyle} autoComplete="email" />

              <Button onClick={handleForgot} disabled={loading} className="w-full mb-3">
                {loading ? <><Loader size={14} className="inline animate-spin mr-2" />Enviando...</> : 'Enviar link →'}
              </Button>

              <p className="text-center text-xs" style={{ color: 'var(--text3)' }}>
                <button onClick={() => goTo('login')}
                  className="bg-transparent border-0 cursor-pointer"
                  style={{ color: 'var(--blue)' }}>
                  ← Voltar ao login
                </button>
              </p>
            </>
          )}

          {/* ── FORGOT SENT ── */}
          {step === 'forgot-sent' && (
            <>
              <div className="text-center py-4">
                <div className="text-5xl mb-4">✉️</div>
                <p className="text-sm mb-6" style={{ color: 'var(--text2)' }}>
                  Se o e-mail estiver cadastrado, você receberá as instruções em breve. Verifique também o spam.
                </p>
              </div>
              <Button onClick={() => goTo('login')} variant="ghost" className="w-full">
                ← Voltar ao login
              </Button>
            </>
          )}

          {/* ── RESET ── */}
          {step === 'reset' && (
            <>
              <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>
                Escolha uma nova senha segura para sua conta.
              </p>

              <PasswordInput label="Nova senha" value={password} placeholder="Crie uma senha forte"
                onChange={e => { setPassword(e.target.value); setMessage(null) }} />
              <PasswordStrength password={password} />

              <PasswordInput label="Confirmar nova senha" value={password2} placeholder="Repita a senha"
                onChange={e => { setPassword2(e.target.value); setMessage(null) }}
                onKeyPress={handleEnter(handleReset)} />

              {password2 && password !== password2 && (
                <div className="text-xs mb-3" style={{ color: 'var(--red)' }}>✗ As senhas não coincidem</div>
              )}
              {password2 && password === password2 && (
                <div className="text-xs mb-3" style={{ color: 'var(--green)' }}>✓ Senhas coincidem</div>
              )}

              <Button onClick={handleReset} disabled={loading} className="w-full mb-3">
                {loading ? <><Loader size={14} className="inline animate-spin mr-2" />Redefinindo...</> : 'Redefinir senha →'}
              </Button>
            </>
          )}

        </Card>
      </div>
    </div>
  )
}