import type { Avaliacao } from '../types'
import { LABELS_AVALIACAO, CORES_AVALIACAO } from '../types'

interface BotoesSrsProps {
  onAvaliar: (avaliacao: Avaliacao) => void
  carregando: boolean
}

const AVALIACOES: Avaliacao[] = [1, 2, 3, 4]

export default function BotoesSrs({ onAvaliar, carregando }: BotoesSrsProps) {
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
