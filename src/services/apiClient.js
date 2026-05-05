import { STORAGE_KEYS, loadSecurely, saveSecurely } from '../hooks/useSecurity.js'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function getAuthToken() {
  return loadSecurely(STORAGE_KEYS.AUTH_TOKEN, null, false)
}

export function saveAuthToken(token) {
  saveSecurely(STORAGE_KEYS.AUTH_TOKEN, token, false)
}

export function clearAuthTokenLocal() {
  sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken()
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers })

  let data
  try { data = await response.json() } catch { data = null }

  if (!response.ok) {
    const err = new Error(data?.error || response.statusText || 'Erro na API')
    err.code = data?.code
    err.status = response.status
    throw err
  }

  return data
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function apiRegister(name, email, password, cfToken) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, cfToken }),
  })
}

export async function apiLogin(email, password, cfToken) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password, cfToken }),
  })
}

export async function apiValidate() {
  return apiFetch('/auth/me')
}

export async function apiResendVerification(email) {
  return apiFetch('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export async function apiForgotPassword(email, cfToken) {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email, cfToken }),
  })
}

export async function apiResetPassword(token, password) {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  })
}

export async function apiChangePassword(currentPassword, newPassword) {
  return apiFetch('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}

// ─── Partner profile ──────────────────────────────────────────────────────────
export async function apiCreatePartnerProfile(nome, avatar) {
  return apiFetch('/partner/profile', { method: 'POST', body: JSON.stringify({ nome, avatar }) })
}

export async function apiUpdatePartnerProfile(data) {
  return apiFetch('/partner/profile', { method: 'PATCH', body: JSON.stringify(data) })
}

export async function apiDeletePartnerProfile() {
  return apiFetch('/partner/profile', { method: 'DELETE' })
}

// ─── Profile ──────────────────────────────────────────────────────────────────
export async function apiLoadProfileData() {
  return apiFetch('/profile')
}

// ─── Sonhos ───────────────────────────────────────────────────────────────────
export async function apiLoadSonhos() {
  return apiFetch('/sonhos')
}

export async function apiCreateSonho(sonho) {
  return apiFetch('/sonhos', { method: 'POST', body: JSON.stringify(sonho) })
}

export async function apiUpdateSonho(id, fields) {
  return apiFetch(`/sonhos/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(fields) })
}

export async function apiDeleteSonho(id) {
  return apiFetch(`/sonhos/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ─── Transactions ─────────────────────────────────────────────────────────────
export async function apiCreateTransaction(transaction, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/transactions${qs}`, { method: 'POST', body: JSON.stringify(transaction) })
}

export async function apiDeleteTransaction(id, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/transactions/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' })
}

export async function apiUpdateTransaction(id, transaction, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/transactions/${encodeURIComponent(id)}${qs}`, { method: 'PUT', body: JSON.stringify(transaction) })
}

// ─── Investimentos ────────────────────────────────────────────────────────────
export async function apiUpdateInvestimentos(investimentos, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/investimentos${qs}`, { method: 'PUT', body: JSON.stringify(investimentos) })
}

// ─── Contas ───────────────────────────────────────────────────────────────────
export async function apiLoadContas(isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/contas${qs}`)
}

export async function apiCreateConta(conta, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/contas${qs}`, { method: 'POST', body: JSON.stringify(conta) })
}

export async function apiUpdateConta(id, conta, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/contas/${encodeURIComponent(id)}${qs}`, { method: 'PUT', body: JSON.stringify(conta) })
}

export async function apiDeleteConta(id, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/contas/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' })
}

// ─── User profile ─────────────────────────────────────────────────────────────
export async function apiUpdateProfile(data) {
  return apiFetch('/auth/profile', { method: 'PUT', body: JSON.stringify(data) })
}

// ─── Pagamentos ───────────────────────────────────────────────────────────────
export async function apiCreatePagamento(pagamento, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/pagamentos${qs}`, { method: 'POST', body: JSON.stringify(pagamento) })
}

export async function apiUpdatePagamento(id, pagamento, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/pagamentos/${encodeURIComponent(id)}${qs}`, { method: 'PUT', body: JSON.stringify(pagamento) })
}

export async function apiDeletePagamento(id, isPartner = false) {
  const qs = isPartner ? '?profile=partner' : ''
  return apiFetch(`/pagamentos/${encodeURIComponent(id)}${qs}`, { method: 'DELETE' })
}

// ─── Gemini ───────────────────────────────────────────────────────────────────
export async function apiLoadGeminiResponse(body) {
  return apiFetch('/gemini', { method: 'POST', body: JSON.stringify(body) })
}