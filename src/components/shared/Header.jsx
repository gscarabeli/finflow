import React, { useState, useRef, useEffect } from 'react'
import { UserPlus, Loader } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { Modal, Input, Button } from './UI.jsx'

const TABS = [
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'contas',       label: 'Contas' },
  { id: 'investimentos',label: 'Investimentos' },
  { id: 'apagar',       label: 'A Pagar' },
  { id: 'sonhos',       label: 'Sonhos',        requiresCasal: true },
  { id: 'ia',           label: 'Consultoria IA', requiresCasal: true },
]

// Backwards-compat: legacy theme names stored before hex migration
const LEGACY_HEX = { default: '#16a34a', larissa: '#ec4899', casal: '#0ea5e9', sunset: '#f97316' }

const PRESET_COLORS = [
  '#16a34a', '#22c55e',
  '#14b8a6', '#06b6d4',
  '#0ea5e9', '#3b82f6',
  '#8b5cf6', '#a855f7',
  '#ec4899', '#e11d48',
  '#ef4444', '#f97316',
  '#f59e0b', '#84cc16',
  '#d946ef', '#64748b',
]

// ─── Image resize helper ───────────────────────────────────────────────────────
function resizeImage(file, maxPx = 200) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.src = url
  })
}

// ─── ColorPicker ──────────────────────────────────────────────────────────────
function ColorPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const currentHex = LEGACY_HEX[value] || value || '#16a34a'

  useEffect(() => {
    if (!open) return
    function onDown(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Cor do tema"
        style={{
          width: 28, height: 28, borderRadius: '50%', padding: 0,
          background: currentHex,
          border: open ? '2.5px solid var(--text)' : '2px solid var(--border2)',
          cursor: 'pointer', flexShrink: 0,
        }}
      />

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 12, width: 176, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10 }}>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => { onChange(c); setOpen(false) }}
                title={c}
                style={{
                  width: 32, height: 32, borderRadius: 8, padding: 0,
                  background: c, cursor: 'pointer',
                  border: c.toLowerCase() === currentHex.toLowerCase()
                    ? '2.5px solid var(--text)'
                    : '2px solid transparent',
                  outline: c.toLowerCase() === currentHex.toLowerCase()
                    ? '2px solid var(--blue)' : 'none',
                  outlineOffset: 1,
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.12)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
            <input
              type="color"
              value={currentHex}
              onChange={e => onChange(e.target.value)}
              style={{ width: 28, height: 28, padding: 0, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }}
            />
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Cor personalizada</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AvatarCircle (reusable) ───────────────────────────────────────────────────
function AvatarCircle({ user, size = 32, style = {} }) {
  const initials = (user?.name || 'U')
    .split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: user?.avatar ? 'transparent' : 'var(--blue-bg)',
      border: '2px solid var(--border2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', flexShrink: 0, ...style,
    }}>
      {user?.avatar
        ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span style={{ fontSize: size * 0.36, fontWeight: 700, color: 'var(--blue)', lineHeight: 1 }}>{initials}</span>
      }
    </div>
  )
}

// ─── ProfileModal ─────────────────────────────────────────────────────────────
function ProfileModal({ open, onClose }) {
  const { currentUser, updateProfile } = useStore()
  const [name, setName]     = useState('')
  const [email, setEmail]   = useState('')
  const [avatar, setAvatar] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]       = useState(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (open) {
      setName(currentUser?.name || '')
      setEmail(currentUser?.email || '')
      setAvatar(currentUser?.avatar || null)
      setMsg(null)
    }
  }, [open, currentUser])

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setMsg({ ok: false, text: 'Arquivo muito grande. Máximo 5 MB.' })
      return
    }
    setMsg(null)
    const resized = await resizeImage(file)
    setAvatar(resized)
  }

  async function submit() {
    setLoading(true); setMsg(null)
    try {
      await updateProfile({ name, email, avatar })
      setMsg({ ok: true, text: 'Perfil atualizado!' })
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Erro ao salvar.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Meu Perfil">
      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{ cursor: 'pointer', borderRadius: '50%', position: 'relative' }}
          title="Trocar foto"
        >
          <AvatarCircle user={{ ...currentUser, avatar }} size={72} style={{ border: '2px solid var(--border2)' }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)', opacity: 0, transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#fff', fontWeight: 600,
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = 1}
            onMouseLeave={e => e.currentTarget.style.opacity = 0}
          >
            Trocar
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => fileRef.current?.click()}
            style={{ fontSize: 11, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Trocar foto
          </button>
          {avatar && (
            <button onClick={() => setAvatar(null)}
              style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Remover
            </button>
          )}
        </div>
      </div>

      <Input label="Nome" value={name} onChange={e => setName(e.target.value)} />
      <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} />

      {msg && (
        <div className="text-xs mb-3 p-2.5 rounded-lg border" style={{
          background: msg.ok ? 'var(--green-bg)' : 'var(--red-bg)',
          color: msg.ok ? 'var(--green)' : 'var(--red)',
          borderColor: msg.ok ? 'var(--green)' : 'var(--red)',
        }}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-2 mt-1">
        <Button onClick={submit} disabled={loading || !name || !email}>
          {loading ? <><Loader size={13} className="inline animate-spin mr-1.5" />Salvando...</> : 'Salvar'}
        </Button>
        <Button variant="ghost" onClick={onClose}>Fechar</Button>
      </div>
    </Modal>
  )
}

// ─── InviteModal ──────────────────────────────────────────────────────────────
function InviteModal({ open, onClose }) {
  const { invitePartner } = useStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  function handleClose() { setEmail(''); setMsg(null); setLoading(false); onClose() }

  async function submit() {
    if (!email) return
    setLoading(true); setMsg(null)
    try {
      await invitePartner(email)
      setMsg({ ok: true, text: 'Convite enviado! Ela vai receber um e-mail com o link.' })
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Erro ao enviar convite.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Convidar Parceiro(a)">
      <p className="text-xs mb-4" style={{ color: 'var(--text3)' }}>
        Informe o e-mail do(a) seu(sua) parceiro(a). Se ela ainda não tiver conta, o link vai direcionar para o cadastro.
      </p>
      <Input
        label="E-mail do(a) parceiro(a)"
        type="email"
        placeholder="parceiro@email.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setMsg(null) }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {msg && (
        <div className="text-xs mb-3 p-2.5 rounded-lg border" style={{
          background: msg.ok ? 'var(--green-bg)' : 'var(--red-bg)',
          color: msg.ok ? 'var(--green)' : 'var(--red)',
          borderColor: msg.ok ? 'var(--green)' : 'var(--red)',
        }}>
          {msg.text}
        </div>
      )}
      <div className="flex gap-2 mt-1">
        <Button onClick={submit} disabled={loading || !email || msg?.ok}>
          {loading ? <><Loader size={13} className="inline animate-spin mr-1.5" />Enviando...</> : 'Enviar convite'}
        </Button>
        <Button variant="ghost" onClick={handleClose}>Fechar</Button>
      </div>
    </Modal>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────
export default function Header() {
  const { tab, viewMode, themeByMode, setTab, setViewMode, setTheme, authenticated, logout, partnerProfile, currentUser } = useStore()
  const [showInvite, setShowInvite]   = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const hasPartner = !!partnerProfile

  return (
    <header className="sticky top-0 z-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 sm:px-6"
      style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>

      {/* Logo */}
      <div className="text-base font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
        fin<span style={{ color: 'var(--blue)' }}>.</span>flow
      </div>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-1 rounded-xl p-1 border overflow-x-auto"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
        {TABS.filter(t => !t.requiresCasal || !hasPartner || viewMode === 'casal').map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-lg border-0 cursor-pointer transition-all duration-150 text-xs font-semibold px-4 py-1.5"
            style={tab === t.id
              ? { background: 'var(--bg4)', color: 'var(--text)', border: '1px solid var(--border2)' }
              : { background: 'transparent', color: 'var(--text3)' }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Right side */}
      <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-center sm:justify-start">

        {/* View mode toggle OR invite button */}
        {hasPartner ? (
          <>
            {['solo', 'casal'].map((id) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                className="rounded-lg border-0 cursor-pointer transition-all duration-150 text-xs font-semibold px-3 py-1.5 capitalize"
                style={viewMode === id
                  ? { background: 'var(--blue)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}
              >
                {id === 'solo' ? (currentUser?.name || 'Solo') : 'Casal'}
              </button>
            ))}
          </>
        ) : (
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 rounded-lg border-0 cursor-pointer transition-all duration-150 text-xs font-semibold px-3 py-1.5"
            style={{ background: 'transparent', color: 'var(--blue)', border: '1px solid var(--border)' }}
          >
            <UserPlus size={13} />
            Convidar parceiro(a)
          </button>
        )}

        <div className="h-6 border-l border-gray-500/30 mx-1 hidden sm:block" />

        {/* Color picker */}
        <ColorPicker
          value={themeByMode[viewMode]}
          onChange={setTheme}
        />

        {/* Avatar / profile button */}
        {authenticated && (
          <button
            onClick={() => setShowProfile(true)}
            title="Meu perfil"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%' }}
          >
            <AvatarCircle user={currentUser} size={30} />
          </button>
        )}

        {/* Logout */}
        {authenticated && (
          <button
            onClick={logout}
            className="rounded-lg border-0 cursor-pointer transition-all duration-150 text-xs font-semibold px-3 py-1.5"
            style={{ background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}
          >
            Sair
          </button>
        )}
      </div>

      <InviteModal  open={showInvite}   onClose={() => setShowInvite(false)} />
      <ProfileModal open={showProfile}  onClose={() => setShowProfile(false)} />
    </header>
  )
}
