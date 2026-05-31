import type { Assertiva } from '../types'

interface AssertiviaProps {
  assertiva: Assertiva
  revelada: boolean
}

export default function AssertiviaItem({ assertiva, revelada }: AssertiviaProps) {
  const indicadorClasse = revelada
    ? assertiva.correta
      ? 'text-emerald-400'
      : 'text-rose-400'
    : 'text-slate-500'

  return (
    <div className="flex gap-3 py-1.5">
      <span className="shrink-0 w-8 text-sm font-bold text-slate-400 text-right pt-0.5">
        {assertiva.numeroRomano}.
      </span>
      <span className={`text-sm leading-relaxed selecao-permitida ${revelada && !assertiva.correta ? 'text-slate-400' : 'text-slate-200'}`}>
        {assertiva.texto}
      </span>
      {revelada && (
        <span className={`shrink-0 text-xs font-bold pt-0.5 ${indicadorClasse}`}>
          {assertiva.correta ? '✓' : '✗'}
        </span>
      )}
    </div>
  )
}
