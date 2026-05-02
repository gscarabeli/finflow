import { create } from 'zustand'
import {
  sanitizeInput,
  RateLimiter,
  loadSecurely,
  saveSecurely,
  clearSensitiveData,
  STORAGE_KEYS,
} from '../hooks/useSecurity.js'
import {
  apiLogin,
  apiValidate,
  apiLoadProfileData,
  apiLoadSonhos,
  apiCreateTransaction,
  apiDeleteTransaction,
  apiUpdateTransaction,
  apiUpdateInvestimentos,
  apiCreateSonho,
  apiUpdateSonho,
  apiDeleteSonho,
  apiLoadContas,
  apiCreateConta,
  apiUpdateConta,
  apiDeleteConta,
} from '../services/apiClient.js'

const loginLimiter = new RateLimiter(5, 15 * 60 * 1000)

function loadLS(key, fallback, persistent = false) {
  return loadSecurely(key, fallback, persistent)
}

function saveLS(key, val, persistent = false) {
  saveSecurely(key, val, persistent)
}

const EMPTY_PROFILE = {
  nome: '',
  contas: [],
  investimentos: {
    reserva: { atual: 0, meta: 0 },
    previdencia: 0,
    acoes: 0,
    fundos: 0,
    cdi: 0,
  },
  transacoes: [],
}

export const useStore = create((set, get) => ({
  profile: 'eu',
  tab: 'dashboard',
  initialized: false,

  profiles: {
    eu: { ...EMPTY_PROFILE, nome: 'Gustavo' },
    ela: { ...EMPTY_PROFILE, nome: 'Larissa' },
  },

  sonhos: [],

  authToken: loadLS(STORAGE_KEYS.AUTH_TOKEN, null, false),
  authenticated: Boolean(loadLS(STORAGE_KEYS.AUTH_TOKEN, null, false)),
  authProfile: loadLS(STORAGE_KEYS.AUTH_PROFILE, 'eu', false),
  themeByProfile: loadLS(STORAGE_KEYS.THEME, { eu: 'default', ela: 'larissa', casal: 'casal' }, true),

  setProfile: (profile) => set({ profile }),
  setTab: (tab) => set({ tab }),

  initialize: async () => {
    const token = loadLS(STORAGE_KEYS.AUTH_TOKEN, null, false)
    if (!token) {
      set({ initialized: true })
      return
    }

    try {
      const me = await apiValidate()
      const profile = me.profile
      const appData = await apiLoadProfileData(profile)
      const sonhos = await apiLoadSonhos()

      const profiles = { ...get().profiles }
      if (profile === 'casal') {
        profiles.eu = appData.eu
        profiles.ela = appData.ela
      } else {
        profiles[profile] = appData[profile]
      }

      set({
        authenticated: true,
        authToken: token,
        authProfile: profile,
        profile,
        profiles,
        sonhos,
      })
    } catch {
      clearSensitiveData()
      set({ authenticated: false, authToken: null, profile: 'eu' })
    } finally {
      set({ initialized: true })
    }
  },

  login: async (profile, password) => {
    const limit = loginLimiter.checkLimit(profile)
    if (!limit.allowed) {
      const minutes = Math.ceil(limit.resetIn / 60000)
      throw new Error(`Muitas tentativas de login. Tente novamente em ${minutes} minuto(s).`)
    }

    const sanitizedPassword = sanitizeInput(password)
    if (sanitizedPassword !== password) {
      throw new Error('Entrada contém caracteres inválidos')
    }

    const response = await apiLogin(profile, password)
    const { token } = response
    saveLS(STORAGE_KEYS.AUTH_TOKEN, token, false)
    saveLS(STORAGE_KEYS.AUTH_PROFILE, profile, false)

    const appData = await apiLoadProfileData(profile)
    const sonhos = await apiLoadSonhos()

    const profiles = { ...get().profiles }
    if (profile === 'casal') {
      profiles.eu = appData.eu
      profiles.ela = appData.ela
    } else {
      profiles[profile] = appData[profile]
    }

    set({
      authenticated: true,
      authToken: token,
      authProfile: profile,
      profile,
      profiles,
      sonhos,
    })

    loginLimiter.reset(profile)
    return true
  },

  logout: () => {
    clearSensitiveData()
    set({
      authenticated: false,
      authToken: null,
      profile: 'eu',
      profiles: {
        eu: { ...EMPTY_PROFILE, nome: 'Gustavo' },
        ela: { ...EMPTY_PROFILE, nome: 'Larissa' },
      },
      sonhos: [],
    })
  },

  setTheme: (theme) => {
    const { profile, themeByProfile } = get()
    const updated = { ...themeByProfile, [profile]: theme }
    saveLS(STORAGE_KEYS.THEME, updated, true)
    set({ themeByProfile: updated })
  },

  getActiveData: () => {
    const { profile, profiles } = get()
    if (profile === 'casal') {
      const e = profiles.eu
      const a = profiles.ela
      const allTx = [
        ...e.transacoes.map((t) => ({ ...t, perfil: 'Gustavo' })),
        ...a.transacoes.map((t) => ({ ...t, perfil: 'Larissa' })),
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

  addTransaction: async (tx) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    const transaction = await apiCreateTransaction(tx)
    const updated = {
      ...profiles,
      [target]: {
        ...profiles[target],
        transacoes: [transaction, ...profiles[target].transacoes],
      },
    }
    const key = target === 'eu' ? STORAGE_KEYS.USER_DATA_EU : STORAGE_KEYS.USER_DATA_ELA
    saveLS(key, updated[target], false)
    set({ profiles: updated })
  },

  deleteTransaction: async (id) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    await apiDeleteTransaction(id)
    const updated = {
      ...profiles,
      [target]: {
        ...profiles[target],
        transacoes: profiles[target].transacoes.filter((t) => t.id !== id),
      },
    }
    const key = target === 'eu' ? STORAGE_KEYS.USER_DATA_EU : STORAGE_KEYS.USER_DATA_ELA
    saveLS(key, updated[target], false)
    set({ profiles: updated })
  },

  updateTransaction: async (id, tx) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    const transaction = await apiUpdateTransaction(id, tx)
    const updated = {
      ...profiles,
      [target]: {
        ...profiles[target],
        transacoes: profiles[target].transacoes.map((t) => (t.id === id ? transaction : t)),
      },
    }
    const key = target === 'eu' ? STORAGE_KEYS.USER_DATA_EU : STORAGE_KEYS.USER_DATA_ELA
    saveLS(key, updated[target], false)
    set({ profiles: updated })
  },

  addConta: async (conta) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    const created = await apiCreateConta(conta)
    const updated = {
      ...profiles,
      [target]: {
        ...profiles[target],
        contas: [...profiles[target].contas, created],
      },
    }
    const key = target === 'eu' ? STORAGE_KEYS.USER_DATA_EU : STORAGE_KEYS.USER_DATA_ELA
    saveLS(key, updated[target], false)
    set({ profiles: updated })
  },

  updateConta: async (id, conta) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    const updatedConta = await apiUpdateConta(id, conta)
    const updated = {
      ...profiles,
      [target]: {
        ...profiles[target],
        contas: profiles[target].contas.map((c) => (c.id === id ? updatedConta : c)),
      },
    }
    const key = target === 'eu' ? STORAGE_KEYS.USER_DATA_EU : STORAGE_KEYS.USER_DATA_ELA
    saveLS(key, updated[target], false)
    set({ profiles: updated })
  },

  deleteConta: async (id) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    await apiDeleteConta(id)
    const updated = {
      ...profiles,
      [target]: {
        ...profiles[target],
        contas: profiles[target].contas.filter((c) => c.id !== id),
      },
    }
    const key = target === 'eu' ? STORAGE_KEYS.USER_DATA_EU : STORAGE_KEYS.USER_DATA_ELA
    saveLS(key, updated[target], false)
    set({ profiles: updated })
  },

  updateInvestimentos: async (inv) => {
    const { profile, profiles } = get()
    const target = profile === 'casal' ? 'eu' : profile
    const investimentos = await apiUpdateInvestimentos(inv)
    const updated = {
      ...profiles,
      [target]: { ...profiles[target], investimentos },
    }
    const key = target === 'eu' ? STORAGE_KEYS.USER_DATA_EU : STORAGE_KEYS.USER_DATA_ELA
    saveLS(key, updated[target], false)
    set({ profiles: updated })
  },

  addSonho: async (sonho) => {
    const created = await apiCreateSonho(sonho)
    const { sonhos } = get()
    const updated = [...sonhos, created]
    saveLS(STORAGE_KEYS.SONHOS, updated, false)
    set({ sonhos: updated })
  },

  updateSonho: async (id, fields) => {
    const updatedSonho = await apiUpdateSonho(id, fields)
    const { sonhos } = get()
    const updated = sonhos.map((s) => (s.id === id ? updatedSonho : s))
    saveLS(STORAGE_KEYS.SONHOS, updated, false)
    set({ sonhos: updated })
  },

  deleteSonho: async (id) => {
    await apiDeleteSonho(id)
    const { sonhos } = get()
    const updated = sonhos.filter((s) => s.id !== id)
    saveLS(STORAGE_KEYS.SONHOS, updated, false)
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
      mes: new Date().toLocaleString('pt-BR', { month: 'long', year: '2-digit' }).replace(' de ', '/'),
      Gustavo: summarize(profiles.eu),
      Larissa: summarize(profiles.ela),
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
