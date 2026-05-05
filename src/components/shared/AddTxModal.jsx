import React, { useState } from 'react'
import { Loader } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { CATEGORIAS } from '../../data/mockData.js'
import { Modal, Input, Select, Button } from './UI.jsx'

const CARD_TYPES = ['cartao-credito', 'conta-corrente-cartao']

const EMPTY_TX_FORM = {
  desc: '', valor: '', tipo: 'saida', cat: 'Alimentação',
  data: new Date().toISOString().split('T')[0], agendada: false, cartao_id: null,
}

function fromEditingTx(tx) {
  return {
    desc: tx.desc, valor: tx.valor.toString(), tipo: tx.tipo,
    cat: tx.cat, data: tx.data, agendada: !!tx.agendada, cartao_id: tx.cartao_id || null,
  }
}

export default function AddTxModal({ open, onClose, editingTx, initialCartaoId }) {
  const { addTransaction, updateTransaction, getActiveData } = useStore()
  const isEdit = !!editingTx
  const [form, setForm] = useState(editingTx ? fromEditingTx(editingTx) : { ...EMPTY_TX_FORM })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const cartoes = (getActiveData()?.contas ?? []).filter(c => CARD_TYPES.includes(c.tipo))

  React.useEffect(() => {
    if (open) {
      setForm(editingTx
        ? fromEditingTx(editingTx)
        : { ...EMPTY_TX_FORM, data: new Date().toISOString().split('T')[0], cartao_id: initialCartaoId ?? null }
      )
      setError(null)
    }
  }, [open, editingTx, initialCartaoId])

  const submit = async () => {
    if (!form.desc || !form.valor) return
    setLoading(true); setError(null)
    try {
      const tx = { ...form, valor: parseFloat(form.valor) }
      if (isEdit) await updateTransaction(editingTx.id, tx)
      else        await addTransaction(tx)
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]
  const isAgendadaFutura = form.agendada && form.data > today

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Transação' : 'Nova Transação'}>
      <Input label="Descrição" placeholder="Ex: Supermercado" value={form.desc} onChange={e => set('desc', e.target.value)} />
      <Input label="Valor (R$)" type="number" placeholder="0,00" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} />
      <Input label="Data" type="date" value={form.data} onChange={e => set('data', e.target.value)} />
      <Select label="Tipo" value={form.tipo} onChange={e => { set('tipo', e.target.value); if (e.target.value === 'entrada') set('cartao_id', null) }}>
        <option value="saida">Saída</option>
        <option value="entrada">Entrada</option>
      </Select>
      {form.tipo === 'saida' && cartoes.length > 0 && (
        <Select label="Cartão de Crédito (opcional)" value={form.cartao_id || ''} onChange={e => set('cartao_id', e.target.value || null)}>
          <option value="">Sem cartão</option>
          {cartoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </Select>
      )}
      <Select label="Categoria" value={form.cat} onChange={e => set('cat', e.target.value)}>
        {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
      </Select>
      {!isEdit && (
        <label className="flex items-center gap-2.5 cursor-pointer mt-1 mb-1" style={{ color: 'var(--text2)', fontSize: 13 }}>
          <div
            onClick={() => set('agendada', !form.agendada)}
            style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
              background: form.agendada ? 'var(--blue)' : 'var(--border2)', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: form.agendada ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
          Agendar (não débita até a data chegar)
        </label>
      )}
      {isAgendadaFutura && (
        <div className="text-xs p-2 rounded-lg mb-1" style={{ background: 'var(--blue-bg)', color: 'var(--blue)' }}>
          Esta transação ficará pendente e será debitada automaticamente em {form.data}.
        </div>
      )}
      {error && (
        <div className="text-xs p-2.5 rounded-lg mb-1" style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red)' }}>
          {error}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <Button onClick={submit} disabled={loading || !form.desc || !form.valor}>
          {loading
            ? <><Loader size={13} className="inline animate-spin mr-1.5" />{isEdit ? 'Salvando...' : 'Adicionando...'}</>
            : (isEdit ? 'Salvar' : 'Adicionar')}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
      </div>
    </Modal>
  )
}
