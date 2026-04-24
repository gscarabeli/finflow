import React from 'react'

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border p-5 ${className}`}
      style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      {children}
    </div>
  )
}

export function CardTitle({ children, right }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
        {children}
      </span>
      {right}
    </div>
  )
}

export function StatCard({ label, value, sub, color = 'var(--text)', dot }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 mb-2">
        {dot && <span className="w-2 h-2 rounded-full" style={{ background: dot }} />}
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text3)' }}>{label}</span>
      </div>
      <div className="text-2xl font-semibold tracking-tight" style={{ color, fontFamily: "'Sora', sans-serif" }}>{value}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--text3)' }}>{sub}</div>}
    </div>
  )
}

export function Badge({ children, color = 'blue' }) {
  const map = {
    blue: { bg: 'var(--blue-bg)', text: 'var(--blue)' },
    green: { bg: 'var(--green-bg)', text: 'var(--green)' },
    red: { bg: 'var(--red-bg)', text: 'var(--red)' },
    amber: { bg: 'var(--amber-bg)', text: 'var(--amber)' },
    purple: { bg: 'var(--purple-bg)', text: 'var(--purple)' },
    pink: { bg: 'var(--pink-bg)', text: 'var(--pink)' },
  }
  const c = map[color] || map.blue
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-md"
      style={{ background: c.bg, color: c.text, letterSpacing: '0.3px' }}>
      {children}
    </span>
  )
}

export function ProgressBar({ pct, color = 'var(--blue)', height = 6 }) {
  const clamp = Math.min(100, Math.max(0, pct))
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: 'var(--bg3)' }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${clamp}%`, background: color }} />
    </div>
  )
}

export function Button({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }) {
  const base = 'font-semibold rounded-xl cursor-pointer transition-all duration-150 border-0 font-["Sora"] disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = { sm: 'text-xs px-3 py-1.5', md: 'text-sm px-4 py-2.5', lg: 'text-sm px-5 py-3' }
  const variants = {
    primary: 'text-white',
    ghost: 'border',
    danger: 'text-white',
  }
  const styles = {
    primary: { background: 'var(--blue)' },
    ghost: { background: 'transparent', borderColor: 'var(--border)', color: 'var(--text2)' },
    danger: { background: 'var(--red)' },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      style={styles[variant]}
    >
      {children}
    </button>
  )
}

export function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rounded-2xl border p-6 w-full max-w-md mx-4"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border2)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
          <button onClick={onClose} className="text-xl leading-none cursor-pointer border-0 bg-transparent"
            style={{ color: 'var(--text3)' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Input({ label, ...props }) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text3)' }}>{label}</label>}
      <input
        {...props}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}
      />
    </div>
  )
}

export function Select({ label, children, ...props }) {
  return (
    <div className="mb-3">
      {label && <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--text3)' }}>{label}</label>}
      <select
        {...props}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none cursor-pointer"
        style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}
      >
        {children}
      </select>
    </div>
  )
}
