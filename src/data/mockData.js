export const MOCK_DATA = {
  eu: {
    nome: 'Gustavo',
    contas: [
      {
        id: 'c1',
        nome: 'VR',
        tipo: 'vale-refeicao',
        saldo: 500.00,
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'c2',
        nome: 'Conta Corrente',
        tipo: 'conta-corrente',
        saldo: 2500.00,
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    ],
    investimentos: {
      reserva: { atual: 0, meta: 10000 },
      previdencia: 0,
      acoes: 0,
      fundos: 0,
      cdi: 0,
    },
    transacoes: [],
  },
  ela: {
    nome: 'Larissa',
    contas: [
      {
        id: 'c3',
        nome: 'VR',
        tipo: 'vale-refeicao',
        saldo: 400.00,
        createdAt: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 'c4',
        nome: 'Conta Corrente',
        tipo: 'conta-corrente',
        saldo: 1800.00,
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    ],
    investimentos: {
      reserva: { atual: 0, meta: 8000 },
      previdencia: 0,
      acoes: 0,
      fundos: 0,
      cdi: 0,
    },
    transacoes: [],
  },
}

export const MOCK_SONHOS = []

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
