import { STORAGE_KEYS, loadSecurely, saveSecurely } from '../hooks/useSecurity.js'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

function getAuthToken() {
  return loadSecurely(STORAGE_KEYS.AUTH_TOKEN, null, false)
}

function setAuthToken(token) {
  saveSecurely(STORAGE_KEYS.AUTH_TOKEN, token, false)
}

function clearAuthToken() {
  sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN)
}

async function apiFetch(path, options = {}) {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.error || response.statusText || 'Erro na API')
  }

  return data
}

export async function apiLogin(profile, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ profile, password }),
  })
}

export async function apiValidate() {
  return apiFetch('/auth/me')
}

export async function apiLoadProfileData(profile) {
  return apiFetch('/profile')
}

export async function apiLoadSonhos() {
  return apiFetch('/sonhos')
}

export async function apiCreateTransaction(transaction) {
  return apiFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(transaction),
  })
}

export async function apiDeleteTransaction(id) {
  return apiFetch(`/transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function apiUpdateTransaction(id, transaction) {
  return apiFetch(`/transactions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(transaction),
  })
}

export async function apiUpdateInvestimentos(investimentos) {
  return apiFetch('/investimentos', {
    method: 'PUT',
    body: JSON.stringify(investimentos),
  })
}

export async function apiCreateSonho(sonho) {
  return apiFetch('/sonhos', {
    method: 'POST',
    body: JSON.stringify(sonho),
  })
}

export async function apiUpdateSonho(id, fields) {
  return apiFetch(`/sonhos/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  })
}

export async function apiLoadContas() {
  return apiFetch('/contas')
}

export async function apiCreateConta(conta) {
  return apiFetch('/contas', {
    method: 'POST',
    body: JSON.stringify(conta),
  })
}

export async function apiUpdateConta(id, conta) {
  return apiFetch(`/contas/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(conta),
  })
}

export async function apiDeleteConta(id) {
  return apiFetch(`/contas/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function apiLoadGeminiResponse(body) {
  return apiFetch('/gemini', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function saveAuthToken(token) {
  setAuthToken(token)
}

export function clearAuthTokenLocal() {
  clearAuthToken()
}
