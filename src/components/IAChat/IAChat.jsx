import React, { useState, useRef, useEffect } from 'react'
import { Send, Key, Sparkles, RefreshCw } from 'lucide-react'
import { useStore } from '../../store/useStore.js'
import { fmt } from '../../hooks/useUtils.js'
import { Card, CardTitle, Badge, Input, Button } from '../shared/UI.jsx'

const QUICK_PROMPTS = [
  '💡 Como posso reduzir meus gastos este mês?',
  '📈 Onde devo aportar dinheiro agora?',
  '🎯 Estou no caminho certo para minha reserva de emergência?',
  '🏠 Como acelerar a conquista dos nossos sonhos?',
  '📊 Faça uma análise completa da nossa saúde financeira',
]

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed`}
        style={isUser
          ? { background: 'var(--blue)', color: '#fff', borderRadius: '16px 16px 2px 16px' }
          : { background: 'var(--bg3)', color: 'var(--text)', borderRadius: '16px 16px 16px 2px', border: '1px solid var(--border)' }
        }>
        {!isUser && (
          <div className="text-xs font-semibold tracking-widest mb-2 flex items-center gap-1.5"
            style={{ color: 'var(--text3)' }}>
            <Sparkles size={10} />
            CONSELHEIRO IA
          </div>
        )}
        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
        style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 2px' }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--text3)', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />
        ))}
      </div>
    </div>
  )
}

export default function IAChat() {
  const { apiKey, setApiKey, buildFinancialContext } = useStore()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Olá! 👋 Sou seu conselheiro financeiro pessoal.\n\nAnalisei seus dados financeiros e estou pronto para ajudar com dicas de otimização de gastos, estratégias de investimento e análise da saúde financeira do mês.\n\nInsira sua API Key do Google Gemini acima e pode me perguntar o que quiser!',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyInput, setKeyInput] = useState(apiKey)
  const [keySaved, setKeySaved] = useState(!!apiKey)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const saveKey = () => {
    setApiKey(keyInput.trim())
    setKeySaved(true)
  }

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg = { role: 'user', content: msg }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setLoading(true)

    if (!apiKey || apiKey.length < 10) {
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: '⚠️ Insira sua chave da API do Google Cloud para ativar a IA real. Você pode obter uma gratuitamente no Google Cloud Console.',
        }])
        setLoading(false)
      }, 500)
      return
    }

    const ctx = buildFinancialContext()
    const systemPrompt = `Você é um conselheiro financeiro pessoal especializado em finanças pessoais brasileiras.

Contexto financeiro atual do usuário (JSON):
${JSON.stringify(ctx, null, 2)}

Instruções:
- Responda sempre em português brasileiro, de forma clara, prática e empática
- Baseie suas respostas nos dados reais fornecidos acima
- Dê dicas específicas e acionáveis, não genéricas
- Seja conciso mas completo (máximo 4 parágrafos)
- Use emojis moderadamente para facilitar a leitura
- Quando mencionar valores, use o formato brasileiro (R$ X.XXX,XX)
- Considere sempre os sonhos e metas do casal nas sugestões`

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta2/models/gemini-1.5:generate?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: {
            messages: [
              { author: 'system', content: [{ type: 'text', text: systemPrompt }] },
              { author: 'user', content: [{ type: 'text', text: msg }] },
            ],
          },
          temperature: 0.2,
          max_output_tokens: 512,
        }),
      })

      const data = await response.json()

      const assistantText = data?.candidates?.[0]?.content?.map((item) => item.text || '').join(' ').trim()
        || data?.candidates?.[0]?.content?.find((item) => item.type === 'text')?.text
        || data?.output?.[0]?.content?.[0]?.text
        || ''

      if (assistantText) {
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }])
      } else if (data.error) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `⚠️ Erro da API: ${data.error.message || JSON.stringify(data.error)}\n\nVerifique se sua chave do Google Cloud está correta e se o modelo Gemini está habilitado.`,
        }])
      } else if (!response.ok) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `⚠️ Erro da API: ${response.status} ${response.statusText}\n\nVerifique sua chave do Google Cloud.`,
        }])
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: '⚠️ Não foi possível ler a resposta da IA. Verifique sua chave e tente novamente.',
        }])
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: `⚠️ Erro de conexão: ${err.message}`,
      }])
    } finally {
      setLoading(false)
    }
  }

  const ctx = buildFinancialContext()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Consultoria IA</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>Seu conselheiro financeiro pessoal com IA</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chat (left, wider) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* API Key section */}
          <div className="rounded-2xl border p-4" style={{ background: keySaved && apiKey ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: keySaved && apiKey ? 'var(--green)' : 'var(--amber)' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Key size={13} style={{ color: keySaved && apiKey ? 'var(--green)' : 'var(--amber)' }} />
              <span className="text-xs font-semibold tracking-widest" style={{ color: keySaved && apiKey ? 'var(--green)' : 'var(--amber)' }}>
                {keySaved && apiKey ? 'API KEY CONFIGURADA' : 'CONFIGURAR API KEY'}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setKeySaved(false) }}
                placeholder="Chave da API do Google Cloud"
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none font-mono min-w-0"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button onClick={saveKey}
                className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0"
                style={{ background: keySaved && apiKey ? 'var(--green)' : 'var(--amber)', color: keySaved && apiKey ? '#fff' : '#1a0f00' }}>
                {keySaved && apiKey ? '✓ Salvo' : 'Salvar'}
              </button>
            </div>
            {!apiKey && (
              <div className="text-xs mt-2" style={{ color: 'var(--amber)' }}>
                Obtenha sua chave gratuita no <span className="underline cursor-pointer">Google Cloud Console</span>
              </div>
            )}
          </div>

          {/* Chat */}
          <Card>
            <CardTitle right={
              <button onClick={() => setMessages([messages[0]])}
                className="flex items-center gap-1 text-xs border-0 bg-transparent cursor-pointer"
                style={{ color: 'var(--text3)' }}>
                <RefreshCw size={11} /> Limpar
              </button>
            }>Chat com Conselheiro</CardTitle>

            <div className="flex flex-col gap-3 overflow-y-auto mb-4" style={{ maxHeight: 'min(380px, 60vh)', scrollbarWidth: 'thin' }}>
              {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => sendMessage(p)}
                  disabled={loading}
                  className="text-xs px-2.5 py-1.5 rounded-lg cursor-pointer border transition-colors disabled:opacity-40 flex-shrink-0"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text2)', fontFamily: "'Sora', sans-serif" }}>
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Pergunte sobre seus gastos, investimentos ou metas..."
                disabled={loading}
                className="flex-1 rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors min-w-0"
                style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--text)', fontFamily: "'Sora', sans-serif" }}
              />
              <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer border-0 transition-all disabled:opacity-40 flex-shrink-0"
                style={{ background: 'var(--blue)' }}>
                <Send size={15} color="#fff" />
              </button>
            </div>
          </Card>
        </div>

        {/* Right sidebar: context */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardTitle>Contexto Enviado para IA</CardTitle>
            <div className="flex flex-col gap-3">
              {[
                { label: 'Gustavo – Entradas', val: fmt(ctx.Gustavo.entradas), color: 'var(--green)' },
                { label: 'Gustavo – Saídas', val: fmt(ctx.Gustavo.saidas), color: 'var(--red)' },
                { label: 'Larissa – Entradas', val: fmt(ctx.Larissa.entradas), color: 'var(--green)' },
                { label: 'Larissa – Saídas', val: fmt(ctx.Larissa.saidas), color: 'var(--red)' },
                { label: 'Patrimônio Total', val: fmt(ctx.Gustavo.investimentos.total + ctx.Larissa.investimentos.total), color: 'var(--purple)' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: 'var(--text3)' }}>{label}</span>
                  <span className="text-xs font-semibold font-mono" style={{ color }}>{val}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text3)' }}>SONHOS ({ctx.sonhos_do_casal.length})</div>
              {ctx.sonhos_do_casal.map((s) => (
                <div key={s.nome} className="flex items-center justify-between py-1.5">
                  <span className="text-xs truncate flex-1" style={{ color: 'var(--text2)' }}>{s.nome}</span>
                  <Badge color={s.progresso_pct >= 100 ? 'green' : s.progresso_pct >= 50 ? 'amber' : 'blue'}>
                    {s.progresso_pct}%
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>JSON Completo</CardTitle>
            <pre className="text-xs overflow-x-auto overflow-y-auto"
              style={{ color: 'var(--text3)', fontFamily: "'DM Mono', monospace", whiteSpace: 'pre-wrap', maxHeight: 'min(240px, 40vh)', lineHeight: 1.6 }}>
              {JSON.stringify(ctx, null, 2)}
            </pre>
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
