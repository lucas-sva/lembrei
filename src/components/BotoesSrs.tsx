import type { Avaliacao, EstadoSrs } from '../types'
import { LABELS_AVALIACAO, CORES_AVALIACAO, formatarIntervalo, diasAteRevisao } from '../types'
import { ArrowRight } from 'lucide-react'

interface BotoesSrsProps {
  onAvaliar: (avaliacao: Avaliacao) => Promise<EstadoSrs>
  onAvancar: () => void
  carregando: boolean
  resultado: EstadoSrs | null
}

const AVALIACOES: Avaliacao[] = [1, 2, 3, 4]

export default function BotoesSrs({ onAvaliar, onAvancar, carregando, resultado }: BotoesSrsProps) {
  if (resultado) {
    const dias      = diasAteRevisao(resultado.proximaRevisao)
    const intervalo = formatarIntervalo(dias)

    // Descrição amigável do estado de memória baseada na estabilidade
    const memoriaMsg = (() => {
      const s = resultado.estabilidade
      if (resultado.estado === 'reaprendendo') return 'Cartão em recuperação — continue revisando.'
      if (resultado.estado === 'aprendendo')   return 'Cartão em memorização inicial.'
      if (s < 3)   return 'Memória ainda fraca — será revisado em breve.'
      if (s < 14)  return 'Memória em formação — bom progresso!'
      if (s < 60)  return 'Memória consolidada — continue assim!'
      return 'Memória de longo prazo — excelente!'
    })()

    return (
      <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-800/60 border border-slate-700 px-5 py-3 animate-fade-in">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-500">Próxima revisão</span>
          <span className="text-sm font-semibold text-slate-100">{intervalo}</span>
          <span className="text-xs text-slate-500">{memoriaMsg}</span>
        </div>
        <button
          onClick={onAvancar}
          className="btn-primary shrink-0 gap-2"
        >
          Próximo
          <ArrowRight size={14} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-slate-500 text-center mb-1">
        Como foi sua recordação?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {AVALIACOES.map((av) => (
          <button
            key={av}
            onClick={() => onAvaliar(av)}
            disabled={carregando}
            className={`btn text-white text-sm font-semibold py-2.5
                        ${CORES_AVALIACAO[av]}
                        disabled:opacity-40 disabled:cursor-not-allowed
                        transition-all duration-150`}
          >
            {LABELS_AVALIACAO[av]}
          </button>
        ))}
      </div>
    </div>
  )
}
