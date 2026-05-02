import React, { useEffect } from 'react'
import { useStore } from './store/useStore.js'
import { logSecurityWarnings } from './hooks/useSecurity.js'
import Header from './components/shared/Header.jsx'
import Login from './components/Login/Login.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import Investimentos from './components/Investimentos/Investimentos.jsx'
import Sonhos from './components/Sonhos/Sonhos.jsx'
import IAChat from './components/IAChat/IAChat.jsx'

if (typeof window !== 'undefined') {
  logSecurityWarnings()
}

const THEME_VARIANTS = {
  default: {
    '--blue': '#16a34a',
    '--blue2': '#22c55e',
    '--blue-bg': '#0d2414',
    '--purple': '#86efac',
    '--purple-bg': '#0d2414',
    '--green': '#22c55e',
    '--green-bg': '#0f2a1a',
    '--bg': '#08120f',
    '--bg2': '#0d1a12',
    '--bg3': '#12221b',
    '--bg4': '#172a22',
    '--text': '#e9f7ec',
    '--text2': '#a3d8b6',
    '--text3': '#7caf8c',
    '--border': '#2c4d33',
    '--border2': '#3f6a46',
  },
  larissa: {
    '--blue': '#ec4899',
    '--blue2': '#d946ef',
    '--blue-bg': '#2a122e',
    '--purple': '#f9a8d4',
    '--purple-bg': '#2a122e',
    '--green': '#22c55e',
    '--green-bg': '#0f2a1a',
    '--bg': '#130c1a',
    '--bg2': '#190f24',
    '--bg3': '#21132f',
    '--bg4': '#2a173a',
    '--text': '#f4e6f0',
    '--text2': '#d7b7cc',
    '--text3': '#c08fae',
    '--border': '#4b3350',
    '--border2': '#6e4d78',
  },
  casal: {
    '--blue': '#0ea5e9',
    '--blue2': '#38bdf8',
    '--blue-bg': '#031b2f',
    '--purple': '#8b5cf6',
    '--purple-bg': '#11142b',
    '--green': '#22c55e',
    '--green-bg': '#04221e',
    '--bg': '#04131f',
    '--bg2': '#071923',
    '--bg3': '#0c2131',
    '--bg4': '#122a3d',
    '--text': '#e7f5ff',
    '--text2': '#9dd4f5',
    '--text3': '#7aaecd',
    '--border': '#1b3e57',
    '--border2': '#2a5b78',
  },
  sunset: {
    '--blue': '#f97316',
    '--blue2': '#fb923c',
    '--blue-bg': '#2b1104',
    '--purple': '#f59e0b',
    '--purple-bg': '#2b1404',
    '--green': '#22c55e',
    '--green-bg': '#142012',
    '--bg': '#100b05',
    '--bg2': '#1b1108',
    '--bg3': '#24150b',
    '--bg4': '#2f1a0e',
    '--text': '#fff0db',
    '--text2': '#f3c9a2',
    '--text3': '#d99d70',
    '--border': '#4a2b18',
    '--border2': '#6b4231',
  },
}

export default function App() {
  const { tab, profile, themeByProfile, authenticated, initialized, initialize } = useStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    const theme = themeByProfile[profile] || 'default'
    const variables = THEME_VARIANTS[theme] || THEME_VARIANTS.default
    Object.entries(variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  }, [profile, themeByProfile])

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
        {tab === 'investimentos' && <Investimentos />}
        {tab === 'sonhos' && <Sonhos />}
        {tab === 'ia' && <IAChat />}
      </main>
    </div>
  )
}
