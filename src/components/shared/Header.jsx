import React from 'react'
import { useStore } from '../../store/useStore.js'

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'contas', label: 'Contas' },
  { id: 'investimentos', label: 'Investimentos' },
  { id: 'sonhos', label: 'Sonhos', onlyCasal: true },
  { id: 'ia', label: 'Consultoria IA', onlyCasal: true },
]

const PROFILES = [
  { id: 'solo', label: 'Solo' },
  { id: 'casal', label: 'Casal' },
]

const THEME_OPTIONS = [
  { id: 'default', label: 'Verde' },
  { id: 'larissa', label: 'Rosa' },
  { id: 'casal', label: 'Azul' },
  { id: 'sunset', label: 'Laranja' },
]

export default function Header() {
  const { tab, viewMode, themeByMode, setTab, setViewMode, setTheme, authenticated, logout } = useStore()

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

      {/* Profile switcher */}
      <div className="flex flex-wrap gap-1 items-center w-full sm:w-auto justify-center sm:justify-start">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => setViewMode(p.id)}
            className="rounded-lg border-0 cursor-pointer transition-all duration-150 text-xs font-semibold px-3 py-1.5"
            style={viewMode === p.id
              ? { background: 'var(--blue)', color: '#fff' }
              : { background: 'transparent', color: 'var(--text3)', border: '1px solid var(--border)' }}
          >
            {p.label}
          </button>
        ))}
        <div className="h-6 border-l border-gray-500/30 mx-2 hidden sm:block" />
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
    </header>
  )
}
