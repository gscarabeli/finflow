import React, { useState, useMemo } from 'react'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useStore } from '../../store/useStore.js'
import { fmt } from '../../hooks/useUtils.js'
import { Card, CardTitle, Modal, Input, Select, Button } from '../shared/UI.jsx'
import { BANKS, TIPO_LABELS, BankLogo } from '../shared/BankLogo.jsx'

const EMPTY_FORM = { nome: '', banco: null, tipo: 'conta-corrente', saldo: '', limite: '', dia_fechamento: '' }

function fromConta(c) {
  return {
    nome: c.nome, banco: c.banco || null, tipo: c.tipo, saldo: String(c.saldo),
    limite: c.limite ? String(c.limite) : '',
    dia_fechamento: c.dia_fechamento ? String(c.dia_fechamento) : '',
  }
}

function ContaModal({ open, onClose, conta }) {
  const { addConta, updateConta } = useStore()
  const [form, setForm] = useState(EMPTY_FORM)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (open) setForm(conta ? fromConta(conta) : { ...EMPTY_FORM })
  }, [open, conta])

  function selectBank(bank) {
    set('banco', bank.id)
    if (!form.nome) set('nome', bank.name)
  }

  function clearBank() { set('banco', null) }

  const submit = () => {
    if (!form.nome || form.saldo === '') return
    const data = {
      ...form,
      saldo: parseFloat(form.saldo),
      limite: form.limite ? parseFloat(form.limite) : null,
      dia_fechamento: form.dia_fechamento ? parseInt(form.dia_fechamento) : null,
    }
    if (conta) updateConta(conta.id, data)
    else addConta(data)
    onClose()
  }

  const hasCard = form.tipo === 'cartao-credito' || form.tipo === 'conta-corrente-cartao'

  return (
    <Modal open={open} onClose={onClose} title={conta ? 'Editar Conta' : 'Nova Conta'}>
      {/* Bank picker */}
      <div className="mb-3">
        <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text3)' }}>
          Banco <span style={{ fontWeight: 400 }}>(opcional)</span>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {BANKS.map(bank => {
            const selected = form.banco === bank.id
            return (
              <button
                key={bank.id}
                type="button"
                onClick={() => selected ? clearBank() : selectBank(bank)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                  background: selected ? bank.color + '18' : 'var(--bg3)',
                  border: selected ? `1.5px solid ${bank.color}` : '1.5px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'var(--bg4)' }}
                onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'var(--bg3)' }}
              >
                <BankLogo banco={bank.id} size={30} />
                <span style={{ fontSize: 10, color: selected ? bank.color : 'var(--text3)', fontWeight: selected ? 700 : 400, lineHeight: 1.1, textAlign: 'center' }}>
                  {bank.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <Input
        label="Nome da Conta"
        placeholder="Ex: Santander Corrente, PicPay..."
        value={form.nome}
        onChange={e => set('nome', e.target.value)}
      />
      <Select label="Tipo" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
        {Object.entries(TIPO_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </Select>
      <Input label="Saldo Atual (R$)" type="number" placeholder="0,00" step="0.01" value={form.saldo} onChange={e => set('saldo', e.target.value)} />
      {hasCard && (
        <>
          <Input label="Limite (R$)" type="number" placeholder="0,00" step="0.01" value={form.limite} onChange={e => set('limite', e.target.value)} />
          <Input label="Dia de Fechamento" type="number" placeholder="Ex: 10" min={1} max={28} value={form.dia_fechamento} onChange={e => set('dia_fechamento', e.target.value)} />
        </>
      )}

      <div className="flex gap-2 mt-2">
        <Button onClick={submit} disabled={!form.nome || form.saldo === ''}>{conta ? 'Salvar' : 'Criar'}</Button>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </Modal>
  )
}

function SortableConta({ conta, isCasal, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: conta.id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...(!isCasal ? { ...attributes, ...listeners } : {})}
    >
      <Card style={{ cursor: isCasal ? 'default' : (isDragging ? 'grabbing' : 'grab'), height: '100%' }}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <BankLogo banco={conta.banco} tipo={conta.tipo} size={40} />
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{conta.nome}</div>
              <div className="text-xs" style={{ color: 'var(--text3)' }}>
                {TIPO_LABELS[conta.tipo] || conta.tipo}
              </div>
            </div>
          </div>
          {!isCasal && (
            <div className="flex gap-1" onPointerDown={e => e.stopPropagation()}>
              <button
                onClick={e => { e.stopPropagation(); onEdit() }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--text3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--red)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--red-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
        <div className="text-lg font-semibold font-mono" style={{
          color: conta.saldo >= 0 ? 'var(--green)' : 'var(--red)'
        }}>
          {fmt(conta.saldo)}
        </div>
      </Card>
    </div>
  )
}

export default function Contas() {
  const { getActiveData, deleteConta, viewMode } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editingConta, setEditingConta] = useState(null)
  const [contaOrder, setContaOrder] = useState([])
  const pd = getActiveData()
  const isCasal = viewMode === 'casal'

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const orderedContas = useMemo(() => {
    const ids = pd.contas.map(c => c.id)
    const filtered = contaOrder.filter(id => ids.includes(id))
    const newIds = ids.filter(id => !filtered.includes(id))
    return [...filtered, ...newIds].map(id => pd.contas.find(c => c.id === id))
  }, [pd.contas, contaOrder])

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    setContaOrder(prev => {
      const ids = orderedContas.map(c => c.id)
      const current = prev.length ? prev.filter(id => ids.includes(id)) : ids
      const newIds = ids.filter(id => !current.includes(id))
      const merged = [...current, ...newIds]
      return arrayMove(merged, merged.indexOf(active.id), merged.indexOf(over.id))
    })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Contas e Cartões · {isCasal ? 'Visão Consolidada' : pd.nome}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Gerencie seus saldos e contas</p>
        </div>
        {!isCasal && (
          <Button onClick={() => setShowModal(true)}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Nova Conta</span>
          </Button>
        )}
      </div>

      {pd.contas.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <BankLogo size={48} />
            <div className="text-sm font-semibold mb-2 mt-4" style={{ color: 'var(--text)' }}>Nenhuma conta cadastrada</div>
            <div className="text-xs mb-4" style={{ color: 'var(--text3)' }}>
              {isCasal ? 'Visualize as contas dos perfis individuais' : 'Adicione suas contas e cartões para acompanhar os saldos'}
            </div>
            {!isCasal && <Button onClick={() => setShowModal(true)}>Criar Primeira Conta</Button>}
          </div>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedContas.map(c => c.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orderedContas.map(conta => (
                <SortableConta
                  key={conta.id}
                  conta={conta}
                  isCasal={isCasal}
                  onEdit={() => { setEditingConta(conta); setShowModal(true) }}
                  onDelete={() => deleteConta(conta.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ContaModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditingConta(null) }}
        conta={editingConta}
      />
    </div>
  )
}
