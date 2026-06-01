import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Plus, Trash2, Play, BarChart2, LayoutGrid, Sparkles,
  ArrowLeft, ChevronRight,
} from 'lucide-react'
import { useDecksStore } from '../stores/decksStore'
import { api } from '../lib/tauri'
import type { Deck, Preparacao } from '../types'

export default function DecksPage() {
  const { prepId }  = useParams<{ prepId: string }>()
  const navigate    = useNavigate()
  const { decks, estatisticas, carregando, carregarDecks, carregarEstatisticas, criarDeck, deletarDeck } =
    useDecksStore()

  const [prep,     setPrep]     = useState<Preparacao | null>(null)
  const [criando,  setCriando]  = useState(false)
  const [nomeDeck, setNomeDeck] = useState('')
  const [descDeck, setDescDeck] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!prepId) return
    api.preparacoes.buscar(prepId).then(setPrep)
    carregarDecks(prepId)
  }, [prepId]) // eslint-disable-line

  useEffect(() => {
    decks.forEach((d) => {
      if (!estatisticas[d.id]) carregarEstatisticas(d.id)
    })
  }, [decks]) // eslint-disable-line

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (!nomeDeck.trim() || !prepId) return
    setSalvando(true)
    try {
      const deck = await criarDeck(nomeDeck.trim(), prepId, descDeck.trim() || undefined)
      setNomeDeck(''); setDescDeck(''); setCriando(false)
      carregarEstatisticas(deck.id)
    } finally {
      setSalvando(false)
    }
  }

  async function handleDeletar(deck: Deck, e: React.MouseEvent) {
    e.stopPropagation()
    if (!prepId) return
    if (!confirm(`Deletar o deck "${deck.nome}"? Todos os cartões serão removidos permanentemente.`)) return
    await deletarDeck(deck.id, prepId)
  }

  const totalHoje = Object.values(estatisticas).reduce(
    (s, e) => s + Number(e.paraRevisarHoje) + Number(e.novos), 0
  )

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      {/* Header */}
      <header className="border-b border-slate-800 px-5 py-3 flex items-center gap-3 sticky top-0 bg-slate-950/95 backdrop-blur z-10">
        <button onClick={() => navigate('/')} className="btn-ghost px-2 py-1.5 shrink-0">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-slate-200 truncate">
            {prep?.nome ?? '…'}
          </h1>
          {(prep?.banca || prep?.cargo) && (
            <p className="text-xs text-slate-500 truncate">
              {[prep.banca, prep.cargo].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button onClick={() => navigate('/estatisticas')} className="btn-ghost px-2.5 py-1.5 text-xs shrink-0">
          <BarChart2 size={13} /> Stats
        </button>
        <button onClick={() => setCriando(true)} className="btn-primary shrink-0">
          <Plus size={15} /> Novo Deck
        </button>
      </header>

      {/* Banner de revisões pendentes */}
      {totalHoje > 0 && (
        <div className="max-w-3xl mx-auto px-5 pt-4">
          <div className="rounded-xl bg-amber-950/40 border border-amber-800/50 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-sm text-amber-300">
              <span className="font-bold">{totalHoje}</span> cartão{totalHoje !== 1 ? 'ões' : ''} aguardando revisão
            </p>
            <ChevronRight size={14} className="text-amber-500 shrink-0" />
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-5 py-5">
        {carregando && (
          <div className="flex items-center justify-center py-16 text-slate-500">Carregando…</div>
        )}

        {!carregando && decks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-500">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <LayoutGrid size={24} className="text-slate-600" />
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400 mb-1">Nenhum deck ainda.</p>
              <p className="text-xs text-slate-600">Crie um deck para organizar seus cartões por disciplina ou tema.</p>
            </div>
            <button onClick={() => setCriando(true)} className="btn-primary mt-1">
              <Plus size={14} /> Criar primeiro deck
            </button>
          </div>
        )}

        {/* Lista de decks */}
        <div className="flex flex-col gap-3">
          {decks.map((deck) => {
            const stats       = estatisticas[deck.id]
            const podeRevisar = (Number(stats?.paraRevisarHoje) ?? 0) > 0 || (Number(stats?.novos) ?? 0) > 0
            const totalPend   = (Number(stats?.paraRevisarHoje) ?? 0) + (Number(stats?.novos) ?? 0)
            const progresso   = stats && Number(stats.totalCartoes) > 0
              ? Math.round((Number(stats.emRevisao) / Number(stats.totalCartoes)) * 100)
              : 0

            return (
              <div
                key={deck.id}
                className="card-surface p-4 flex flex-col gap-3 group hover:border-slate-700 transition-colors"
              >
                {/* Linha principal */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-100 truncate">{deck.nome}</h3>
                      {podeRevisar && (
                        <span className="chip bg-amber-900/60 text-amber-300 border border-amber-700/50 text-xs shrink-0">
                          {totalPend} hoje
                        </span>
                      )}
                    </div>
                    {deck.descricao && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{deck.descricao}</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDeletar(deck, e)}
                    className="btn-ghost px-2 py-1 text-rose-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    title="Deletar deck"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Progresso + stats */}
                {stats ? (
                  <div className="flex flex-col gap-2">
                    {/* Barra de progresso */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 rounded-full transition-all"
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-600 shrink-0 tabular-nums w-8 text-right">{progresso}%</span>
                    </div>
                    {/* Números */}
                    <div className="flex gap-3 text-xs">
                      <Stat label="Total"   valor={Number(stats.totalCartoes)}  cor="text-slate-400" />
                      <Stat label="Novos"   valor={Number(stats.novos)}         cor="text-sky-400" />
                      <Stat label="Revisão" valor={Number(stats.emRevisao)}     cor="text-emerald-400" />
                      {Number(stats.reaprendendo) > 0 && (
                        <Stat label="Lapsos" valor={Number(stats.reaprendendo)} cor="text-rose-400" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-1.5 bg-slate-800 rounded-full animate-pulse" />
                )}

                {/* Ações */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => navigate(`/painel/${deck.id}`)}
                    className="btn-ghost px-2.5 py-1.5 text-xs"
                  >
                    <LayoutGrid size={13} /> Painel
                  </button>
                  <button
                    onClick={() => navigate(`/editor/${deck.id}`)}
                    className="btn-ghost px-2.5 py-1.5 text-xs"
                  >
                    <Plus size={13} /> Cartão
                  </button>
                  <button
                    onClick={() => navigate(`/importar/${deck.id}`)}
                    className="btn-ghost px-2.5 py-1.5 text-xs"
                  >
                    <Sparkles size={13} /> Importar IA
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => navigate(`/revisar/${deck.id}`)}
                    disabled={!podeRevisar}
                    className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    <Play size={13} />
                    {podeRevisar ? `Revisar (${totalPend})` : 'Em dia ✓'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal de criação de deck */}
      {criando && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCriar}
            className="card-surface w-full max-w-md p-6 flex flex-col gap-4 animate-fade-in"
          >
            <h2 className="text-base font-semibold text-slate-100">Criar Deck</h2>

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
                value={descDeck}
                onChange={(e) => setDescDeck(e.target.value)}
                placeholder="Opcional"
                rows={2}
                className="textarea-field"
                maxLength={300}
              />
            </div>

            <div className="flex gap-2 justify-end mt-1">
              <button
                type="button"
                onClick={() => { setCriando(false); setNomeDeck(''); setDescDeck('') }}
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
