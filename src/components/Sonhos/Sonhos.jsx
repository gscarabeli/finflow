import React, { useState } from 'react'
import { Plus, Trash2, Edit3, Target, TrendingUp, Calendar, Star } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { fmt, fmtShort, monthsUntil } from '../../hooks/useUtils.js'
import { Card, CardTitle, Badge, ProgressBar, Modal, Input, Button } from '../shared/UI.jsx'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const EMOJI_OPTIONS = ['🏠', '💍', '✈️', '🚗', '🎊', '🎓', '💻', '🏖️', '🛥️', '🏋️', '📷', '🎸', '🌎', '🏔️', '🍕', '🐾', '👶', '🏗️', '💰', '🎯']
const COLOR_OPTIONS = ['#3b82f6', '#ec4899', '#14b8a6', '#a78bfa', '#f59e0b', '#22c55e', '#ef4444', '#06b6d4', '#f97316', '#8b5cf6']

const emptyForm = () => ({
  nome: '',
  emoji: '🎯',
  meta: '',
  acumulado: '',
  prazo: '',
  cor: '#3b82f6',
  notas: '',
  prioridade: 1,
})

function SonhoModal({ open, onClose, sonho }) {
  const { addSonho, updateSonho } = useStore()
  const [form, setForm] = useState(sonho ? { ...sonho, meta: sonho.meta.toString(), acumulado: sonho.acumulado.toString() } : emptyForm())
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const isEdit = !!sonho

  const submit = () => {
    if (!form.nome || !form.meta) return
    const data = { ...form, meta: parseFloat(form.meta), acumulado: parseFloat(form.acumulado || 0), prioridade: parseInt(form.prioridade) }
    if (isEdit) updateSonho(sonho.id, data)
    else addSonho(data)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Sonho' : 'Novo Sonho'}>
      {/* Emoji picker */}
      <div className="mb-3">
        <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text3)' }}>Ícone</label>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {EMOJI_OPTIONS.map((e) => (
            <button key={e} onClick={() => set('emoji', e)}
              className="w-8 h-8 rounded-lg text-base cursor-pointer transition-all border-0"
              style={{ background: form.emoji === e ? 'var(--blue-bg)' : 'var(--bg3)', border: form.emoji === e ? '1px solid var(--blue)' : '1px solid transparent' }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      <Input label="Nome do Sonho" placeholder="Ex: Casa Própria" value={form.nome} onChange={(e) => set('nome', e.target.value)} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input label="Meta (R$)" type="number" placeholder="600000" value={form.meta} onChange={(e) => set('meta', e.target.value)} />
        <Input label="Acumulado (R$)" type="number" placeholder="0" value={form.acumulado} onChange={(e) => set('acumulado', e.target.value)} />
      </div>

      <Input label="Prazo" type="date" value={form.prazo} onChange={(e) => set('prazo', e.target.value)} />

      {/* Color picker */}
      <div className="mb-3">
        <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text3)' }}>Cor</label>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
          {COLOR_OPTIONS.map((c) => (
            <button key={c} onClick={() => set('cor', c)}
              className="w-6 h-6 rounded-full cursor-pointer border-2 transition-all"
              style={{ background: c, borderColor: form.cor === c ? 'var(--text)' : 'transparent' }} />
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text3)' }}>Notas</label>
        <textarea
          value={form.notas}
          onChange={(e) => set('notas', e.target.value)}
          placeholder="Detalhes, anotações, pesquisas..."
          rows={2}
          className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none resize-none"
          style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}
        />
      </div>

      <div className="flex gap-2 mt-1">
        <Button onClick={submit}>{isEdit ? 'Salvar' : 'Criar Sonho'}</Button>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </Modal>
  )
}

function SonhoCard({ sonho, onEdit }) {
  const { deleteSonho, updateSonho } = useStore()
  const pct = Math.min(100, Math.round((sonho.acumulado / sonho.meta) * 100))
  const months = monthsUntil(sonho.prazo)
  const faltam = Math.max(0, sonho.meta - sonho.acumulado)
  const porMes = months > 0 ? faltam / months : faltam

  const [editingAc, setEditingAc] = useState(false)
  const [acVal, setAcVal] = useState(sonho.acumulado.toString())

  const saveAc = () => {
    updateSonho(sonho.id, { acumulado: parseFloat(acVal) || 0 })
    setEditingAc(false)
  }

  const prazoLabel = months > 0 ? `${months} meses restantes` : 'Prazo atingido!'
  const statusColor = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--amber)' : 'var(--text3)'

  return (
    <div className="rounded-2xl border overflow-hidden transition-all duration-200"
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      {/* Color header strip */}
      <div className="h-1.5" style={{ background: sonho.cor }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0"
              style={{ background: sonho.cor + '20' }}>
              {sonho.emoji}
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: 'var(--text)' }}>{sonho.nome}</div>
              <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: statusColor }}>
                <Calendar size={10} />
                {prazoLabel}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => onEdit(sonho)}
              className="p-1.5 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
              style={{ color: 'var(--text3)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
              <Edit3 size={13} />
            </button>
            <button onClick={() => deleteSonho(sonho.id)}
              className="p-1.5 rounded-lg border-0 bg-transparent cursor-pointer transition-colors"
              style={{ color: 'var(--text3)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text3)'}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text3)' }}>
            <span style={{ color: sonho.cor, fontWeight: 600 }}>{pct}% concluído</span>
            <span>Meta: {fmt(sonho.meta)}</span>
          </div>
          <ProgressBar pct={pct} color={sonho.cor} height={6} />
        </div>

        {/* Values */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-xl p-3" style={{ background: 'var(--bg3)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text3)' }}>Acumulado</div>
            {editingAc ? (
              <div className="flex gap-1">
                <input
                  value={acVal}
                  onChange={(e) => setAcVal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveAc()}
                  className="flex-1 text-xs rounded px-1.5 py-1 outline-none border-0 font-mono"
                  style={{ background: 'var(--bg4)', color: 'var(--text)', width: '100%' }}
                  autoFocus
                />
                <button onClick={saveAc} className="text-xs border-0 bg-transparent cursor-pointer" style={{ color: 'var(--green)' }}>✓</button>
              </div>
            ) : (
              <div className="flex items-center gap-1 group">
                <span className="text-sm font-semibold font-mono" style={{ color: sonho.cor }}>{fmt(sonho.acumulado)}</span>
                <button onClick={() => setEditingAc(true)}
                  className="opacity-0 group-hover:opacity-100 border-0 bg-transparent cursor-pointer p-0.5"
                  style={{ color: 'var(--text3)' }}>
                  <Edit3 size={10} />
                </button>
              </div>
            )}
          </div>
          <div className="rounded-xl p-3" style={{ background: 'var(--bg3)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--text3)' }}>Faltam</div>
            <div className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{fmt(faltam)}</div>
          </div>
        </div>

        {/* Monthly goal */}
        {months > 0 && porMes > 0 && (
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ background: sonho.cor + '15', border: `1px solid ${sonho.cor}30` }}>
            <TrendingUp size={13} style={{ color: sonho.cor, flexShrink: 0 }} />
            <span className="text-xs" style={{ color: 'var(--text2)' }}>
              Guardar <span className="font-semibold" style={{ color: sonho.cor }}>{fmt(porMes)}/mês</span> para chegar no prazo
            </span>
          </div>
        )}

        {pct >= 100 && (
          <div className="rounded-xl px-3 py-2.5 flex items-center gap-2"
            style={{ background: 'var(--green-bg)', border: '1px solid var(--green)' }}>
            <Star size={13} style={{ color: 'var(--green)', flexShrink: 0 }} />
            <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>Meta atingida! 🎉</span>
          </div>
        )}

        {sonho.notas && (
          <div className="mt-3 text-xs" style={{ color: 'var(--text3)' }}>
            <div className="font-medium mb-0.5" style={{ color: 'var(--text3)' }}>📝 Notas</div>
            {sonho.notas}
          </div>
        )}
      </div>
    </div>
  )
}

function SortableItem({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  )
}

export default function Sonhos() {
  const { sonhos, updateSonho } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editingSonho, setEditingSonho] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const totalMeta = sonhos.reduce((s, x) => s + x.meta, 0)
  const totalAcumulado = sonhos.reduce((s, x) => s + x.acumulado, 0)
  const totalPct = totalMeta > 0 ? Math.round((totalAcumulado / totalMeta) * 100) : 0
  const concluidos = sonhos.filter((s) => s.acumulado >= s.meta).length

  const openEdit = (sonho) => {
    setEditingSonho(sonho)
    setShowModal(true)
  }
  const closeModal = () => {
    setShowModal(false)
    setEditingSonho(null)
  }

  const handleDragEnd = (event) => {
    const { active, over } = event

    if (active.id !== over.id) {
      const oldIndex = sonhos.findIndex((item) => item.id === active.id)
      const newIndex = sonhos.findIndex((item) => item.id === over.id)

      const reorderedSonhos = arrayMove(sonhos, oldIndex, newIndex)

      // Update priorities based on new order
      reorderedSonhos.forEach((sonho, index) => {
        updateSonho(sonho.id, { prioridade: index + 1 })
      })
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Sonhos & Metas do Casal</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Planeje e acompanhe seus objetivos financeiros juntos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <span className="flex items-center gap-1.5"><Plus size={14} /> Novo Sonho</span>
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
        <div className="rounded-2xl border p-5 md:col-span-2" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--text3)' }}>Progresso Geral dos Sonhos</div>
          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text3)' }}>
            <span><span className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{totalPct}%</span> concluído</span>
            <span>{fmt(totalAcumulado)} de {fmt(totalMeta)}</span>
          </div>
          <ProgressBar pct={totalPct} color="var(--blue)" height={10} />
          <div className="text-xs mt-2" style={{ color: 'var(--text3)' }}>Faltam {fmt(Math.max(0, totalMeta - totalAcumulado))} para realizar todos os sonhos</div>
        </div>
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--text3)' }}>Total a Conquistar</div>
          <div className="text-2xl font-semibold" style={{ color: 'var(--blue)' }}>{fmt(totalMeta)}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{sonhos.length} sonhos planejados</div>
        </div>
        <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--text3)' }}>Já Conquistados</div>
          <div className="text-2xl font-semibold" style={{ color: 'var(--green)' }}>{concluidos}</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>de {sonhos.length} sonhos</div>
        </div>
      </div>

      {/* Sonho cards grid */}
      {sonhos.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🌟</div>
            <div className="font-semibold mb-2" style={{ color: 'var(--text)' }}>Nenhum sonho cadastrado ainda</div>
            <div className="text-sm mb-5" style={{ color: 'var(--text3)' }}>Adicione seus objetivos financeiros e acompanhe o progresso</div>
            <Button onClick={() => setShowModal(true)}>
              <span className="flex items-center gap-1.5"><Plus size={14} /> Criar primeiro sonho</span>
            </Button>
          </div>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={sonhos.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {sonhos
                .sort((a, b) => a.prioridade - b.prioridade)
                .map((s) => (
                  <SortableItem key={s.id} id={s.id}>
                    <SonhoCard sonho={s} onEdit={openEdit} />
                  </SortableItem>
                ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Timeline view */}
      {sonhos.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardTitle>Linha do Tempo dos Sonhos</CardTitle>
            <div className="flex flex-col gap-3">
              {[...sonhos]
                .filter((s) => s.prazo)
                .sort((a, b) => new Date(a.prazo) - new Date(b.prazo))
                .map((s) => {
                  const pct = Math.min(100, Math.round((s.acumulado / s.meta) * 100))
                  const months = monthsUntil(s.prazo)
                  return (
                    <div key={s.id} className="flex items-center gap-4 py-3"
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <div className="text-xl w-8 text-center">{s.emoji}</div>
                      <div className="w-32 flex-shrink-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{s.nome}</div>
                        <div className="text-xs" style={{ color: 'var(--text3)' }}>
                          {months > 0 ? `${months} meses` : 'Prazo!'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <ProgressBar pct={pct} color={s.cor} height={5} />
                      </div>
                      <div className="text-xs font-semibold font-mono w-12 text-right" style={{ color: s.cor }}>{pct}%</div>
                      <div className="text-xs font-mono w-28 text-right" style={{ color: 'var(--text3)' }}>
                        {fmt(s.acumulado)} / {fmtShort(s.meta)}
                      </div>
                    </div>
                  )
                })}
            </div>
          </Card>
        </div>
      )}

      <SonhoModal open={showModal} onClose={closeModal} sonho={editingSonho} />
    </div>
  )
}
