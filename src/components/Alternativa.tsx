import type { Alternativa } from '../types'

type EstadoAlternativa = 'neutro' | 'correta' | 'errada' | 'eliminada'

interface AlternativaProps {
  alternativa: Alternativa
  estado: EstadoAlternativa
  eliminada: boolean
  respondeu: boolean
  onSelecionar: () => void
  onEliminar: () => void
}

export default function AlternativaItem({
  alternativa,
  estado,
  eliminada,
  respondeu,
  onSelecionar,
  onEliminar,
}: AlternativaProps) {
  const baseClasses = 'relative flex items-start gap-3 rounded-lg border px-4 py-3 transition-all duration-200'

  const estiloEstado: Record<EstadoAlternativa, string> = {
    neutro:    'border-slate-700 bg-slate-900 hover:border-brand-500 hover:bg-slate-800 cursor-pointer',
    correta:   'border-emerald-500 bg-emerald-950/50 cursor-default',
    errada:    'border-rose-500 bg-rose-950/50 cursor-default',
    eliminada: 'border-slate-800 bg-slate-900/50 opacity-50 cursor-default',
  }

  const letraEstado: Record<EstadoAlternativa, string> = {
    neutro:    'bg-slate-800 text-slate-300 border-slate-700',
    correta:   'bg-emerald-600 text-white border-emerald-500',
    errada:    'bg-rose-700 text-white border-rose-600',
    eliminada: 'bg-slate-800 text-slate-500 border-slate-700',
  }

  // Após responder, a alternativa correta SEMPRE aparece verde, mesmo se foi eliminada
  const revelarCorreta = respondeu && estado === 'correta'

  const classeAtual = revelarCorreta
    ? estiloEstado.correta
    : eliminada
    ? estiloEstado.eliminada
    : estiloEstado[estado]

  return (
    <div className={`${baseClasses} ${classeAtual}`}>
      {/* Botão tesoura (visível apenas antes de responder) */}
      {!respondeu && (
        <button
          onClick={(e) => { e.stopPropagation(); onEliminar() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md
                     text-slate-600 hover:text-rose-400 hover:bg-slate-800
                     transition-colors duration-150"
          title="Eliminar alternativa"
          aria-label={`Eliminar alternativa ${alternativa.letra}`}
        >
          {/* Ícone tesoura via SVG inline */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="6"  cy="6"  r="3"/>
            <circle cx="6"  cy="18" r="3"/>
            <line x1="20" y1="4"  x2="8.12" y2="15.88"/>
            <line x1="14.47" y1="14.48" x2="20" y2="20"/>
            <line x1="8.12" y1="8.12" x2="12" y2="12"/>
          </svg>
        </button>
      )}

      {/* Indicador de certo/errado após resposta */}
      {respondeu && estado !== 'neutro' && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold">
          {estado === 'correta' ? '✓' : estado === 'errada' ? '✗' : ''}
        </span>
      )}

      {/* Letra da alternativa */}
      <button
        onClick={!respondeu && !eliminada ? onSelecionar : undefined}
        disabled={respondeu || eliminada}
        className="w-full flex items-start gap-3 text-left"
      >
        <span
          className={`shrink-0 w-7 h-7 rounded-full border flex items-center
                      justify-center text-xs font-bold ${letraEstado[revelarCorreta ? 'correta' : (eliminada ? 'eliminada' : estado)]}`}
        >
          {alternativa.letra}
        </span>

        <span
          className={`text-sm leading-relaxed pt-0.5 pr-6 selecao-permitida
                      ${eliminada ? 'line-through text-slate-500' : 'text-slate-200'}`}
        >
          {alternativa.texto}
        </span>
      </button>
    </div>
  )
}
