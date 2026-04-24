import React from 'react'
import { useStore } from './store/useStore.js'
import Header from './components/shared/Header.jsx'
import Dashboard from './components/Dashboard/Dashboard.jsx'
import Investimentos from './components/Investimentos/Investimentos.jsx'
import Sonhos from './components/Sonhos/Sonhos.jsx'
import IAChat from './components/IAChat/IAChat.jsx'

export default function App() {
  const { tab } = useStore()

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
