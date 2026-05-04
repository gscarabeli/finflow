import React, { useState, useMemo } from 'react'
import { CreditCard, Plus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useStore } from '../../store/useStore.js'
import { fmt, fmtDate } from '../../hooks/useUtils.js'
import { Card, CardTitle, StatCard, Badge, Button } from '../shared/UI.jsx'
import { BankLogo } from '../shared/BankLogo.jsx'
import { CAT_COLORS, CAT_ICONS } from '../../data/mockData.js'
import AddTxModal from '../shared/AddTxModal.jsx'

const CARD_TYPES = ['cartao-credito', 'conta-corrente-cartao']

function getCycleRange(diaFechamento) {
  const today = new Date()
  const y = today.getFullYear()
  const m = today.getMonth()
  const d = today.getDate()
  const fd = diaFechamento || 28

  let start, end
  if (d <= fd) {
    start = new Date(y, m - 1, fd + 1)
    end   = new Date(y, m, fd)
  } else {
    start = new Date(y, m, fd + 1)
    end   = new Date(y, m + 1, fd)
  }

  const toStr = (dt) => dt.toISOString().split('T')[0]
  const label = `${start.toLocaleString('pt-BR', { day: 'numeric', month: 'short' })} – ${end.toLocaleString('pt-BR', { day: 'numeric', month: 'short' })}`
  return { start: toStr(start), end: toStr(end), label }
}

function getMonthlyHistory(transactions, cartaoId) {
  const today = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const prefix = d.toISOString().slice(0, 7)
    const name = d.toLocaleString('pt-BR', { month: 'short' })
    const value = transactions
      .filter(t => t.cartao_id === cartaoId && t.tipo === 'saida' && !t.agendada && t.data.startsWith(prefix))
      .reduce((s, t) => s + t.valor, 0)
    months.push({ name, value })
  }
  return months
}

export default function Credito() {
  const { getActiveData, viewMode } = useStore()
  const [selectedId, setSelectedId] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const pd = getActiveData()
  const isCasal = viewMode === 'casal'

  const cartoes = pd.contas.filter(c => CARD_TYPES.includes(c.tipo))
  const effectiveId = selectedId && cartoes.find(c => c.id === selectedId)
    ? selectedId
    : (cartoes[0]?.id ?? null)
  const selectedCard = cartoes.find(c => c.id === effectiveId) ?? null

  const { cycle, cycleTxs, nextTxs, monthlyHistory, totalCurrent, totalNext, usagePct } = useMemo(() => {
    if (!selectedCard) return { cycle: null, cycleTxs: [], nextTxs: [], monthlyHistory: [], totalCurrent: 0, totalNext: 0, usagePct: null }

    const cycle = getCycleRange(selectedCard.dia_fechamento)
    const allTxs = pd.transacoes

    const cycleTxs = allTxs.filter(t =>
      t.cartao_id === selectedCard.id &&
      t.tipo === 'saida' &&
      !t.agendada &&
      t.data >= cycle.start &&
      t.data <= cycle.end
    ).sort((a, b) => b.data.localeCompare(a.data))

    const nextTxs = allTxs.filter(t =>
      t.cartao_id === selectedCard.id &&
      t.tipo === 'saida' &&
      t.agendada &&
      t.data > cycle.end
    ).sort((a, b) => a.data.localeCompare(b.data))

    const totalCurrent = cycleTxs.reduce((s, t) => s + t.valor, 0)
    const totalNext    = nextTxs.reduce((s, t) => s + t.valor, 0)
    const usagePct = selectedCard.limite
      ? Math.min(100, Math.round((totalCurrent / selectedCard.limite) * 100))
      : null

    const monthlyHistory = getMonthlyHistory(allTxs, selectedCard.id)

    return { cycle, cycleTxs, nextTxs, monthlyHistory, totalCurrent, totalNext, usagePct }
  }, [selectedCard, pd.transacoes])

  if (cartoes.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text)' }}>Crédito</h1>
        <p className="text-xs mb-6" style={{ color: 'var(--text3)' }}>Acompanhe faturas e gastos nos cartões</p>
        <Card>
          <div className="text-center py-14">
            <CreditCard size={40} className="mx-auto mb-3" style={{ color: 'var(--text3)', opacity: 0.35 }} />
            <div className="text-sm font-semibold mb-1.5" style={{ color: 'var(--text)' }}>Nenhum cartão de crédito cadastrado</div>
            <div className="text-xs" style={{ color: 'var(--text3)' }}>
              Adicione um cartão em Contas (tipo: Cartão de Crédito ou Corrente + Cartão) para começar
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Crédito</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Acompanhe faturas e gastos nos cartões</p>
        </div>
        {!isCasal && selectedCard && (
          <Button onClick={() => setShowModal(true)}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Lançamento</span>
          </Button>
        )}
      </div>

      {/* Card selector */}
      <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
        {cartoes.map(c => {
          const sel = effectiveId === c.id
          return (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 14, cursor: 'pointer',
                background: sel ? 'var(--blue-bg)' : 'var(--bg2)',
                border: sel ? '1.5px solid var(--blue)' : '1.5px solid var(--border)',
                color: 'var(--text)', whiteSpace: 'nowrap', transition: 'all 0.15s', flexShrink: 0,
              }}
            >
              <BankLogo banco={c.banco} tipo={c.tipo} size={28} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</div>
                {c.limite && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Limite: {fmt(c.limite)}</div>}
              </div>
            </button>
          )
        })}
      </div>

      {selectedCard && cycle && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <StatCard
              label="Fatura em Aberto"
              value={fmt(totalCurrent)}
              sub={`Ciclo: ${cycle.label}`}
              color="var(--red)" dot="var(--red)"
            />
            <StatCard
              label="Próxima Fatura"
              value={fmt(totalNext)}
              sub={`${nextTxs.length} agendamento${nextTxs.length !== 1 ? 's' : ''}`}
              color="var(--blue)" dot="var(--blue)"
            />
            {selectedCard.limite ? (
              <StatCard
                label="Limite Disponível"
                value={fmt(selectedCard.limite - totalCurrent)}
                sub={`${usagePct}% utilizado`}
                color={usagePct > 80 ? 'var(--red)' : 'var(--green)'}
                dot={usagePct > 80 ? 'var(--red)' : 'var(--green)'}
              />
            ) : (
              <StatCard
                label="Lançamentos"
                value={String(cycleTxs.length)}
                sub="no ciclo atual"
                color="var(--purple)" dot="var(--purple)"
              />
            )}
          </div>

          {/* Limit usage bar */}
          {usagePct !== null && (
            <div className="rounded-2xl border p-4 mb-4" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
              <div className="flex justify-between text-xs mb-2">
                <span style={{ color: 'var(--text3)' }}>Uso do Limite</span>
                <span style={{ color: usagePct > 80 ? 'var(--red)' : 'var(--text)', fontWeight: 600 }}>{usagePct}%</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${usagePct}%`, height: '100%', borderRadius: 3,
                  background: usagePct > 80 ? 'var(--red)' : usagePct > 60 ? '#f59e0b' : 'var(--green)',
                  transition: 'width 0.3s',
                }} />
              </div>
              <div className="flex justify-between text-xs mt-1.5" style={{ color: 'var(--text3)' }}>
                <span>{fmt(totalCurrent)} usado</span>
                <span>{fmt(selectedCard.limite)} limite</span>
              </div>
            </div>
          )}

          {/* Monthly history chart */}
          <Card style={{ marginBottom: 24 }}>
            <CardTitle>Histórico de Gastos (6 meses)</CardTitle>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyHistory} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-xl border px-3 py-2 text-xs"
                        style={{ background: 'var(--bg4)', borderColor: 'var(--border2)', color: 'var(--text)' }}>
                        <div className="font-semibold">{payload[0].payload.name}</div>
                        <div>{fmt(payload[0].value)}</div>
                      </div>
                    )
                  }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="var(--blue)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Current cycle transactions */}
          <Card style={{ marginBottom: nextTxs.length > 0 ? 16 : 0 }}>
            <CardTitle right={<Badge color="blue">{cycleTxs.length}</Badge>}>
              Lançamentos da Fatura em Aberto
            </CardTitle>
            {cycleTxs.length === 0 ? (
              <div className="py-8 text-center" style={{ color: 'var(--text3)' }}>
                <div className="text-sm mb-1">Nenhum lançamento neste ciclo.</div>
                <div className="text-xs">
                  {isCasal
                    ? 'Visualize as transações nos perfis individuais.'
                    : 'Clique em "+ Lançamento" para registrar um gasto neste cartão.'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5">
                {cycleTxs.map(tx => (
                  <div key={tx.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: (CAT_COLORS[tx.cat] || '#9aa0b8') + '22' }}>
                      {CAT_ICONS[tx.cat] || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{tx.desc}</div>
                      <div className="text-xs" style={{ color: 'var(--text3)' }}>{tx.cat}</div>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--red)' }}>-{fmt(tx.valor)}</div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>{fmtDate(tx.data)}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Next cycle scheduled */}
          {nextTxs.length > 0 && (
            <Card>
              <CardTitle right={<Badge color="blue">{nextTxs.length}</Badge>}>
                Próximos Lançamentos Agendados
              </CardTitle>
              <div className="flex flex-col gap-0.5">
                {nextTxs.map(tx => (
                  <div key={tx.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
                    style={{ opacity: 0.75 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: (CAT_COLORS[tx.cat] || '#9aa0b8') + '22' }}>
                      {CAT_ICONS[tx.cat] || '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{tx.desc}</div>
                      <div className="text-xs" style={{ color: 'var(--text3)' }}>{tx.cat}</div>
                    </div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--red)' }}>-{fmt(tx.valor)}</div>
                    <div className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--blue-bg)', color: 'var(--blue)', whiteSpace: 'nowrap' }}>
                      {fmtDate(tx.data)}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      <AddTxModal
        open={showModal}
        onClose={() => setShowModal(false)}
        initialCartaoId={effectiveId}
      />
    </div>
  )
}
