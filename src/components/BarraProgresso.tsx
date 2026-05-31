interface BarraProgressoProps {
  atual: number
  total: number
  porcentagem: number
}

export default function BarraProgresso({ atual, total, porcentagem }: BarraProgressoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${porcentagem}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 shrink-0 tabular-nums">
        {atual}/{total}
      </span>
    </div>
  )
}
