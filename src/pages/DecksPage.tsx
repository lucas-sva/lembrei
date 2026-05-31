import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Play, Brain } from 'lucide-react'
import { useDecksStore } from '../stores/decksStore'
import type { Deck } from '../types'

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
      await criarDeck(nomeDeck.trim(), descricao.trim() || undefined)
      setNomeDeck('')
      setDescricao('')
      setCriando(false)
    } finally {
      setSalvando(false)
    }
  }

  async function handleDeletar(deck: Deck) {
    if (!confirm(`Deletar o deck "${deck.nome}"? Todos os cartões serão removidos permanentemente.`))
      return
    await deletarDeck(deck.id)
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Brain className="text-brand-500" size={28} />
          <h1 className="text-2xl font-bold text-slate-100">Lembrei</h1>
        </div>
        <button onClick={() => setCriando(true)} className="btn-primary">
          <Plus size={16} />
          Novo Deck
        </button>
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
                placeholder="Ex: Direito Civil"
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-sm text-slate-100 placeholder-slate-500
                           focus:outline-none focus:border-brand-500 transition-colors"
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
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2
                           text-sm text-slate-100 placeholder-slate-500 resize-none
                           focus:outline-none focus:border-brand-500 transition-colors"
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

      {/* Lista de decks */}
      {carregando && (
        <div className="flex items-center justify-center py-16 text-slate-500">
          Carregando…
        </div>
      )}

      {!carregando && decks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
          <BookOpen size={40} className="opacity-30" />
          <p className="text-sm">Nenhum deck ainda. Crie o primeiro!</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {decks.map((deck) => {
          const stats = estatisticas[deck.id]
          return (
            <div key={deck.id} className="card-surface p-5 flex items-center gap-4 group">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-100 truncate">{deck.nome}</h3>
                {deck.descricao && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{deck.descricao}</p>
                )}
                {stats && (
                  <div className="flex gap-3 mt-2">
                    <StatChip label="Total"   valor={stats.totalCartoes}    cor="text-slate-400" />
                    <StatChip label="Hoje"    valor={stats.paraRevisarHoje} cor="text-amber-400" />
                    <StatChip label="Novos"   valor={stats.novos}           cor="text-sky-400" />
                    <StatChip label="Revisão" valor={stats.emRevisao}       cor="text-emerald-400" />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/editor/${deck.id}`)}
                  className="btn-ghost px-3 py-1.5 text-xs"
                  title="Adicionar cartão"
                >
                  <Plus size={14} />
                  Cartão
                </button>
                <button
                  onClick={() => navigate(`/revisar/${deck.id}`)}
                  disabled={stats?.paraRevisarHoje === 0 && stats?.novos === 0}
                  className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                  title="Iniciar sessão de revisão"
                >
                  <Play size={14} />
                  Revisar
                </button>
                <button
                  onClick={() => handleDeletar(deck)}
                  className="btn-ghost px-2 py-1.5 text-rose-600 hover:text-rose-400 opacity-0
                             group-hover:opacity-100 transition-opacity"
                  title="Deletar deck"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatChip({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className={`font-semibold tabular-nums ${cor}`}>{valor}</span>
      <span className="text-slate-600">{label}</span>
    </span>
  )
}
