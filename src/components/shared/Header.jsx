import React, { useState } from 'react'
import { UserPlus, Loader } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { Modal, Input, Button } from './UI.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'contas', label: 'Contas' },
  { id: 'investimentos', label: 'Investimentos' },
  { id: 'sonhos', label: 'Sonhos', onlyCasal: true },
  { id: 'ia', label: 'Consultoria IA', onlyCasal: true },
]

const THEME_OPTIONS = [
  { id: 'default', label: 'Verde' },
  { id: 'larissa', label: 'Rosa' },
  { id: 'casal', label: 'Azul' },
  { id: 'sunset', label: 'Laranja' },
]

function InviteModal({ open, onClose }) {
  const { invitePartner } = useStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  function handleClose() {
    setEmail(''); setMsg(null); setLoading(false)
    onClose()
  }

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
        <div className="text-xs mb-3 p-2.5 rounded-lg border"
          style={{
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

export default function Header() {
  const { tab, viewMode, themeByMode, setTab, setViewMode, setTheme, authenticated, logout, partnerProfile, currentUser } = useStore()
  const [showInvite, setShowInvite] = useState(false)

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
        {TABS.filter(t => !t.onlyCasal || viewMode === 'casal').map((t) => (
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
      <div className="flex flex-wrap gap-1 items-center w-full sm:w-auto justify-center sm:justify-start">

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

        <div className="h-6 border-l border-gray-500/30 mx-2 hidden sm:block" />

        {/* Theme options */}
        <div className="flex flex-wrap gap-1 items-center justify-center sm:justify-start">
          {THEME_OPTIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="rounded-lg border-0 cursor-pointer transition-all duration-150 text-xs font-semibold px-3 py-1.5"
              style={themeByMode[viewMode] === t.id
                ? { background: 'var(--blue)', color: '#fff' }
                : { background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}
            >
              {t.label}
            </button>
          ))}
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
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} />
    </header>
  )
}
