import React from 'react'
import { CreditCard, Wallet } from 'lucide-react'

export const BANKS = [
  { id: 'santander', name: 'Santander',   color: '#EC0000', abbr: 'S'   },
  { id: 'picpay',    name: 'PicPay',      color: '#11C76F', abbr: 'PP'  },
  { id: 'alelo',     name: 'Alelo',       color: '#FF6B00', abbr: 'AL'  },
  { id: 'rico',      name: 'Rico',        color: '#1469C8', abbr: 'R'   },
  { id: 'xp',        name: 'XP',          color: '#C9A62C', abbr: 'XP'  },
  { id: 'nubank',    name: 'Nubank',      color: '#820AD1', abbr: 'NU'  },
  { id: 'inter',     name: 'Inter',       color: '#FF7A00', abbr: 'IN'  },
  { id: 'itau',      name: 'Itaú',        color: '#2C5BA8', abbr: 'IT'  },
  { id: 'bradesco',  name: 'Bradesco',    color: '#CC092F', abbr: 'B'   },
  { id: 'caixa',     name: 'C. Econômica',color: '#005CA9', abbr: 'CE'  },
  { id: 'btg',       name: 'BTG',         color: '#B08030', abbr: 'BTG' },
  { id: 'c6',        name: 'C6 Bank',     color: '#6B6B85', abbr: 'C6'  },
]

export const TIPO_LABELS = {
  'conta-corrente':     'Conta Corrente',
  'conta-investimento': 'Conta Investimento',
  'vale-refeicao':      'Vale Refeição',
  'vale-beneficio':     'Vale Benefício',
  'cartao-credito':     'Cartão de Crédito',
  'outros':             'Outros',
}

export function getBankInfo(bancoId) {
  return BANKS.find(b => b.id === bancoId) || null
}

export function BankLogo({ banco, size = 36, tipo }) {
  const bank = getBankInfo(banco)
  if (bank) {
    return (
      <div style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.28),
        background: bank.color + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: bank.abbr.length > 2 ? Math.round(size * 0.28) : Math.round(size * 0.35),
          fontWeight: 800, color: bank.color,
          letterSpacing: '-0.5px', lineHeight: 1,
          fontFamily: 'system-ui, sans-serif',
        }}>
          {bank.abbr}
        </span>
      </div>
    )
  }
  // Fallback icon
  const Icon = tipo?.includes('cartao') ? CreditCard : Wallet
  return (
    <div style={{
      width: size, height: size,
      borderRadius: Math.round(size * 0.28),
      background: 'var(--bg3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, color: 'var(--text3)',
    }}>
      <Icon size={Math.round(size * 0.5)} />
    </div>
  )
}
