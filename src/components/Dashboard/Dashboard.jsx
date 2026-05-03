import React, { useState, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { CAT_COLORS, CAT_ICONS, CATEGORIAS } from '../../data/mockData.js'
import { fmt, fmtShort, fmtDate } from '../../hooks/useUtils.js'
import { Card, CardTitle, StatCard, Badge, Modal, Input, Select, Button, ProgressBar } from '../shared/UI.jsx'

function AddTxModal({ open, onClose, editingTx }) {
  const { addTransaction, updateTransaction } = useStore()
  const isEdit = !!editingTx
  const [form, setForm] = useState(
    editingTx ? {
      desc: editingTx.desc,
      valor: editingTx.valor.toString(),
      tipo: editingTx.tipo,
      cat: editingTx.cat,
      data: editingTx.data
    } : {
      desc: '',
      valor: '',
      tipo: 'saida',
      cat: 'Alimentação',
      data: new Date().toISOString().split('T')[0]
    }
  )
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  React.useEffect(() => {
    if (editingTx) {
      setForm({
        desc: editingTx.desc,
        valor: editingTx.valor.toString(),
        tipo: editingTx.tipo,
        cat: editingTx.cat,
        data: editingTx.data
      })
    } else {
      setForm({
        desc: '',
        valor: '',
        tipo: 'saida',
        cat: 'Alimentação',
        data: new Date().toISOString().split('T')[0]
      })
    }
  }, [editingTx])

  const submit = () => {
    if (!form.desc || !form.valor) return
    const tx = { ...form, valor: parseFloat(form.valor) }
    if (isEdit) {
      updateTransaction(editingTx.id, tx)
    } else {
      addTransaction(tx)
    }
    setForm({
      desc: '',
      valor: '',
      tipo: 'saida',
      cat: 'Alimentação',
      data: new Date().toISOString().split('T')[0]
    })
    setEditingTx && setEditingTx(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Editar Transação" : "Nova Transação"}>
      <Input label="Descrição" placeholder="Ex: Supermercado" value={form.desc} onChange={(e) => set('desc', e.target.value)} />
      <Input label="Valor (R$)" type="number" placeholder="0,00" step="0.01" value={form.valor} onChange={(e) => set('valor', e.target.value)} />
      <Input label="Data" type="date" value={form.data} onChange={(e) => set('data', e.target.value)} />
      <Select label="Tipo" value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
        <option value="saida">Saída</option>
        <option value="entrada">Entrada</option>
      </Select>
      <Select label="Categoria" value={form.cat} onChange={(e) => set('cat', e.target.value)}>
        {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
      </Select>
      <div className="flex gap-2 mt-2">
        <Button onClick={submit}>{isEdit ? "Salvar" : "Adicionar"}</Button>
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

export default function Dashboard() {
  const { getActiveData, deleteTransaction, updateTransaction, viewMode } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [editingTx, setEditingTx] = useState(null)
  const pd = getActiveData()
  const isCasal = viewMode === 'casal'

  const { entradas, saidas, saldo, catData, saldoContas, saldoVR, nonVrCount } = useMemo(() => {
    const txs = pd.transacoes
    const entradas = txs.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
    const saidas = txs.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
    const catMap = {}
    txs.filter((t) => t.tipo === 'saida').forEach((t) => { catMap[t.cat] = (catMap[t.cat] || 0) + t.valor })
    const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
    const isVR = (c) => c.tipo.toLowerCase().includes('vale refeição') || c.tipo.toLowerCase().includes('vr')
    const saldoVR = pd.contas.filter(isVR).reduce((s, c) => s + c.saldo, 0)
    const saldoContas = pd.contas.filter((c) => !isVR(c)).reduce((s, c) => s + c.saldo, 0)
    const nonVrCount = pd.contas.filter((c) => !isVR(c)).length
    return { entradas, saidas, saldo: entradas - saidas, catData, saldoContas, saldoVR, nonVrCount }
  }, [pd])

  const maxCat = catData[0]?.value || 1

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            {viewMode === 'casal' ? 'Visão Consolidada do Casal' : pd.nome}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Abril 2026 · Dados em tempo real</p>
        </div>
        {!isCasal && (
          <Button onClick={() => setShowModal(true)}>
            <span className="flex items-center gap-1.5"><Plus size={14} /> Nova Transação</span>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Entradas" value={fmt(entradas)} sub={`${pd.transacoes.filter(t => t.tipo === 'entrada').length} lançamentos`} color="var(--green)" dot="var(--green)" />
        <StatCard label="Saídas" value={fmt(saidas)} sub={`${pd.transacoes.filter(t => t.tipo === 'saida').length} lançamentos`} color="var(--red)" dot="var(--red)" />
        <StatCard label="Saldo do Mês" value={(saldo >= 0 ? '+' : '') + fmt(saldo)} sub={saldo >= 0 ? 'Superávit' : 'Déficit'} color={saldo >= 0 ? 'var(--green)' : 'var(--red)'} dot="var(--blue)" />
        <StatCard label="Saldo em Conta" value={fmt(saldoContas)} sub={`${nonVrCount} contas/cartões`} color={saldoContas >= 0 ? 'var(--purple)' : 'var(--red)'} dot="var(--purple)" />
      </div>

      {saldoVR !== 0 && (
        <div className="rounded-2xl border p-4 mb-6"
          style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Saldo VR (Alelo)</div>
              <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>Valor extra reservado para alimentação, não entra no saldo principal.</div>
            </div>
            <div className="text-lg font-semibold" style={{ color: 'var(--cyan)' }}>{fmt(saldoVR)}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Transactions */}
        <div className="lg:col-span-2">
          <Card>
            <CardTitle right={<Badge color="blue">{pd.transacoes.length}</Badge>}>Últimas Transações</CardTitle>
            <div className="flex flex-col gap-0.5">
              {pd.transacoes.slice(0, 10).map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl group transition-colors"
                  style={{ cursor: 'default' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                    style={{ background: (CAT_COLORS[tx.cat] || '#9aa0b8') + '22' }}>
                    {CAT_ICONS[tx.cat] || '📌'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                      {tx.desc}
                      {tx.perfil && <span className="text-xs ml-1.5" style={{ color: 'var(--text3)' }}>({tx.perfil})</span>}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>{tx.cat}</div>
                  </div>
                  <div className={`text-sm font-semibold ${tx.tipo === 'entrada' ? 'text-green-400' : 'text-red-400'}`}
                    style={{ color: tx.tipo === 'entrada' ? 'var(--green)' : 'var(--red)' }}>
                    {tx.tipo === 'entrada' ? '+' : '-'}{fmt(tx.valor)}
                  </div>
                  <div className="text-xs w-10 text-right" style={{ color: 'var(--text3)' }}>{fmtDate(tx.data)}</div>
                  {viewMode !== 'casal' && (
                    <div className="flex gap-1">
                      <button onClick={() => {
                        setEditingTx(tx)
                        setShowModal(true)
                      }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-0 bg-transparent cursor-pointer p-1 rounded"
                        style={{ color: 'var(--text3)' }}>
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => deleteTransaction(tx.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity border-0 bg-transparent cursor-pointer p-1 rounded"
                        style={{ color: 'var(--text3)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right col */}
        <div className="flex flex-col gap-4">
          {/* Accounts */}
          <Card>
            <CardTitle>Contas & Cartões</CardTitle>
            <div className="flex flex-col gap-0">
              {pd.contas.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{c.nome}</div>
                    <div className="text-xs" style={{ color: 'var(--text3)' }}>{c.tipo}</div>
                  </div>
                  <div className="text-sm font-semibold"
                    style={{ color: c.saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {fmt(c.saldo)}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Categories bar */}
          <Card>
            <CardTitle>Gastos por Categoria</CardTitle>
            <div className="flex flex-col gap-2.5">
              {catData.slice(0, 6).map(({ name, value }) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="text-xs w-20 flex-shrink-0" style={{ color: 'var(--text2)' }}>{name}</div>
                  <div className="flex-1" style={{ height: 5, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(value / maxCat * 100)}%`, height: '100%', background: CAT_COLORS[name] || '#9aa0b8', borderRadius: 3 }} />
                  </div>
                  <div className="text-xs w-14 text-right" style={{ color: 'var(--text3)' }}>{fmtShort(value)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Pie chart */}
      <Card>
        <CardTitle>Distribuição de Gastos por Categoria</CardTitle>
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <PieChart width={180} height={160}>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={48} outerRadius={76} dataKey="value" paddingAngle={2}>
                {catData.map((entry) => (
                  <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#9aa0b8'} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 flex-1 min-w-0">
            {catData.map(({ name, value }) => (
              <div key={name} className="flex items-center gap-2 text-xs min-w-[120px]">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: CAT_COLORS[name] || '#9aa0b8' }} />
                <span style={{ color: 'var(--text2)' }}>{name}</span>
                <span style={{ color: 'var(--text3)' }}>{Math.round(value / saidas * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="flex-shrink-0 w-full lg:w-64 h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData.slice(0, 5)} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text3)' }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtShort(v)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {catData.slice(0, 5).map((entry) => (
                    <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#9aa0b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      <AddTxModal open={showModal} onClose={() => {
        setShowModal(false)
        setEditingTx(null)
      }} editingTx={editingTx} />
    </div>
  )
}
