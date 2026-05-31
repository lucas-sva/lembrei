import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Play, BarChart2, LayoutGrid, Sparkles } from 'lucide-react'
import { useDecksStore } from '../stores/decksStore'
import type { Deck } from '../types'
import logoUrl from '../../assets/logo.png'

export default function DecksPage() {
  const navigate = useNavigate()
  const { decks, estatisticas, carregando, carregarDecks, carregarEstatisticas, criarDeck, deletarDeck } =
    useDecksStore()

  const [criando,   setCriando]   = useState(false)
  const [nomeDeck,  setNomeDeck]  = useState('')
  const [descricao, setDescricao] = useState('')
  const [salvando,  setSalvando]  = useState(false)

  useEffect(() => {
    carregarDecks().then(() => {
      decks.forEach((d) => carregarEstatisticas(d.id))
    })
  }, []) // eslint-disable-line

  useEffect(() => {
    decks.forEach((d) => {
      if (!estatisticas[d.id]) carregarEstatisticas(d.id)
    })
  }, [decks]) // eslint-disable-line

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!nomeDeck.trim()) return
    setSalvando(true)
    try {
      const deck = await criarDeck(nomeDeck.trim(), descricao.trim() || undefined)
      setNomeDeck('')
      setDescricao('')
      setCriando(false)
      carregarEstatisticas(deck.id)
    } finally {
      setSalvando(false)
    }
  }

  async function handleDeletar(deck: Deck) {
    if (!confirm(`Deletar o deck "${deck.nome}"? Todos os cartões serão removidos permanentemente.`))
      return
    await deletarDeck(deck.id)
  }

  const totalHoje = Object.values(estatisticas).reduce(
    (s, e) => s + e.paraRevisarHoje + e.novos, 0
  )

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="Lembrei" className="w-8 h-8 rounded-lg object-cover" />
          <h1 className="text-2xl font-bold text-slate-100">Lembrei</h1>
          {totalHoje > 0 && (
            <span className="chip bg-amber-900/60 text-amber-300 border border-amber-700/50 text-xs">
              {totalHoje} p/ hoje
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/estatisticas')}
            className="btn-ghost px-3 py-1.5 text-xs"
            title="Estatísticas"
          >
            <BarChart2 size={15} />
            Stats
          </button>
          <button onClick={() => setCriando(true)} className="btn-primary">
            <Plus size={16} />
            Novo Deck
          </button>
        </div>
      </div>

      {/* Modal de criação */}
      {criando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCriar}
            className="card-surface w-full max-w-md p-6 flex flex-col gap-4"
          >
            <h2 className="text-lg font-semibold text-slate-100">Criar Deck</h2>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Nome *</label>
              <input
                autoFocus
                value={nomeDeck}
                onChange={(e) => setNomeDeck(e.target.value)}
                placeholder="Ex: Infraestrutura de TI"
                className="input-field w-full"
                maxLength={100}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-400 font-medium">Descrição</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Opcional"
                rows={2}
                className="textarea-field"
                maxLength={300}
              />
            </div>

            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={() => { setCriando(false); setNomeDeck(''); setDescricao('') }}
                className="btn-ghost"
              >
                Cancelar
              </button>
              <button type="submit" disabled={!nomeDeck.trim() || salvando} className="btn-primary">
                {salvando ? 'Salvando…' : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Estado vazio */}
      {carregando && (
        <div className="flex items-center justify-center py-16 text-slate-500">
          Carregando…
        </div>
      )}

      {!carregando && decks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500">
          <BookOpen size={40} className="opacity-30" />
          <div className="text-center">
            <p className="text-sm mb-1">Nenhum deck ainda.</p>
            <p className="text-xs text-slate-600">Crie um deck e adicione cartões manualmente ou importe via IA.</p>
          </div>
          <button onClick={() => setCriando(true)} className="btn-primary mt-2">
            <Plus size={14} /> Criar primeiro deck
          </button>
        </div>
      )}

      {/* Lista de decks */}
      <div className="flex flex-col gap-3">
        {decks.map((deck) => {
          const stats        = estatisticas[deck.id]
          const podeRevisar  = (stats?.paraRevisarHoje ?? 0) > 0 || (stats?.novos ?? 0) > 0

          return (
            <div key={deck.id} className="card-surface p-4 flex flex-col gap-3 group hover:border-slate-700 transition-colors">
              {/* Linha principal */}
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-100 truncate">{deck.nome}</h3>
                  {deck.descricao && (
                    <p className="text-xs text-slate-500 truncate mt-0.5">{deck.descricao}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeletar(deck)}
                  className="btn-ghost px-2 py-1 text-rose-700 hover:text-rose-400 opacity-0
                             group-hover:opacity-100 transition-opacity shrink-0"
                  title="Deletar deck"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Stats */}
              {stats && (
                <div className="flex gap-4 text-xs">
                  <Stat label="Total"     valor={stats.totalCartoes}    cor="text-slate-400" />
                  <Stat label="Hoje"      valor={stats.paraRevisarHoje} cor="text-amber-400" />
                  <Stat label="Novos"     valor={stats.novos}           cor="text-sky-400" />
                  <Stat label="Revisão"   valor={stats.emRevisao}       cor="text-emerald-400" />
                  {stats.reaprendendo > 0 && (
                    <Stat label="Reaprendendo" valor={stats.reaprendendo} cor="text-rose-400" />
                  )}
                </div>
              )}

              {/* Ações */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <button
                  onClick={() => navigate(`/painel/${deck.id}`)}
                  className="btn-ghost px-2.5 py-1.5 text-xs"
                  title="Gerenciar cartões"
                >
                  <LayoutGrid size={13} />
                  Painel
                </button>
                <button
                  onClick={() => navigate(`/editor/${deck.id}`)}
                  className="btn-ghost px-2.5 py-1.5 text-xs"
                  title="Adicionar cartão"
                >
                  <Plus size={13} />
                  Cartão
                </button>
                <button
                  onClick={() => navigate(`/importar/${deck.id}`)}
                  className="btn-ghost px-2.5 py-1.5 text-xs"
                  title="Importar via IA"
                >
                  <Sparkles size={13} />
                  Importar IA
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => navigate(`/revisar/${deck.id}`)}
                  disabled={!podeRevisar}
                  className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                  title="Iniciar sessão de revisão"
                >
                  <Play size={13} />
                  {podeRevisar ? `Revisar (${(stats?.paraRevisarHoje ?? 0) + (stats?.novos ?? 0)})` : 'Em dia ✓'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`font-semibold tabular-nums ${cor}`}>{valor}</span>
      <span className="text-slate-600">{label}</span>
    </span>
  )
}
