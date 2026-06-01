import { useState } from 'react'
import type { CartaoCompleto, Avaliacao, EstadoSrs } from '../types'
import { formatarEnunciado } from '../types'
import MetaTags      from './MetaTags'
import AssertiviaItem from './Assertiva'
import AlternativaItem from './Alternativa'
import BotoesSrs     from './BotoesSrs'

interface CartaoRevisaoProps {
  cartao: CartaoCompleto
  onAvaliar: (avaliacao: Avaliacao) => Promise<EstadoSrs>
  onAvancar: () => void
}

export default function CartaoRevisao({ cartao, onAvaliar, onAvancar }: CartaoRevisaoProps) {
  const [selecionada,  setSelecionada]  = useState<string | null>(null)
  const [eliminadas,   setEliminadas]   = useState<Set<string>>(new Set())
  const [respondeu,    setRespondeu]    = useState(false)
  const [justVisible,  setJustVisible]  = useState(false)
  const [resultado,    setResultado]    = useState<EstadoSrs | null>(null)
  const [avaliando,    setAvaliando]    = useState(false)

  const { cartao: card, alternativas, assertivas, tags } = cartao
  const alternativaCorreta = alternativas.find((a) => a.correta)

  function selecionar(altId: string) {
    if (respondeu || eliminadas.has(altId)) return
    setSelecionada(altId)
    setRespondeu(true)
    setJustVisible(true)
  }

  function eliminar(altId: string) {
    if (respondeu) return
    setEliminadas((prev) => {
      const next = new Set(prev)
      next.has(altId) ? next.delete(altId) : next.add(altId)
      return next
    })
  }

  function estadoAlternativa(alt: typeof alternativas[0]) {
    if (!respondeu) return 'neutro' as const
    if (alt.correta) return 'correta' as const
    if (alt.id === selecionada && !alt.correta) return 'errada' as const
    return 'neutro' as const
  }

  async function handleAvaliar(avaliacao: Avaliacao): Promise<EstadoSrs> {
    setAvaliando(true)
    const estado = await onAvaliar(avaliacao)
    setResultado(estado)
    setAvaliando(false)
    return estado
  }

  const acertou = selecionada === alternativaCorreta?.id

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      {tags.length > 0 && <MetaTags tags={tags} />}

      {/* Enunciado */}
      <div className="card-surface p-5">
        <p className="text-sm font-medium text-slate-200 leading-relaxed selecao-permitida whitespace-pre-wrap">
          {formatarEnunciado(card.enunciado)}
        </p>
      </div>

      {/* Assertivas */}
      {assertivas.length > 0 && (
        <div className="card-surface px-5 py-4 divide-y divide-slate-800/60">
          {assertivas.map((ass) => (
            <AssertiviaItem key={ass.id} assertiva={ass} revelada={respondeu} />
          ))}
        </div>
      )}

      {/* Alternativas */}
      <div className="flex flex-col gap-2">
        {alternativas.map((alt) => (
          <AlternativaItem
            key={alt.id}
            alternativa={alt}
            estado={estadoAlternativa(alt)}
            eliminada={eliminadas.has(alt.id)}
            respondeu={respondeu}
            onSelecionar={() => selecionar(alt.id)}
            onEliminar={() => eliminar(alt.id)}
          />
        ))}
      </div>

      {/* Feedback de acerto/erro */}
      {respondeu && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium animate-fade-in
                      ${acertou
                        ? 'bg-emerald-950/60 border border-emerald-700 text-emerald-300'
                        : 'bg-rose-950/60 border border-rose-700 text-rose-300'}`}
        >
          {acertou
            ? `✓ Correto! Alternativa ${alternativaCorreta?.letra} está certa.`
            : `✗ Incorreto. A alternativa correta é ${alternativaCorreta?.letra}.`}
        </div>
      )}

      {/* Justificativa */}
      {justVisible && card.justificativa && (
        <div className="card-surface p-5 animate-fade-in">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Justificativa
          </p>
          <p className="text-sm text-slate-300 leading-relaxed selecao-permitida whitespace-pre-wrap">
            {card.justificativa}
          </p>
        </div>
      )}

      {respondeu && card.justificativa && !justVisible && (
        <button onClick={() => setJustVisible(true)} className="btn-ghost w-full py-2 text-sm">
          Ver justificativa
        </button>
      )}

      {/* Botões SRS */}
      {respondeu && (
        <div className="animate-slide-up">
          <BotoesSrs
            onAvaliar={handleAvaliar}
            onAvancar={onAvancar}
            carregando={avaliando}
            resultado={resultado}
          />
        </div>
      )}
    </div>
  )
}
