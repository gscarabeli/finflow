import React, { useState } from 'react'
import { useStore } from '../../store/useStore.js'
import { Card, Button } from '../shared/UI.jsx'

const ACCOUNTS = [
  { id: 'eu', label: 'Gustavo', subtitle: 'Perfil pessoal' },
  { id: 'ela', label: 'Larissa', subtitle: 'Perfil pessoal' },
  { id: 'casal', label: 'Casal', subtitle: 'Visão consolidada' },
]

export default function Login() {
  const { login } = useStore()
  const [selected, setSelected] = useState('eu')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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
