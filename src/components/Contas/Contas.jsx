import React, { useState } from 'react'
import { Plus, Trash2, Edit2, CreditCard, Wallet } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { fmt } from '../../hooks/useUtils.js'
import { Card, CardTitle, Modal, Input, Select, Button } from '../shared/UI.jsx'

function ContaModal({ open, onClose, conta }) {
  const { addConta, updateConta } = useStore()
  const [form, setForm] = useState({ nome: '', tipo: 'conta-corrente', saldo: '' })
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (conta) {
      setForm({ nome: conta.nome, tipo: conta.tipo, saldo: String(conta.saldo) })
    } else {
      setForm({ nome: '', tipo: 'conta-corrente', saldo: '' })
    }
  }, [conta])

  const submit = () => {
    if (!form.nome || form.saldo === '') return
    const data = { ...form, saldo: parseFloat(form.saldo) }
    if (conta) {
      updateConta(conta.id, data)
    } else {
      addConta(data)
    }
    setForm({ nome: '', tipo: 'conta-corrente', saldo: '' })
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={conta ? 'Editar Conta' : 'Nova Conta'}>
      <Input label="Nome da Conta" placeholder="Ex: Conta Corrente, VR, Cartão de Crédito" value={form.nome} onChange={(e) => set('nome', e.target.value)} />
      <Select label="Tipo" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
        <option value="conta-corrente">Conta Corrente</option>
        <option value="conta-poupanca">Conta Poupança</option>
        <option value="vale-refeicao">Vale Refeição (VR)</option>
        <option value="vale-alimentacao">Vale Alimentação (VA)</option>
        <option value="cartao-credito">Cartão de Crédito</option>
        <option value="outros">Outros</option>
      </Select>
      <Input label="Saldo Atual (R$)" type="number" placeholder="0,00" step="0.01" value={form.saldo} onChange={(e) => set('saldo', e.target.value)} />
      <div className="flex gap-2 mt-2">
        <Button onClick={submit}>{conta ? 'Salvar' : 'Criar'}</Button>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </Modal>
  )
}

export default function Contas() {
  const { getActiveData, deleteConta, profile } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editingConta, setEditingConta] = useState(null)
  const pd = getActiveData()

  const getIcon = (tipo) => {
    if (tipo.includes('cartao')) return <CreditCard size={16} />
    return <Wallet size={16} />
  }

  const getTipoLabel = (tipo) => {
    const labels = {
      'conta-corrente': 'Conta Corrente',
      'conta-poupanca': 'Conta Poupança',
      'vale-refeicao': 'Vale Refeição',
      'vale-alimentacao': 'Vale Alimentação',
      'cartao-credito': 'Cartão de Crédito',
      'outros': 'Outros'
    }
    return labels[tipo] || tipo
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Contas e Cartões · {profile === 'casal' ? 'Visão Consolidada' : pd.nome}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Gerencie seus saldos e contas</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Nova Conta</span>
        </Button>
      </div>

      {pd.contas.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Wallet size={48} className="mx-auto mb-4" style={{ color: 'var(--text3)' }} />
            <div className="text-sm font-semibold mb-2" style={{ color: 'var(--text)' }}>Nenhuma conta cadastrada</div>
            <div className="text-xs mb-4" style={{ color: 'var(--text3)' }}>Adicione suas contas e cartões para acompanhar os saldos</div>
            <Button onClick={() => setShowModal(true)}>Criar Primeira Conta</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pd.contas.map((conta) => (
            <Card key={conta.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ background: 'var(--bg3)', color: 'var(--text)' }}>
                    {getIcon(conta.tipo)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{conta.nome}</div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>{getTipoLabel(conta.tipo)}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingConta(conta)
                      setShowModal(true)
                    }}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--text3)', background: 'transparent' }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--bg3)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteConta(conta.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: 'var(--red)', background: 'transparent' }}
                    onMouseEnter={(e) => e.target.style.background = 'var(--red-bg)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="text-lg font-semibold font-mono" style={{
                color: conta.saldo >= 0 ? 'var(--green)' : 'var(--red)'
              }}>
                {fmt(conta.saldo)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ContaModal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          setEditingConta(null)
        }}
        conta={editingConta}
      />
    </div>
  )
}