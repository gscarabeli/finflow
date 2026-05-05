import React, { useState } from 'react'
import { Plus, Trash2, Edit2, CheckCircle2, Circle, AlertCircle, Loader } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { CATEGORIAS } from '../../data/mockData.js'
import { fmt, fmtDate } from '../../hooks/useUtils.js'
import { Card, CardTitle, Badge, Modal, Input, Select, Button, StatCard } from '../shared/UI.jsx'

const EMPTY_FORM = {
  nome: '', valor: '', vencimento: '', categoria: 'Outros', pago: false,
}

function fromItem(item) {
  return { nome: item.nome, valor: item.valor.toString(), vencimento: item.vencimento, categoria: item.categoria, pago: item.pago }
}

function PagamentoModal({ open, onClose, editing }) {
  const { addPagamento, updatePagamento } = useStore()
  const isEdit = !!editing
  const [form, setForm] = useState(editing ? fromItem(editing) : { ...EMPTY_FORM })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (open) {
      setForm(editing ? fromItem(editing) : { ...EMPTY_FORM })
      setError(null)
    }
  }, [open, editing])

  const submit = async () => {
    if (!form.nome || !form.valor) return
    setLoading(true); setError(null)
    try {
      const payload = { ...form, valor: parseFloat(form.valor) }
      if (isEdit) {
        await updatePagamento(editing.id, payload)
      } else {
        await addPagamento(payload)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Conta' : 'Nova Conta a Pagar'}>
      <Input label="Descrição" placeholder="Ex: Aluguel, Energia, Netflix..." value={form.nome} onChange={e => set('nome', e.target.value)} />
      <Input label="Valor (R$)" type="number" placeholder="0,00" step="0.01" value={form.valor} onChange={e => set('valor', e.target.value)} />
      <Input label="Vencimento" type="date" value={form.vencimento} onChange={e => set('vencimento', e.target.value)} />
      <Select label="Categoria" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
        {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
      </Select>
      {isEdit && (
        <label className="flex items-center gap-2.5 cursor-pointer mt-1 mb-1" style={{ color: 'var(--text2)', fontSize: 13 }}>
          <div
            onClick={() => set('pago', !form.pago)}
            style={{
              width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer',
              background: form.pago ? 'var(--green)' : 'var(--border2)', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 2, left: form.pago ? 18 : 2,
              width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
          Marcado como pago
        </label>
      )}
      {error && (
        <div className="text-xs p-2.5 rounded-lg mb-1" style={{ background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid var(--red)' }}>
          {error}
        </div>
      )}
      <div className="flex gap-2 mt-2">
        <Button onClick={submit} disabled={loading || !form.nome || !form.valor}>
          {loading ? <><Loader size={13} className="inline animate-spin mr-1.5" />{isEdit ? 'Salvando...' : 'Adicionando...'}</> : (isEdit ? 'Salvar' : 'Adicionar')}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
      </div>
    </Modal>
  )
}

export default function APagar() {
  const { getActiveData, updatePagamento, deletePagamento, viewMode, addTransaction } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing]     = useState(null)

  const pd = getActiveData()
  const isCasal = viewMode === 'casal'
  const pagamentos = (pd.pagamentos ?? []).slice().sort((a, b) => (a.vencimento || '').localeCompare(b.vencimento || ''))

  const today = new Date().toISOString().split('T')[0]

  const pendentes  = pagamentos.filter(p => !p.pago)
  const pagos      = pagamentos.filter(p => p.pago)
  const totalPend  = pendentes.reduce((s, p) => s + p.valor, 0)
  const totalPago  = pagos.reduce((s, p) => s + p.valor, 0)
  const vencidos   = pendentes.filter(p => p.vencimento && p.vencimento < today).length

  function statusOf(item) {
    if (item.pago)                               return 'pago'
    if (!item.vencimento)                        return 'pendente'
    if (item.vencimento < today)                 return 'vencido'
    if (item.vencimento === today)               return 'hoje'
    return 'pendente'
  }

  const STATUS_STYLE = {
    pago:     { color: 'var(--green)',  bg: 'var(--green-bg)',  label: 'Pago' },
    vencido:  { color: 'var(--red)',    bg: 'var(--red-bg)',    label: 'Vencido' },
    hoje:     { color: '#f59e0b',       bg: '#2b1f0a',          label: 'Vence hoje' },
    pendente: { color: 'var(--text3)',  bg: 'var(--bg3)',       label: 'Pendente' },
  }

  async function togglePago(item) {
    const markingAsPaid = !item.pago
    try {
      await updatePagamento(item.id, { ...item, pago: !item.pago })
      if (markingAsPaid) {
        try {
          await addTransaction({
            desc: item.nome,
            valor: item.valor,
            tipo: 'saida',
            cat: item.categoria,
            data: new Date().toISOString().split('T')[0],
            agendada: false,
          })
        } catch {}
      }
    } catch {}
  }

  function openEdit(item) { setEditing(item); setShowModal(true) }
  function openAdd()      { setEditing(null);  setShowModal(true) }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Contas a Pagar</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Controle suas dívidas e compromissos</p>
        </div>
        {!isCasal && (
          <Button onClick={openAdd}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Nova Conta</span>
          </Button>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <StatCard label="A Pagar" value={fmt(totalPend)} sub={`${pendentes.length} pendente${pendentes.length !== 1 ? 's' : ''}`} color="var(--red)" dot="var(--red)" />
        <StatCard label="Pago" value={fmt(totalPago)} sub={`${pagos.length} liquidado${pagos.length !== 1 ? 's' : ''}`} color="var(--green)" dot="var(--green)" />
        <StatCard label="Vencidos" value={String(vencidos)} sub={vencidos > 0 ? 'Requerem atenção' : 'Tudo em dia'} color={vencidos > 0 ? 'var(--red)' : 'var(--green)'} dot={vencidos > 0 ? 'var(--red)' : 'var(--green)'} />
      </div>

      {pagamentos.length === 0 ? (
        <Card>
          <div className="py-10 text-center" style={{ color: 'var(--text3)' }}>
            <CheckCircle2 size={40} className="mx-auto mb-3" style={{ opacity: 0.3 }} />
            <p className="text-sm">Nenhuma conta cadastrada.</p>
            {!isCasal && <p className="text-xs mt-1">Clique em "Nova Conta" para começar.</p>}
          </div>
        </Card>
      ) : (
        <Card>
          <CardTitle right={<Badge color="blue">{pagamentos.length}</Badge>}>Lista de Contas</CardTitle>
          <div className="flex flex-col gap-0.5">
            {pagamentos.map(item => {
              const st = STATUS_STYLE[statusOf(item)]
              return (
                <div key={item.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl group transition-colors"
                  style={{ opacity: item.pago ? 0.55 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  {/* Toggle pago */}
                  {!isCasal && (
                    <button
                      onClick={() => togglePago(item)}
                      title={item.pago ? 'Marcar como não pago' : 'Marcar como pago'}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: item.pago ? 'var(--green)' : 'var(--border2)', flexShrink: 0 }}>
                      {item.pago ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </button>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: 'var(--text)', textDecoration: item.pago ? 'line-through' : 'none' }}>
                      {item.nome}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>{item.categoria}{item.vencimento ? ` · Vence ${fmtDate(item.vencimento)}` : ''}</div>
                  </div>

                  <div className="text-sm font-semibold" style={{ color: item.pago ? 'var(--green)' : 'var(--text)' }}>
                    {fmt(item.valor)}
                  </div>

                  <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                    {statusOf(item) === 'vencido' && <AlertCircle size={10} />}
                    {st.label}
                  </span>

                  {!isCasal && (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(item)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-0 bg-transparent cursor-pointer p-1 rounded"
                        style={{ color: 'var(--text3)' }}><Edit2 size={13} /></button>
                      <button onClick={() => deletePagamento(item.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-0 bg-transparent cursor-pointer p-1 rounded"
                        style={{ color: 'var(--text3)' }}><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <PagamentoModal open={showModal} onClose={() => { setShowModal(false); setEditing(null) }} editing={editing} />
    </div>
  )
}
