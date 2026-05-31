interface BarDatum {
  label: string
  value: number
  secondary?: number
}

interface BarChartProps {
  data: BarDatum[]
  height?: number
  color?: string
  secondaryColor?: string
  emptyMessage?: string
}

export default function BarChart({
  data,
  height = 120,
  color = '#4f46e5',
  secondaryColor = '#0ea5e9',
  emptyMessage = 'Sem dados',
}: BarChartProps) {
  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-slate-600 text-sm"
      >
        {emptyMessage}
      </div>
    )
  }

  const maxVal = Math.max(...data.map((d) => d.value + (d.secondary ?? 0)), 1)
  const barW   = Math.max(4, Math.floor(600 / data.length) - 2)
  const gap    = 2
  const totalW = data.length * (barW + gap)

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${height + 20}`}
        width="100%"
        style={{ minWidth: Math.min(totalW, 200) }}
      >
        {data.map((d, i) => {
          const x       = i * (barW + gap)
          const mainH   = Math.max(1, Math.round((d.value / maxVal) * height))
          const secH    = d.secondary
            ? Math.max(1, Math.round((d.secondary / maxVal) * height))
            : 0
          const mainY   = height - mainH
          const secY    = height - mainH - secH

          return (
            <g key={i}>
              {d.secondary !== undefined && secH > 0 && (
                <rect x={x} y={secY} width={barW} height={secH} fill={secondaryColor} opacity={0.7} rx={1} />
              )}
              <rect x={x} y={mainY} width={barW} height={mainH} fill={color} rx={1} />
              {barW > 20 && (
                <text
                  x={x + barW / 2}
                  y={height + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#64748b"
                >
                  {d.label.slice(-2)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
