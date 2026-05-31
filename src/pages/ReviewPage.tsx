import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, PartyPopper } from 'lucide-react'
import { useRevisaoStore } from '../stores/revisaoStore'
import CartaoRevisao from '../components/CartaoRevisao'
import BarraProgresso from '../components/BarraProgresso'
import type { Avaliacao, EstadoSrs } from '../types'

export default function ReviewPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate   = useNavigate()

  const {
    iniciarSessao,
    responder,
    avancar,
    cartaoAtual,
    progresso,
    encerrada,
    totalSessao,
    indiceAtual,
    carregando,
    erro,
  } = useRevisaoStore()

  useEffect(() => {
    if (deckId) iniciarSessao(deckId)
  }, [deckId]) // eslint-disable-line

  async function handleAvaliar(avaliacao: Avaliacao): Promise<EstadoSrs> {
    const cartao = cartaoAtual()
    if (!cartao) throw new Error('Sem cartão ativo')
    return await responder(cartao.cartao.id, avaliacao)
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        Carregando sessão…
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 p-6">
        <p className="text-rose-400 text-sm text-center">{erro}</p>
        <button onClick={() => navigate('/')} className="btn-ghost">Voltar</button>
      </div>
    )
  }

  if (encerrada()) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 p-6">
        <PartyPopper size={48} className="text-brand-500" />
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-100 mb-1">Sessão concluída!</h2>
          <p className="text-slate-400 text-sm">
            {totalSessao} {totalSessao === 1 ? 'cartão revisado' : 'cartões revisados'} com sucesso.
          </p>
        </div>
        <button onClick={() => navigate('/')} className="btn-primary">
          Voltar aos Decks
        </button>
      </div>
    )
  }

  const cartao = cartaoAtual()
  if (!cartao) return null

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="border-b border-slate-800 px-5 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => navigate('/')} className="btn-ghost px-2 py-1.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1">
          <BarraProgresso
            atual={indiceAtual}
            total={totalSessao}
            porcentagem={progresso()}
          />
        </div>
        <span className="text-xs text-slate-500 shrink-0">
          {totalSessao - indiceAtual} restantes
        </span>
      </header>

      <main className="flex-1 overflow-y-auto px-5 py-6 max-w-2xl mx-auto w-full">
        <CartaoRevisao
          key={cartao.cartao.id}
          cartao={cartao}
          onAvaliar={handleAvaliar}
          onAvancar={avancar}
        />
      </main>
    </div>
  )
}
