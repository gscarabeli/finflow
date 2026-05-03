import { create } from 'zustand'
import {
  loadSecurely,
  saveSecurely,
  clearSensitiveData,
  STORAGE_KEYS,
} from '../hooks/useSecurity.js'
import {
  apiRegister,
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
  apiInvitePartner,
  apiAcceptInvite,
  apiLeaveCouple,
  apiUpdateProfile,
  saveAuthToken,
  clearAuthTokenLocal,
} from '../services/apiClient.js'

// ─── Empty structures ─────────────────────────────────────────────────────────
const EMPTY_PROFILE = {
  nome: '',
  contas: [],
  investimentos: { reserva: { atual: 0, meta: 0 }, previdencia: 0, acoes: 0, fundos: 0, cdi: 0 },
  transacoes: [],
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useStore = create((set, get) => ({
  // Auth
  authenticated: false,
  authToken: null,
  currentUser: null, // { id, name, email, coupleId }

  // View
  // 'solo' = apenas o próprio perfil
  // 'casal' = visão consolidada com parceiro
  viewMode: 'solo',
  tab: 'dashboard',
  initialized: false,

  // Data
  myProfile: { ...EMPTY_PROFILE },
  partnerProfile: null, // só existe se tiver casal
  sonhos: [],

  // Theme — stores hex colors; legacy theme names ('default','larissa','casal','sunset') are converted in App.jsx
  themeByMode: loadSecurely(STORAGE_KEYS.THEME, { solo: '#16a34a', casal: '#0ea5e9' }, true),
  apiKey: loadSecurely(STORAGE_KEYS.API_KEY || 'finflow_apikey', '', true),

  setTab: (tab) => set({ tab }),

  setApiKey: (apiKey) => {
    saveSecurely(STORAGE_KEYS.API_KEY || 'finflow_apikey', apiKey, true)
    set({ apiKey })
  },

  setTheme: (theme) => {
    const { viewMode, themeByMode } = get()
    const updated = { ...themeByMode, [viewMode]: theme }
    saveSecurely(STORAGE_KEYS.THEME, updated, true)
    set({ themeByMode: updated })
  },

  setViewMode: (mode) => set({ viewMode: mode }),

  // ── Initialize (called on app mount) ───────────────────────────────────────
  initialize: async () => {
    const token = loadSecurely(STORAGE_KEYS.AUTH_TOKEN, null, false)
    if (!token) {
      set({ initialized: true })
      return
    }

    try {
      const me = await apiValidate()
      const profileData = await apiLoadProfileData()
      const sonhos = await apiLoadSonhos()

      set({
        authenticated: true,
        authToken: token,
        currentUser: me,
        myProfile: profileData.eu ?? { ...EMPTY_PROFILE, nome: me.name },
        partnerProfile: profileData.parceiro ?? null,
        sonhos,
        viewMode: me.coupleId ? 'solo' : 'solo',
      })
    } catch {
      clearSensitiveData()
      set({ authenticated: false, authToken: null, currentUser: null })
    } finally {
      set({ initialized: true })
    }
  },

  // ── Register ────────────────────────────────────────────────────────────────
  register: async (name, email, password, cfToken) => {
    await apiRegister(name, email, password, cfToken)
    // Não faz login automático — usuário precisa verificar e-mail
  },

  // ── Login ───────────────────────────────────────────────────────────────────
  login: async (email, password, cfToken) => {
    const response = await apiLogin(email, password, cfToken)
    const { token, user } = response

    saveAuthToken(token)

    const profileData = await apiLoadProfileData()
    const sonhos = await apiLoadSonhos()

    set({
      authenticated: true,
      authToken: token,
      currentUser: user,
      myProfile: profileData.eu ?? { ...EMPTY_PROFILE, nome: user.name },
      partnerProfile: profileData.parceiro ?? null,
      sonhos,
      viewMode: 'solo',
    })
  },

  // ── Logout ──────────────────────────────────────────────────────────────────
  logout: () => {
    clearSensitiveData()
    clearAuthTokenLocal()
    set({
      authenticated: false,
      authToken: null,
      currentUser: null,
      myProfile: { ...EMPTY_PROFILE },
      partnerProfile: null,
      sonhos: [],
      viewMode: 'solo',
    })
  },

  // ── Couple ──────────────────────────────────────────────────────────────────
  invitePartner: async (partnerEmail) => {
    return apiInvitePartner(partnerEmail)
  },

  acceptInvite: async (token) => {
    await apiAcceptInvite(token)
    // Recarrega dados para pegar o parceiro
    const profileData = await apiLoadProfileData()
    const me = await apiValidate()
    set({
      currentUser: me,
      partnerProfile: profileData.parceiro ?? null,
    })
  },

  leaveCouple: async () => {
    await apiLeaveCouple()
    const me = await apiValidate()
    set({ currentUser: me, partnerProfile: null, viewMode: 'solo' })
  },

  updateProfile: async ({ name, email, avatar }) => {
    const user = await apiUpdateProfile({ name, email, avatar })
    set(s => ({
      currentUser: user,
      myProfile: { ...s.myProfile, nome: user.name },
    }))
  },

  // ── getActiveData: retorna dados da view atual ──────────────────────────────
  getActiveData: () => {
    const { viewMode, myProfile, partnerProfile } = get()

    if (viewMode === 'casal' && partnerProfile) {
      const me = myProfile ?? EMPTY_PROFILE
      const partner = partnerProfile ?? EMPTY_PROFILE
      const meTx = Array.isArray(me.transacoes) ? me.transacoes : []
      const partnerTx = Array.isArray(partner.transacoes) ? partner.transacoes : []
      const allTx = [
        ...meTx.map(t => ({ ...t, perfil: me.nome || 'Eu' })),
        ...partnerTx.map(t => ({ ...t, perfil: partner.nome || 'Parceiro(a)' })),
      ].sort((a, b) => new Date(b.data) - new Date(a.data))

      return {
        nome: 'Visão do Casal',
        contas: [...(me.contas ?? []), ...(partner.contas ?? [])],
        investimentos: {
          reserva: {
            atual: (me.investimentos?.reserva?.atual ?? 0) + (partner.investimentos?.reserva?.atual ?? 0),
            meta:  (me.investimentos?.reserva?.meta  ?? 0) + (partner.investimentos?.reserva?.meta  ?? 0),
          },
          previdencia: (me.investimentos?.previdencia ?? 0) + (partner.investimentos?.previdencia ?? 0),
          acoes:       (me.investimentos?.acoes       ?? 0) + (partner.investimentos?.acoes       ?? 0),
          fundos:      (me.investimentos?.fundos      ?? 0) + (partner.investimentos?.fundos      ?? 0),
          cdi:         (me.investimentos?.cdi         ?? 0) + (partner.investimentos?.cdi         ?? 0),
        },
        transacoes: allTx,
      }
    }

    return myProfile ?? { ...EMPTY_PROFILE }
  },

  // ── Transactions ────────────────────────────────────────────────────────────
  addTransaction: async (tx) => {
    const transaction = await apiCreateTransaction(tx)
    set(s => ({ myProfile: { ...s.myProfile, transacoes: [transaction, ...(s.myProfile.transacoes ?? [])] } }))
  },

  deleteTransaction: async (id) => {
    await apiDeleteTransaction(id)
    set(s => ({ myProfile: { ...s.myProfile, transacoes: s.myProfile.transacoes.filter(t => t.id !== id) } }))
  },

  updateTransaction: async (id, tx) => {
    const transaction = await apiUpdateTransaction(id, tx)
    set(s => ({ myProfile: { ...s.myProfile, transacoes: s.myProfile.transacoes.map(t => t.id === id ? transaction : t) } }))
  },

  // ── Contas ──────────────────────────────────────────────────────────────────
  addConta: async (conta) => {
    const created = await apiCreateConta(conta)
    set(s => ({ myProfile: { ...s.myProfile, contas: [...(s.myProfile.contas ?? []), created] } }))
  },

  updateConta: async (id, conta) => {
    const updated = await apiUpdateConta(id, conta)
    set(s => ({ myProfile: { ...s.myProfile, contas: s.myProfile.contas.map(c => c.id === id ? updated : c) } }))
  },

  deleteConta: async (id) => {
    await apiDeleteConta(id)
    set(s => ({ myProfile: { ...s.myProfile, contas: s.myProfile.contas.filter(c => c.id !== id) } }))
  },

  // ── Investimentos ───────────────────────────────────────────────────────────
  updateInvestimentos: async (inv) => {
    const updated = await apiUpdateInvestimentos(inv)
    set(s => ({ myProfile: { ...s.myProfile, investimentos: updated } }))
  },

  // ── Sonhos ──────────────────────────────────────────────────────────────────
  addSonho: async (sonho) => {
    const created = await apiCreateSonho(sonho)
    set(s => ({ sonhos: [...s.sonhos, created] }))
  },

  updateSonho: async (id, fields) => {
    const updated = await apiUpdateSonho(id, fields)
    set(s => ({ sonhos: s.sonhos.map(s => s.id === id ? updated : s) }))
  },

  deleteSonho: async (id) => {
    await apiDeleteSonho(id)
    set(s => ({ sonhos: s.sonhos.filter(s => s.id !== id) }))
  },

  // ── buildFinancialContext (para IA) ─────────────────────────────────────────
  buildFinancialContext: () => {
    const { myProfile, partnerProfile, sonhos, currentUser } = get()

    const summarize = (d) => {
      if (!d) return { entradas: 0, saidas: 0, saldo_mes: 0, categorias_gastos: {}, investimentos: { total: 0, reserva: { atual: 0, meta: 0 }, previdencia: 0, acoes: 0, fundos: 0, cdi: 0 } }
      const tx = Array.isArray(d.transacoes) ? d.transacoes : []
      const ent = tx.filter(t => t.tipo === 'entrada').reduce((s, t) => s + t.valor, 0)
      const sai = tx.filter(t => t.tipo === 'saida').reduce((s, t) => s + t.valor, 0)
      const cats = {}
      tx.filter(t => t.tipo === 'saida').forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.valor })
      const inv = d.investimentos ?? {}
      const totalInv = (inv.previdencia ?? 0) + (inv.acoes ?? 0) + (inv.fundos ?? 0) + (inv.cdi ?? 0)
      return {
        entradas: ent, saidas: sai, saldo_mes: ent - sai, categorias_gastos: cats,
        investimentos: { total: totalInv + (inv.reserva?.atual ?? 0), reserva: inv.reserva, previdencia: inv.previdencia, acoes: inv.acoes, fundos: inv.fundos, cdi: inv.cdi },
      }
    }

    const ctx = {
      mes: new Date().toLocaleString('pt-BR', { month: 'long', year: '2-digit' }).replace(' de ', '/'),
      [currentUser?.name || 'Eu']: summarize(myProfile),
      sonhos_do_casal: (sonhos ?? []).map(s => ({
        nome: s.nome, meta: s.meta, acumulado: s.acumulado,
        progresso_pct: Math.round((s.acumulado / s.meta) * 100), prazo: s.prazo,
      })),
    }

    if (partnerProfile) {
      ctx[partnerProfile.nome || 'Parceiro(a)'] = summarize(partnerProfile)
    }

    return ctx
  },
}))