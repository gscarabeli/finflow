import React, { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Edit2 } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { fmt } from '../../hooks/useUtils.js'
import { Card, CardTitle, StatCard, Badge, ProgressBar, Modal, Input, Button } from '../shared/UI.jsx'

const ASSET_CONFIG = [
  { key: 'cdi', label: 'CDB / CDI', color: '#3b82f6', desc: 'Renda fixa' },
  { key: 'fundos', label: 'Fundos', color: '#a78bfa', desc: 'Fundos de inv.' },
  { key: 'previdencia', label: 'Previdência', color: '#22c55e', desc: 'PGBL / VGBL' },
  { key: 'acoes', label: 'Ações', color: '#f59e0b', desc: 'Renda variável' },
]

function EditMetaModal({ open, onClose, currentMeta, onSave }) {
  const [meta, setMeta] = useState(currentMeta.toString())

  const submit = () => {
    const newMeta = parseFloat(meta)
    if (isNaN(newMeta) || newMeta < 0) return
    onSave(newMeta)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar Meta de Reserva">
      <Input
        label="Meta de Reserva (R$)"
        type="number"
        placeholder="Ex: 10000"
        value={meta}
        onChange={(e) => setMeta(e.target.value)}
      />
      <div className="flex gap-2 mt-2">
        <Button onClick={submit}>Salvar</Button>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
      </div>
    </Modal>
  )
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border px-3 py-2 text-xs" style={{ background: 'var(--bg4)', borderColor: 'var(--border2)', color: 'var(--text)' }}>
      <div className="font-semibold">{payload[0].name}</div>
      <div>{fmt(payload[0].value)}</div>
    </div>
  )
}

export default function Investimentos() {
  const { getActiveData, updateInvestimentos, profile } = useStore()
  const [showMetaModal, setShowMetaModal] = useState(false)
  const pd = getActiveData()
  const inv = pd.investimentos

  const totalInv = ASSET_CONFIG.reduce((s, a) => s + (inv[a.key] || 0), 0)
  const patrimônioTotal = totalInv + inv.reserva.atual
  const reservaPct = Math.round((inv.reserva.atual / inv.reserva.meta) * 100)

  const pieData = ASSET_CONFIG.map((a) => ({ name: a.label, value: inv[a.key] || 0, color: a.color }))

  const reservaColor = reservaPct >= 80 ? 'var(--green)' : reservaPct >= 50 ? 'var(--amber)' : 'var(--red)'

  const handleUpdateMeta = (newMeta) => {
    updateInvestimentos({ reserva: { ...inv.reserva, meta: newMeta } })
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
          Investimentos · {profile === 'casal' ? 'Visão Consolidada' : pd.nome}
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Patrimônio e metas de investimento</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-5">
        <StatCard label="Patrimônio Total" value={fmt(patrimônioTotal)} sub="Reserva + investimentos" color="var(--purple)" dot="var(--purple)" />
        <StatCard label="Carteira Investida" value={fmt(totalInv)} sub="Excluindo reserva" color="var(--blue)" dot="var(--blue)" />
        <StatCard label="Reserva de Emergência" value={fmt(inv.reserva.atual)} sub={`${reservaPct}% da meta atingida`} color={reservaColor} dot={reservaColor} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Reserva Card */}
        <Card>
          <CardTitle right={
            <div className="flex items-center gap-2">
              <Badge color={reservaPct >= 80 ? 'green' : reservaPct >= 50 ? 'amber' : 'red'}>{reservaPct}%</Badge>
              <button
                onClick={() => setShowMetaModal(true)}
                className="p-1 rounded-lg transition-colors"
                style={{ color: 'var(--text3)', background: 'transparent' }}
                onMouseEnter={(e) => e.target.style.background = 'var(--bg3)'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                title="Editar meta"
              >
                <Edit2 size={14} />
              </button>
            </div>
          }>Reserva de Emergência</CardTitle>

          <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text3)' }}>
            <span>{fmt(inv.reserva.atual)} acumulado</span>
            <span>Meta: {fmt(inv.reserva.meta)}</span>
          </div>
          <ProgressBar pct={reservaPct} color={reservaColor} height={8} />
          <div className="text-xs mt-2" style={{ color: 'var(--text3)' }}>
            Faltam <span style={{ color: 'var(--text)' }}>{fmt(Math.max(0, inv.reserva.meta - inv.reserva.atual))}</span> para atingir a meta
          </div>

          <div className="mt-5">
            <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--text3)' }}>Distribuição da Carteira</div>
            <div className="flex flex-col gap-0">
              {ASSET_CONFIG.map((a) => {
                const val = inv[a.key] || 0
                const pct = totalInv ? Math.round((val / totalInv) * 100) : 0
                return (
                  <div key={a.key} className="flex items-center gap-3 py-3"
                    style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: a.color }} />
                    <div className="flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{a.label}</div>
                      <div className="text-xs" style={{ color: 'var(--text3)' }}>{a.desc} · {pct}% do portfólio</div>
                    </div>
                    <div className="text-sm font-semibold font-mono" style={{ color: a.color }}>{fmt(val)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        {/* Pie + breakdown */}
        <Card>
          <CardTitle>Distribuição Visual</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={58} outerRadius={88} dataKey="value" paddingAngle={3}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col gap-2 mt-3">
            {pieData.map((a) => (
              <div key={a.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ background: a.color }} />
                  <span style={{ color: 'var(--text2)' }}>{a.name}</span>
                </span>
                <span className="font-mono" style={{ color: 'var(--text3)' }}>
                  {totalInv ? Math.round((a.value / totalInv) * 100) : 0}% · {fmt(a.value)}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text3)' }}>DISTRIBUIÇÃO RECOMENDADA (Perfil Moderado)</div>
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'Renda Fixa (CDB/CDI)', rec: 50, color: '#3b82f6' },
                { label: 'Fundos Multimercado', rec: 20, color: '#a78bfa' },
                { label: 'Previdência', rec: 15, color: '#22c55e' },
                { label: 'Ações / Variável', rec: 15, color: '#f59e0b' },
              ].map(({ label, rec, color }) => (
                <div key={label} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                  <span style={{ color: 'var(--text3)' }}>{label}</span>
                  <span className="ml-auto" style={{ color: 'var(--text2)' }}>{rec}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <EditMetaModal
        open={showMetaModal}
        onClose={() => setShowMetaModal(false)}
        currentMeta={inv.reserva.meta}
        onSave={handleUpdateMeta}
      />
    </div>
  )
}
