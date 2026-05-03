import React, { useEffect } from 'react'
import { useStore } from './store/useStore.js'
import { logSecurityWarnings } from './hooks/useSecurity.js'
import Header from './components/shared/Header.jsx'
import Login from './components/Login/Login.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import Contas from './components/Contas/Contas.jsx'
import Investimentos from './components/Investimentos/Investimentos.jsx'
import Sonhos from './components/Sonhos/Sonhos.jsx'
import IAChat from './components/IAChat/IAChat.jsx'
import APagar from './components/APagar/APagar.jsx'

if (typeof window !== 'undefined') {
  logSecurityWarnings()
}

// Maps legacy theme names (stored before hex migration) to their hex equivalents
const LEGACY_THEME_NAMES = {
  default: '#16a34a',
  larissa: '#ec4899',
  casal:   '#0ea5e9',
  sunset:  '#f97316',
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l * 100]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return [h * 360, s * 100, l * 100]
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const a = s * Math.min(l, 1 - l)
  const f = (n) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function generateTheme(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) hex = '#16a34a'
  const [h, s] = hexToHsl(hex)
  const sat = Math.max(s, 45)
  return {
    '--blue':      hex,
    '--blue2':     hslToHex(h, Math.min(sat + 8, 100), 68),
    '--blue-bg':   hslToHex(h, Math.min(sat * 0.7, 70), 8),
    '--purple':    hslToHex((h + 25) % 360, Math.max(sat - 10, 40), 65),
    '--purple-bg': hslToHex((h + 25) % 360, Math.min(sat * 0.7, 70), 8),
    '--green':     '#22c55e',
    '--green-bg':  '#0f2a1a',
    '--bg':        hslToHex(h, Math.min(s * 0.3, 20), 4),
    '--bg2':       hslToHex(h, Math.min(s * 0.3, 20), 6.5),
    '--bg3':       hslToHex(h, Math.min(s * 0.3, 20), 9),
    '--bg4':       hslToHex(h, Math.min(s * 0.3, 20), 11),
    '--text':      hslToHex(h, Math.min(s * 0.1, 12), 92),
    '--text2':     hslToHex(h, Math.min(s * 0.25, 30), 68),
    '--text3':     hslToHex(h, Math.min(s * 0.25, 30), 50),
    '--border':    hslToHex(h, Math.min(s * 0.35, 35), 17),
    '--border2':   hslToHex(h, Math.min(s * 0.35, 35), 25),
  }
}

export default function App() {
  const { tab, viewMode, themeByMode, authenticated, initialized, initialize, acceptInvite } = useStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const raw = themeByMode[viewMode] || '#16a34a'
    const hex = LEGACY_THEME_NAMES[raw] || raw
    Object.entries(generateTheme(hex)).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  }, [viewMode, themeByMode])

  // Accept couple invite from URL (?invite=TOKEN) or sessionStorage (post-register flow)
  useEffect(() => {
    if (!authenticated) return
    const params = new URLSearchParams(window.location.search)
    const inviteToken = params.get('invite') || sessionStorage.getItem('pendingInvite')
    if (!inviteToken) return
    sessionStorage.removeItem('pendingInvite')
    window.history.replaceState({}, '', window.location.pathname)
    acceptInvite(inviteToken).catch(() => {})
  }, [authenticated])

  if (!initialized) {
    return null
  }

  if (!authenticated) {
    return <Login />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <main>
        {tab === 'dashboard' && <Dashboard />}
        {tab === 'contas' && <Contas />}
        {tab === 'investimentos' && <Investimentos />}
        {tab === 'apagar' && <APagar />}
        {tab === 'sonhos' && <Sonhos />}
        {tab === 'ia' && <IAChat />}
      </main>
    </div>
  )
}
