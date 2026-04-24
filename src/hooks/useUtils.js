export function fmt(v) {
  return 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtShort(v) {
  if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M'
  if (v >= 1000) return 'R$ ' + Math.floor(v / 1000) + 'k'
  return 'R$ ' + Math.floor(v)
}

export function fmtDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

export function daysUntil(dateStr) {
  const target = new Date(dateStr)
  const now = new Date()
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  return diff
}

export function monthsUntil(dateStr) {
  const target = new Date(dateStr)
  const now = new Date()
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth())
  return Math.max(0, months)
}
