import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Pencil, Trash2, Sparkles, ChevronDown, ChevronUp, Play } from 'lucide-react'
import { api } from '../lib/tauri'
import type { CartaoCompleto, Deck, HistoricoRevisao } from '../types'
import { LABELS_ESTADO, CORES_ESTADO, diasAteRevisao, formatarIntervalo, formatarEnunciado } from '../types'
import LineChart from '../components/charts/LineChart'

type Filtro = 'todos' | 'novo' | 'aprendendo' | 'revisao' | 'reaprendendo'

const FILTROS: { key: Filtro; label: string; cor: string }[] = [
  { key: 'todos',        label: 'Todos',        cor: '' },
  { key: 'novo',         label: 'Novos',        cor: 'text-slate-400' },
  { key: 'aprendendo',   label: 'Aprendendo',   cor: 'text-sky-400' },
  { key: 'revisao',      label: 'Revisão',      cor: 'text-emerald-400' },
  { key: 'reaprendendo', label: 'Reaprendendo', cor: 'text-rose-400' },
]

export default function PainelPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate   = useNavigate()

  const [deck,       setDeck]       = useState<Deck | null>(null)
  const [cartoes,    setCartoes]    = useState<CartaoCompleto[]>([])
  const [carregando, setCarregando] = useState(true)
  const [filtro,     setFiltro]     = useState<Filtro>('todos')
  const [expandido,  setExpandido]  = useState<string | null>(null)
  const [historicos, setHistoricos] = useState<Record<string, HistoricoRevisao[]>>({})

  useEffect(() => {
    if (!deckId) return
    carregarDados()
  }, [deckId]) // eslint-disable-line

  async function carregarDados() {
    setCarregando(true)
    try {
      const [lista, deckData] = await Promise.all([
        api.cartoes.listarDoDeck(deckId!),
        api.decks.buscar(deckId!),
      ])
      setCartoes(lista)
      setDeck(deckData)
    } finally {
      setCarregando(false)
    }
  }

  async function toggleExpandido(cartaoId: string) {
    if (expandido === cartaoId) { setExpandido(null); return }
    setExpandido(cartaoId)
    if (!historicos[cartaoId]) {
      const hist = await api.revisoes.historico(cartaoId)
      setHistoricos((prev) => ({ ...prev, [cartaoId]: hist }))
    }
  }

  async function handleDeletar(cartao: CartaoCompleto) {
    const trecho = cartao.cartao.enunciado.slice(0, 60)
    if (!confirm(`Deletar o cartão "${trecho}…"?`)) return
    await api.cartoes.deletar(cartao.cartao.id)
    setCartoes((prev) => prev.filter((c) => c.cartao.id !== cartao.cartao.id))
    if (expandido === cartao.cartao.id) setExpandido(null)
  }

  const filtrados = cartoes.filter((c) => {
    if (filtro === 'todos') return true
    if (filtro === 'novo')  return !c.srs
    return c.srs?.estado === filtro
  })

  const contagem: Record<Filtro, number> = {
    todos:        cartoes.length,
    novo:         cartoes.filter((c) => !c.srs).length,
    aprendendo:   cartoes.filter((c) => c.srs?.estado === 'aprendendo').length,
    revisao:      cartoes.filter((c) => c.srs?.estado === 'revisao').length,
    reaprendendo: cartoes.filter((c) => c.srs?.estado === 'reaprendendo').length,
  }

  const podeRevisar = (contagem.novo + contagem.aprendendo + contagem.reaprendendo) > 0 ||
    cartoes.some((c) => c.srs && diasAteRevisao(c.srs.proximaRevisao) <= 0)

  const prepId = deck?.preparacaoId

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 px-5 py-3 flex items-center gap-3 sticky top-0 bg-slate-950/95 backdrop-blur z-10">
        <button
          onClick={() => prepId ? navigate(`/preparacao/${prepId}`) : navigate('/')}
          className="btn-ghost px-2 py-1.5"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-slate-200 truncate">{deck?.nome ?? 'Painel'}</h1>
          <p className="text-xs text-slate-500">
            {carregando ? '…' : `${cartoes.length} ${cartoes.length === 1 ? 'cartão' : 'cartões'}`}
          </p>
        </div>
        <button onClick={() => navigate(`/importar/${deckId}`)} className="btn-ghost px-2.5 py-1.5 text-xs">
          <Sparkles size={13} /> Importar IA
        </button>
        <button onClick={() => navigate(`/editor/${deckId}`)} className="btn-primary px-2.5 py-1.5 text-xs">
          <Plus size={13} /> Novo
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-5 flex flex-col gap-4">
        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTROS.map(({ key, label, cor }) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`chip text-xs transition-colors ${
                filtro === key
                  ? 'bg-brand-600 text-white border border-brand-500'
                  : `bg-slate-800 border border-slate-700 hover:text-slate-200 ${cor || 'text-slate-400'}`
              }`}
            >
              {label}
              {contagem[key] > 0 && (
                <span className="ml-1 opacity-60">{contagem[key]}</span>
              )}
            </button>
          ))}

          {podeRevisar && (
            <button
              onClick={() => navigate(`/revisar/${deckId}`)}
              className="btn-primary px-2.5 py-1 text-xs ml-auto"
            >
              <Play size={12} /> Revisar
            </button>
          )}
        </div>

        {carregando && (
          <div className="flex justify-center py-16 text-slate-500 text-sm">Carregando…</div>
        )}

        {!carregando && filtrados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 gap-3 text-slate-500">
            <p className="text-sm">
              {filtro !== 'todos'
                ? `Nenhum cartão com estado "${FILTROS.find((f) => f.key === filtro)?.label}".`
                : 'Nenhum cartão neste deck.'}
            </p>
            {filtro === 'todos' && (
              <button onClick={() => navigate(`/editor/${deckId}`)} className="btn-primary text-xs">
                <Plus size={12} /> Criar primeiro cartão
              </button>
            )}
          </div>
        )}

        {/* Lista de cartões */}
        <div className="flex flex-col gap-2">
          {filtrados.map((c) => {
            const isOpen = expandido === c.cartao.id
            const estado = c.srs ? c.srs.estado : 'novo'
            const dias   = c.srs ? diasAteRevisao(c.srs.proximaRevisao) : null
            const hist   = historicos[c.cartao.id] ?? []
            const venceHoje = dias !== null && dias <= 0

            return (
              <div key={c.cartao.id} className={`card-surface overflow-hidden transition-colors ${venceHoje ? 'border-amber-800/50' : ''}`}>
                {/* Linha principal */}
                <div className="flex items-start gap-3 p-4">
                  <button
                    onClick={() => toggleExpandido(c.cartao.id)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-sm text-slate-200 line-clamp-3 leading-relaxed selecao-permitida whitespace-pre-wrap">
                      {formatarEnunciado(c.cartao.enunciado)}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`chip text-xs ${CORES_ESTADO[estado]}`}>
                        {LABELS_ESTADO[estado]}
                      </span>
                      {dias !== null && (
                        <span className={`text-xs ${venceHoje ? 'text-amber-400' : 'text-slate-500'}`}>
                          {venceHoje ? '⚡ vence hoje' : `↻ ${formatarIntervalo(dias)}`}
                        </span>
                      )}
                      {c.srs && c.srs.lapsos > 0 && (
                        <span className="text-xs text-rose-600">
                          {c.srs.lapsos} lapso{c.srs.lapsos > 1 ? 's' : ''}
                        </span>
                      )}
                      {c.tags.length > 0 && (
                        <span className="text-xs text-slate-600">
                          {c.tags.map((t) => t.nome).join(', ')}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => navigate(`/editor/${deckId}/${c.cartao.id}`)}
                      className="btn-ghost px-2 py-1.5 text-xs"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => handleDeletar(c)}
                      className="btn-ghost px-2 py-1.5 text-xs text-rose-700 hover:text-rose-400"
                      title="Deletar"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onClick={() => toggleExpandido(c.cartao.id)}
                      className="btn-ghost px-2 py-1.5"
                    >
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expansão */}
                {isOpen && (
                  <div className="border-t border-slate-800 px-4 py-4 flex flex-col gap-4 animate-fade-in">
                    {/* Alternativas */}
                    {c.alternativas.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Alternativas</p>
                        {c.alternativas.map((alt) => (
                          <div
                            key={alt.id}
                            className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 ${
                              alt.correta
                                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-900/50'
                                : 'bg-slate-800/40 text-slate-400'
                            }`}
                          >
                            <span className="font-bold shrink-0 w-4">{alt.letra}</span>
                            <span className="selecao-permitida flex-1">{alt.texto}</span>
                            {alt.correta && <span className="shrink-0 text-emerald-400">✓</span>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Justificativa */}
                    {c.cartao.justificativa && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1 font-medium uppercase tracking-wide">Justificativa</p>
                        <p className="text-xs text-slate-400 leading-relaxed selecao-permitida whitespace-pre-wrap">
                          {c.cartao.justificativa}
                        </p>
                      </div>
                    )}

                    {/* Histórico de estabilidade */}
                    {hist.length > 0 && (
                      <div>
                        <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">Progressão da estabilidade</p>
                        <LineChart
                          data={hist.map((h) => ({
                            label: h.revisadoEm.slice(0, 10),
                            value: h.estabilidadeDepois,
                          }))}
                          height={60}
                          color="#4f46e5"
                        />
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-600">
                          <span>{hist.length} revisões</span>
                          <span>Última: {hist[hist.length - 1]?.revisadoEm.slice(0, 10)}</span>
                        </div>
                      </div>
                    )}

                    {hist.length === 0 && c.srs && (
                      <p className="text-xs text-slate-600 italic">Histórico aparece após a primeira revisão.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
