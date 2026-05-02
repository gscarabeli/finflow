import React, { useState, useEffect } from 'react'
import { useStore } from '../../store/useStore.js'
import { Card, Button } from '../shared/UI.jsx'

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

const ACCOUNTS = [
  { id: 'eu', label: 'Gustavo', subtitle: 'Perfil pessoal' },
  { id: 'ela', label: 'Larissa', subtitle: 'Perfil pessoal' },
  { id: 'casal', label: 'Casal', subtitle: 'Visão consolidada' },
]

export default function Login() {
  const { login, themeByProfile } = useStore()
  const [selected, setSelected] = useState('eu')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const theme = themeByProfile[selected] || 'default'
    const variables = THEME_VARIANTS[theme] || THEME_VARIANTS.default
    Object.entries(variables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
  }, [selected, themeByProfile])

  const handleLogin = () => {
    if (!password) {
      setError('Insira uma senha para continuar')
      return
    }
    const success = login(selected, password)
    if (!success) {
      setError('Senha incorreta. Tente novamente.')
      setPassword('')
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-6">
            <div className="text-3xl font-semibold" style={{ color: 'var(--text)' }}>
              fin<span style={{ color: 'var(--blue)' }}>.</span>flow
            </div>
            <p className="text-sm mt-2" style={{ color: 'var(--text3)' }}>
              Acesse suas finanças de qualquer lugar com segurança.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-6">
            {ACCOUNTS.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => {
                  setSelected(account.id)
                  setError('')
                }}
                className="rounded-3xl border p-4 text-left transition-all duration-150"
                style={{
                  background: selected === account.id ? 'var(--bg4)' : 'var(--bg2)',
                  borderColor: selected === account.id ? 'var(--blue)' : 'var(--border)',
                  color: selected === account.id ? 'var(--text)' : 'var(--text2)',
                }}
              >
                <div className="text-sm font-semibold">{account.label}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{account.subtitle}</div>
              </button>
            ))}
          </div>

          <div className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: 'var(--text3)' }}>
            Senha de acesso
          </div>
          <input
            type="password"
            placeholder="Digite uma senha"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError('')
            }}
            onKeyPress={handleKeyPress}
            className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors mb-3"
            style={{ background: 'var(--bg3)', borderColor: error ? 'var(--red)' : 'var(--border)', color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}
          />
          {error && (
            <div className="text-xs mb-3" style={{ color: 'var(--red)' }}>{error}</div>
          )}

          <Button onClick={handleLogin} className="w-full">Entrar como {ACCOUNTS.find((a) => a.id === selected).label}</Button>
          
          <div className="text-xs mt-4 p-3 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text3)' }}>
            <strong style={{ color: 'var(--text2)' }}>⚠️ Segurança:</strong> A senha é armazenada localmente. Não utilize senhas sensíveis. Para dados reais, use um backend seguro.
          </div>
        </Card>
      </div>
    </div>
  )
}
