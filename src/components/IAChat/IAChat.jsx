import React, { useState, useRef, useEffect } from 'react'
import { Send, Key, Sparkles, RefreshCw, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useStore } from '../../store/useStore.js'
import { fmt } from '../../hooks/useUtils.js'
import { Card, CardTitle, Badge } from '../shared/UI.jsx'

// — Modelo Gemini em uso —
const GEMINI_MODEL = 'gemini-2.5-flash'

// — Configurações padrão da IA —
const DEFAULT_CONFIG = {
  temperature: 0.2,
  maxTokens: 2048,
  useEmoji: true,
  verbosity: 'normal',   // 'concise' | 'normal' | 'detailed'
  focus: 'geral',        // 'geral' | 'gastos' | 'investimentos' | 'sonhos'
}

const QUICK_PROMPTS = [
  '💡 Como posso reduzir meus gastos este mês?',
  '📈 Onde devo aportar dinheiro agora?',
  '🎯 Estou no caminho certo para minha reserva de emergência?',
  '🏠 Como acelerar a conquista dos nossos sonhos?',
  '📊 Faça uma análise completa da nossa saúde financeira',
]

// — Monta o system prompt com base nas configs —
function buildSystemPrompt(ctx, config) {
  const verbosityMap = {
    concise: 'Seja muito breve e direto, máximo 2 parágrafos curtos.',
    normal: 'Seja conciso mas completo, máximo 4 parágrafos.',
    detailed: 'Dê uma resposta detalhada e aprofundada, com exemplos e números quando possível.',
  }
  const focusMap = {
    geral: 'Analise todos os aspectos financeiros do usuário.',
    gastos: 'Foque especialmente na análise e otimização dos gastos e despesas.',
    investimentos: 'Foque especialmente em investimentos, rendimentos e patrimônio.',
    sonhos: 'Foque especialmente nas metas e sonhos do casal, dando prioridade a eles.',
  }

  return `Você é um conselheiro financeiro pessoal especializado em finanças pessoais brasileiras.

Contexto financeiro atual do usuário (JSON):
${JSON.stringify(ctx, null, 2)}

Instruções:
- Responda sempre em português brasileiro, de forma clara, prática e empática
- Baseie suas respostas nos dados reais fornecidos acima
- Dê dicas específicas e acionáveis, não genéricas
- ${verbosityMap[config.verbosity]}
- ${config.useEmoji ? 'Use emojis moderadamente para facilitar a leitura.' : 'Não use emojis na resposta.'}
- Quando mencionar valores, use o formato brasileiro (R$ X.XXX,XX)
- ${focusMap[config.focus]}`
}

const mdComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold" style={{ color: 'var(--text)' }}>{children}</strong>,
  em: ({ children }) => <em className="italic" style={{ color: 'var(--text2)' }}>{children}</em>,
  ul: ({ children }) => <ul className="mb-2 pl-4 flex flex-col gap-0.5" style={{ listStyleType: 'disc' }}>{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 pl-4 flex flex-col gap-0.5" style={{ listStyleType: 'decimal' }}>{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => <h1 className="font-bold text-base mb-2 mt-3 first:mt-0" style={{ color: 'var(--text)' }}>{children}</h1>,
  h2: ({ children }) => <h2 className="font-bold text-sm mb-2 mt-3 first:mt-0" style={{ color: 'var(--text)' }}>{children}</h2>,
  h3: ({ children }) => <h3 className="font-semibold text-sm mb-1.5 mt-2 first:mt-0" style={{ color: 'var(--text2)' }}>{children}</h3>,
  code: ({ inline, children }) => inline
    ? <code className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg4)', color: 'var(--cyan)' }}>{children}</code>
    : <pre className="p-3 rounded-xl text-xs font-mono overflow-x-auto my-2" style={{ background: 'var(--bg4)', color: 'var(--cyan)' }}><code>{children}</code></pre>,
  blockquote: ({ children }) => (
    <blockquote className="pl-3 my-2 italic text-xs" style={{ borderLeft: '2px solid var(--blue)', color: 'var(--text3)' }}>{children}</blockquote>
  ),
  hr: () => <hr className="my-3" style={{ borderColor: 'var(--border)' }} />,
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
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
        {isUser
          ? <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          : <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
        }
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

// — Slider com label e valor ao lado —
function ConfigSlider({ label, value, min, max, step, onChange, format }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: 'var(--text3)' }}>{label}</span>
        <span className="text-xs font-semibold font-mono" style={{ color: 'var(--blue)' }}>
          {format ? format(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full outline-none cursor-pointer appearance-none"
        style={{ accentColor: 'var(--blue)', background: 'var(--bg3)' }}
      />
      <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--text3)' }}>
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  )
}

// — Toggle on/off —
function ConfigToggle({ label, description, value, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div>
        <div className="text-xs font-medium" style={{ color: 'var(--text2)' }}>{label}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: 'var(--text3)' }}>{description}</div>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="flex-shrink-0 w-10 h-5 rounded-full relative transition-colors cursor-pointer border-0"
        style={{ background: value ? 'var(--blue)' : 'var(--bg4)' }}>
        <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
          style={{ left: value ? '22px' : '2px' }} />
      </button>
    </div>
  )
}

// — Grupo de botões de opção —
function ConfigOptions({ label, value, options, onChange }) {
  return (
    <div className="mb-4">
      <div className="text-xs mb-2" style={{ color: 'var(--text3)' }}>{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button key={opt.value} onClick={() => onChange(opt.value)}
            className="text-xs px-3 py-1.5 rounded-lg cursor-pointer border transition-colors"
            style={{
              background: value === opt.value ? 'var(--blue-bg)' : 'var(--bg3)',
              borderColor: value === opt.value ? 'var(--blue)' : 'var(--border)',
              color: value === opt.value ? 'var(--blue)' : 'var(--text3)',
              fontFamily: "'Sora', sans-serif",
            }}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function IAChat() {
  const { apiKey, setApiKey, buildFinancialContext } = useStore()
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: 'Olá! 👋 Sou seu conselheiro financeiro pessoal.\n\nAnalisei seus dados financeiros e estou pronto para ajudar com dicas de otimização de gastos, estratégias de investimento e análise da saúde financeira do mês.\n\nInsira sua API Key do Google AI Studio acima e pode me perguntar o que quiser!',
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [keyInput, setKeyInput] = useState(apiKey)
  const [keySaved, setKeySaved] = useState(!!apiKey)
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [configOpen, setConfigOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const updateConfig = (key, value) => setConfig((prev) => ({ ...prev, [key]: value }))

  const saveKey = () => {
    setApiKey(keyInput.trim())
    setKeySaved(true)
  }

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    if (!apiKey || apiKey.length < 10) {
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: '⚠️ Insira sua chave da API do Google AI Studio para ativar a IA. Você pode obter uma gratuitamente em aistudio.google.com',
        }])
        setLoading(false)
      }, 500)
      return
    }

    const ctx = buildFinancialContext()
    const systemPrompt = buildSystemPrompt(ctx, config)

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: msg }] }],
            generationConfig: {
              temperature: config.temperature,
              maxOutputTokens: config.maxTokens,
            },
          }),
        }
      )

      const data = await response.json()

      if (data.error) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `⚠️ Erro da API: ${data.error.message}\n\nVerifique se sua chave do Google AI Studio está correta.`,
        }])
        return
      }

      const assistantText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: assistantText || '⚠️ Não foi possível ler a resposta da IA. Tente novamente.',
      }])
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

        {/* ── Coluna principal: API Key + Chat ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* API Key */}
          <div className="rounded-2xl border p-4"
            style={{ background: keySaved && apiKey ? 'var(--green-bg)' : 'var(--amber-bg)', borderColor: keySaved && apiKey ? 'var(--green)' : 'var(--amber)' }}>
            <div className="flex items-center gap-2 mb-2.5">
              <Key size={13} style={{ color: keySaved && apiKey ? 'var(--green)' : 'var(--amber)' }} />
              <span className="text-xs font-semibold tracking-widest"
                style={{ color: keySaved && apiKey ? 'var(--green)' : 'var(--amber)' }}>
                {keySaved && apiKey ? 'API KEY CONFIGURADA' : 'CONFIGURAR API KEY'}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => { setKeyInput(e.target.value); setKeySaved(false) }}
                placeholder="Chave da API do Google AI Studio (AIza...)"
                onKeyDown={(e) => e.key === 'Enter' && saveKey()}
                className="flex-1 rounded-xl border px-3 py-2 text-xs outline-none font-mono min-w-0"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text)' }}
              />
              <button onClick={saveKey}
                className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border-0 flex-shrink-0"
                style={{ background: keySaved && apiKey ? 'var(--green)' : 'var(--amber)', color: keySaved && apiKey ? '#fff' : '#1a0f00' }}>
                {keySaved && apiKey ? '✓ Salvo' : 'Salvar'}
              </button>
            </div>
            {!apiKey && (
              <div className="text-xs mt-2" style={{ color: 'var(--amber)' }}>
                Obtenha sua chave gratuita em{' '}
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline">
                  aistudio.google.com/apikey
                </a>
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

            <div className="flex flex-col gap-3 overflow-y-auto mb-4"
              style={{ maxHeight: 'min(380px, 60vh)', scrollbarWidth: 'thin' }}>
              {messages.map((m, i) => <MessageBubble key={i} msg={m} />)}
              {loading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick prompts */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_PROMPTS.map((p) => (
                <button key={p} onClick={() => sendMessage(p)} disabled={loading}
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

        {/* ── Sidebar direita: Configurações + Contexto ── */}
        <div className="flex flex-col gap-4">

          {/* Configurações da IA */}
          <Card>
            <button
              onClick={() => setConfigOpen((v) => !v)}
              className="w-full flex items-center justify-between bg-transparent border-0 cursor-pointer p-0"
            >
              <div className="flex items-center gap-2">
                <Settings size={13} style={{ color: 'var(--text3)' }} />
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
                  Configurações da IA
                </span>
              </div>
              {configOpen
                ? <ChevronUp size={13} style={{ color: 'var(--text3)' }} />
                : <ChevronDown size={13} style={{ color: 'var(--text3)' }} />}
            </button>

            {configOpen && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>

                <ConfigSlider
                  label="Temperatura"
                  value={config.temperature}
                  min={0} max={1} step={0.1}
                  onChange={(v) => updateConfig('temperature', v)}
                  format={(v) => {
                    if (v <= 0.2) return `${v} (preciso)`
                    if (v >= 0.8) return `${v} (criativo)`
                    return `${v} (balanceado)`
                  }}
                />

                <ConfigSlider
                  label="Máx. de tokens"
                  value={config.maxTokens}
                  min={256} max={4096} step={256}
                  onChange={(v) => updateConfig('maxTokens', v)}
                  format={(v) => `${v} tok`}
                />

                <ConfigOptions
                  label="Tamanho da resposta"
                  value={config.verbosity}
                  onChange={(v) => updateConfig('verbosity', v)}
                  options={[
                    { value: 'concise', label: '⚡ Breve' },
                    { value: 'normal', label: '📝 Normal' },
                    { value: 'detailed', label: '📚 Detalhado' },
                  ]}
                />

                <ConfigOptions
                  label="Foco da análise"
                  value={config.focus}
                  onChange={(v) => updateConfig('focus', v)}
                  options={[
                    { value: 'geral', label: '🌐 Geral' },
                    { value: 'gastos', label: '💸 Gastos' },
                    { value: 'investimentos', label: '📈 Investimentos' },
                    { value: 'sonhos', label: '🎯 Sonhos' },
                  ]}
                />

                <ConfigToggle
                  label="Usar emojis"
                  description="Emojis nas respostas da IA"
                  value={config.useEmoji}
                  onChange={(v) => updateConfig('useEmoji', v)}
                />

                <button
                  onClick={() => setConfig(DEFAULT_CONFIG)}
                  className="w-full text-xs py-2 rounded-xl border cursor-pointer transition-colors"
                  style={{ background: 'transparent', borderColor: 'var(--border)', color: 'var(--text3)', fontFamily: "'Sora', sans-serif" }}>
                  Restaurar padrões
                </button>
              </div>
            )}
          </Card>

          {/* Contexto enviado para a IA */}
          <Card>
            <button
              onClick={() => setContextOpen((v) => !v)}
              className="w-full flex items-center justify-between bg-transparent border-0 cursor-pointer p-0"
            >
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--text3)' }}>
                Contexto Enviado para IA
              </span>
              {contextOpen
                ? <ChevronUp size={13} style={{ color: 'var(--text3)' }} />
                : <ChevronDown size={13} style={{ color: 'var(--text3)' }} />}
            </button>

            {contextOpen && (
              <>
                <div className="flex flex-col gap-3 mt-4">
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
                  <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text3)' }}>
                    SONHOS ({ctx.sonhos_do_casal.length})
                  </div>
                  {ctx.sonhos_do_casal.map((s) => (
                    <div key={s.nome} className="flex items-center justify-between py-1.5">
                      <span className="text-xs truncate flex-1" style={{ color: 'var(--text2)' }}>{s.nome}</span>
                      <Badge color={s.progresso_pct >= 100 ? 'green' : s.progresso_pct >= 50 ? 'amber' : 'blue'}>
                        {s.progresso_pct}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* JSON completo */}
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