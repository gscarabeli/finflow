export const MOCK_DATA = {
  eu: {
    nome: 'Gustavo',
    contas: [
      { id: 'c1', nome: 'Santander', tipo: 'Cartão de Crédito', saldo: 0.00 },
      { id: 'c2', nome: 'Picpay', tipo: 'Conta Corrente', saldo: 0.00 },
      { id: 'c3', nome: 'C6 Bank', tipo: 'Conta Corrente', saldo: 0.00 },
      { id: 'c4', nome: 'Rico', tipo: 'Poupança', saldo: 0.00 },
      { id: 'c5', nome: 'Alelo', tipo: 'Vale Refeição (VR)', saldo: 0.01 },
    ],
    investimentos: {
      reserva: { atual: 0, meta: 30000 },
      previdencia: 0,
      acoes: 0,
      fundos: 0,
      cdi: 0,
    },
    transacoes: [
      // { id: 't1', desc: 'Salário', valor: 6500, tipo: 'entrada', cat: 'Salário', data: '2024-12-01' },
    ],
  },
  ela: {
    nome: 'Larissa',
    contas: [
      { id: 'c6', nome: 'Picpay', tipo: 'Conta Corrente + Cartão de Crédito', saldo: 0.00 },
      { id: 'c7', nome: 'Santander', tipo: 'Cartão de Crédito', saldo: 0.00 }
    ],
    investimentos: {
      reserva: { atual: 0, meta: 20000 },
      previdencia: 0,
      acoes: 0,
      fundos: 0,
      cdi: 0,
    },
    transacoes: [
      // { id: 't13', desc: 'Salário', valor: 4800, tipo: 'entrada', cat: 'Salário', data: '2024-12-01' },
    ],
  },
}

export const MOCK_SONHOS = [
  // {
  //   id: 's1',
  //   nome: 'Casa Própria',
  //   emoji: '🏠',
  //   meta: 600000,
  //   acumulado: 19500,
  //   prazo: '2030-01-01',
  //   cor: '#3b82f6',
  //   prioridade: 1,
  //   notas: 'Entrada de 20% para financiamento. Bairro: Pinheiros ou Vila Madalena.',
  // },
]

export const CAT_COLORS = {
  'Alimentação': '#3b82f6',
  'Transporte': '#a78bfa',
  'Moradia': '#f59e0b',
  'Saúde': '#22c55e',
  'Lazer': '#ef4444',
  'Educação': '#06b6d4',
  'Salário': '#22c55e',
  'Freelance': '#a78bfa',
  'Outros': '#9aa0b8',
}

export const CAT_ICONS = {
  'Alimentação': '🛒',
  'Transporte': '🚗',
  'Moradia': '🏠',
  'Saúde': '💊',
  'Lazer': '🎮',
  'Educação': '📚',
  'Salário': '💼',
  'Freelance': '💻',
  'Outros': '📌',
}

export const CATEGORIAS = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Salário', 'Freelance', 'Outros']
