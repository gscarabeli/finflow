import { create } from 'zustand'
import { MOCK_DATA, MOCK_SONHOS } from '../data/mockData.js'

function loadLS(key, fallback) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch {
    return fallback
  }
}

function saveLS(key, val) {
  localStorage.setItem(key, JSON.stringify(val))
}

export const useStore = create((set, get) => ({
  // --- Perfil ativo
  profile: 'eu', // 'eu' | 'ela' | 'casal'
  tab: 'dashboard',

  // --- Dados por perfil
  profiles: {
    eu: loadLS('finflow_eu', MOCK_DATA.eu),
    ela: loadLS('finflow_ela', MOCK_DATA.ela),
  },

  // --- Sonhos (compartilhado pelo casal)
  sonhos: loadLS('finflow_sonhos', MOCK_SONHOS),

  // --- API Key IA
  apiKey: loadLS('finflow_apikey', ''),

  // --- Actions
  setProfile: (profile) => set({ profile }),
  setTab: (tab) => set({ tab }),
  setApiKey: (apiKey) => {
    saveLS('finflow_apikey', apiKey)
    set({ apiKey })
  },

  getActiveData: () => {
    const { profile, profiles } = get()
    if (profile === 'casal') {
      const e = profiles.eu
      const a = profiles.ela
      const allTx = [
        ...e.transacoes.map((t) => ({ ...t, perfil: 'Lucas' })),
        ...a.transacoes.map((t) => ({ ...t, perfil: 'Ana' })),
      ].sort((x, y) => new Date(y.data) - new Date(x.data))
      return {
        nome: 'Visão do Casal',
        contas: [...e.contas, ...a.contas],
        investimentos: {
          reserva: {
            atual: e.investimentos.reserva.atual + a.investimentos.reserva.atual,
            meta: e.investimentos.reserva.meta + a.investimentos.reserva.meta,
          },
          previdencia: e.investimentos.previdencia + a.investimentos.previdencia,
          acoes: e.investimentos.acoes + a.investimentos.acoes,
          fundos: e.investimentos.fundos + a.investimentos.fundos,
          cdi: e.investimentos.cdi + a.investimentos.cdi,
        },
        transacoes: allTx,
      }
    }
    return profiles[profile]
  },

  addTransaction: (tx) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    const updated = {
      ...profiles,
      [target]: {
        ...profiles[target],
        transacoes: [{ ...tx, id: 't' + Date.now() }, ...profiles[target].transacoes],
      },
    }
    saveLS('finflow_' + target, updated[target])
    set({ profiles: updated })
  },

  deleteTransaction: (id) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    const updated = {
      ...profiles,
      [target]: {
        ...profiles[target],
        transacoes: profiles[target].transacoes.filter((t) => t.id !== id),
      },
    }
    saveLS('finflow_' + target, updated[target])
    set({ profiles: updated })
  },

  updateInvestimentos: (inv) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    const updated = {
      ...profiles,
      [target]: { ...profiles[target], investimentos: inv },
    }
    saveLS('finflow_' + target, updated[target])
    set({ profiles: updated })
  },

  // --- Sonhos
  addSonho: (sonho) => {
    const { sonhos } = get()
    const updated = [...sonhos, { ...sonho, id: 's' + Date.now() }]
    saveLS('finflow_sonhos', updated)
    set({ sonhos: updated })
  },

  updateSonho: (id, fields) => {
    const { sonhos } = get()
    const updated = sonhos.map((s) => (s.id === id ? { ...s, ...fields } : s))
    saveLS('finflow_sonhos', updated)
    set({ sonhos: updated })
  },

  deleteSonho: (id) => {
    const { sonhos } = get()
    const updated = sonhos.filter((s) => s.id !== id)
    saveLS('finflow_sonhos', updated)
    set({ sonhos: updated })
  },

  buildFinancialContext: () => {
    const { profiles, sonhos } = get()
    const summarize = (d) => {
      const ent = d.transacoes.filter((t) => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
      const sai = d.transacoes.filter((t) => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
      const cats = {}
      d.transacoes
        .filter((t) => t.tipo === 'saida')
        .forEach((t) => { cats[t.cat] = (cats[t.cat] || 0) + t.valor })
      const inv = d.investimentos
      const totalInv = inv.previdencia + inv.acoes + inv.fundos + inv.cdi
      return {
        entradas: ent,
        saidas: sai,
        saldo_mes: ent - sai,
        categorias_gastos: cats,
        investimentos: {
          total: totalInv + inv.reserva.atual,
          reserva: inv.reserva,
          previdencia: inv.previdencia,
          acoes: inv.acoes,
          fundos: inv.fundos,
          cdi: inv.cdi,
        },
      }
    }
    return {
      mes: 'dezembro/2024',
      Lucas: summarize(profiles.eu),
      Ana: summarize(profiles.ela),
      sonhos_do_casal: sonhos.map((s) => ({
        nome: s.nome,
        meta: s.meta,
        acumulado: s.acumulado,
        progresso_pct: Math.round((s.acumulado / s.meta) * 100),
        prazo: s.prazo,
      })),
    }
  },
}))
