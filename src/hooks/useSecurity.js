/**
 * Utilitários de Segurança para FinFlow
 * ⚠️ NOTA: Para produção com dados reais, implemente autenticação em backend
 */

// ============================================================================
// HASHING SEGURO DE SENHA com PBKDF2
// ============================================================================
/**
 * Hash seguro usando PBKDF2 (Web Crypto API)
 * - PBKDF2 com SHA-256
 * - 100.000 iterações (recomendado OWASP)
 * - Salt aleatório por senha
 * 
 * @param {string} password - Senha a hashar
 * @returns {Promise<string>} Hash em formato Base64
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  
  // Gerar salt aleatório de 16 bytes
  const salt = crypto.getRandomValues(new Uint8Array(16))
  
  // PBKDF2 com 100.000 iterações (recomendado OWASP 2023)
  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']),
    256
  )
  
  // Combinar salt + hash em Base64
  const hashArray = new Uint8Array(key)
  const combined = new Uint8Array(salt.length + hashArray.length)
  combined.set(salt, 0)
  combined.set(hashArray, salt.length)
  
  return btoa(String.fromCharCode(...combined))
}

/**
 * Verificar senha contra hash
 * @param {string} password - Senha a verificar
 * @param {string} storedHash - Hash armazenado
 * @returns {Promise<boolean>} Verdadeiro se corresponde
 */
export async function verifyPassword(password, storedHash) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  
  // Decodificar hash armazenado
  const combined = new Uint8Array(atob(storedHash).split('').map((c) => c.charCodeAt(0)))
  
  // Extrair salt (primeiros 16 bytes)
  const salt = combined.slice(0, 16)
  const storedHashBytes = combined.slice(16)
  
  // Aplicar PBKDF2 com o mesmo salt
  const key = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']),
    256
  )
  
  // Comparar hashes (constant-time)
  const hashArray = new Uint8Array(key)
  return timingSafeCompare(hashArray, storedHashBytes)
}

/**
 * Comparação de tempo constante (proteção contra timing attacks)
 * @param {Uint8Array} a - Array 1
 * @param {Uint8Array} b - Array 2
 * @returns {boolean} Verdadeiro se igual
 */
function timingSafeCompare(a, b) {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }
  return result === 0
}

// ============================================================================
// SANITIZAÇÃO DE ENTRADA (XSS Prevention)
// ============================================================================
/**
 * Sanitizar texto para evitar XSS
 * Remove tags HTML perigosas
 * @param {string} text - Texto a sanitizar
 * @returns {string} Texto seguro
 */
export function sanitizeInput(text) {
  if (typeof text !== 'string') return ''
  
  // Escapar caracteres HTML perigosos
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Validar entrada de texto
 * @param {string} text - Texto a validar
 * @param {Object} options - Opções de validação
 * @returns {Object} { valid: boolean, error: string }
 */
export function validateInput(text, options = {}) {
  const {
    minLength = 0,
    maxLength = 10000,
    allowedChars = null,
    noSpecialChars = false,
  } = options
  
  if (typeof text !== 'string') {
    return { valid: false, error: 'Entrada inválida' }
  }
  
  if (text.length < minLength) {
    return { valid: false, error: `Mínimo de ${minLength} caracteres` }
  }
  
  if (text.length > maxLength) {
    return { valid: false, error: `Máximo de ${maxLength} caracteres` }
  }
  
  // Bloquear tags HTML
  if (/<script|<iframe|<object|<embed|javascript:/i.test(text)) {
    return { valid: false, error: 'Entrada contém código suspeito' }
  }
  
  // Validar caracteres específicos se necessário
  if (allowedChars && !new RegExp(`^[${allowedChars}]+$`).test(text)) {
    return { valid: false, error: 'Caracteres não permitidos' }
  }
  
  if (noSpecialChars && !/^[a-zA-Z0-9\s\-áéíóúàâãõç,.()]*$/.test(text)) {
    return { valid: false, error: 'Caracteres especiais não permitidos' }
  }
  
  return { valid: true }
}

// ============================================================================
// RATE LIMITING (Proteção contra Força Bruta)
// ============================================================================
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
    this.attempts = new Map()
  }
  
  /**
   * Verificar se está dentro do limite
   * @param {string} key - Identificador (ex: email, IP)
   * @returns {Object} { allowed: boolean, remaining: number, resetIn: number }
   */
  checkLimit(key) {
    const now = Date.now()
    const record = this.attempts.get(key)
    
    if (!record) {
      // Primeira tentativa
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs })
      return { allowed: true, remaining: this.maxAttempts - 1, resetIn: this.windowMs }
    }
    
    if (now > record.resetAt) {
      // Janela expirou, resetar
      this.attempts.set(key, { count: 1, resetAt: now + this.windowMs })
      return { allowed: true, remaining: this.maxAttempts - 1, resetIn: this.windowMs }
    }
    
    // Dentro da janela
    record.count++
    const allowed = record.count <= this.maxAttempts
    const remaining = Math.max(0, this.maxAttempts - record.count)
    const resetIn = record.resetAt - now
    
    return { allowed, remaining, resetIn }
  }
  
  /**
   * Limpar registro
   * @param {string} key - Identificador
   */
  reset(key) {
    this.attempts.delete(key)
  }
}

// ============================================================================
// SEGURANÇA DE ARMAZENAMENTO
// ============================================================================
/**
 * Use sessionStorage em vez de localStorage para dados sensíveis
 * - sessionStorage expira quando a aba fecha
 * - localStorage persiste para sempre
 * 
 * Recomendação para FinFlow:
 * - sessionStorage: dados financeiros, autenticação
 * - localStorage: apenas temas, preferências não-sensíveis
 */

export const STORAGE_KEYS = {
  // sessionStorage - Dados Sensíveis (Expira ao fechar aba)
  AUTH_TOKEN: 'finflow_auth_token', // Alterado para token
  AUTH_PROFILE: 'finflow_auth_profile',
  USER_DATA_EU: 'finflow_eu',
  USER_DATA_ELA: 'finflow_ela',
  SONHOS: 'finflow_sonhos',
  
  // localStorage - Apenas Preferências (Persistente)
  THEME: 'finflow_theme',
  LAST_PROFILE: 'finflow_last_profile',
}

/**
 * Salvar com segurança (escolhe o storage correto)
 */
export function saveSecurely(key, value, persistent = false) {
  const storage = persistent ? localStorage : sessionStorage
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(`Erro ao salvar ${key}:`, e)
  }
}

/**
 * Carregar com segurança
 */
export function loadSecurely(key, fallback, persistent = false) {
  const storage = persistent ? localStorage : sessionStorage
  try {
    const val = storage.getItem(key)
    return val ? JSON.parse(val) : fallback
  } catch (e) {
    console.error(`Erro ao carregar ${key}:`, e)
    return fallback
  }
}

/**
 * Limpar todos os dados sensíveis (IMPORTANTE: chamar ao logout)
 */
export function clearSensitiveData() {
  // Limpar sessionStorage
  sessionStorage.clear()
  
  // Limpar também dados sensíveis específicos no localStorage
  const sensitiveKeys = [
    'finflow_pwd_hash',
    'finflow_apikey',
    'finflow_auth',
    STORAGE_KEYS.AUTH_PROFILE,
    STORAGE_KEYS.USER_DATA_EU,
    STORAGE_KEYS.USER_DATA_ELA,
    STORAGE_KEYS.SONHOS,
  ]
  sensitiveKeys.forEach((key) => localStorage.removeItem(key))
  
  // Limpar do Zustand state também
  console.log('🔒 Dados sensíveis foram limpos')
}