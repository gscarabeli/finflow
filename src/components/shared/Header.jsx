import React from 'react'
import { useStore } from '../../store/useStore.js'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'investimentos', label: 'Investimentos' },
  { id: 'sonhos', label: 'Sonhos' },
  { id: 'ia', label: 'Consultoria IA' },
]

const PROFILES = [
  { id: 'eu', label: 'Lucas' },
  { id: 'ela', label: 'Ana' },
  { id: 'casal', label: 'Casal' },
]

export default function Header() {
  const { tab, profile, setTab, setProfile } = useStore()

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6"
      style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', height: 56 }}>
      {/* Logo */}
      <div className="text-base font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
        fin<span style={{ color: 'var(--blue)' }}>.</span>flow
      </div>

      {/* Tabs */}
      <nav className="flex gap-1 rounded-xl p-1 border"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)' }}>
        {TABS.map((t) => (
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

      {/* Profile switcher */}
      <div className="flex gap-1">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => setProfile(p.id)}
            className="rounded-lg border-0 cursor-pointer transition-all duration-150 text-xs font-semibold px-3 py-1.5"
            style={profile === p.id
              ? { background: 'var(--blue)', color: '#fff' }
              : { background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}
          >
            {p.label}
          </button>
        ))}
      </div>
    </header>
  )
}
