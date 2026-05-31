interface LineDatum {
  label: string
  value: number
}

interface LineChartProps {
  data: LineDatum[]
  height?: number
  color?: string
  emptyMessage?: string
}

export default function LineChart({
  data,
  height = 80,
  color = '#4f46e5',
  emptyMessage = 'Sem histórico',
}: LineChartProps) {
  if (data.length < 2) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center text-slate-600 text-xs"
      >
        {data.length === 1 ? '1 revisão — adicione mais para ver a curva' : emptyMessage}
      </div>
    )
  }

  const W      = 300
  const H      = height
  const pad    = 8
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const minVal = Math.min(...data.map((d) => d.value), 0)
  const range  = maxVal - minVal || 1

  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2)
    const y = H - pad - ((d.value - minVal) / range) * (H - pad * 2)
    return [x, y] as [number, number]
  })

  const polyline = points.map(([x, y]) => `${x},${y}`).join(' ')

  const area = [
    `M ${points[0][0]},${H - pad}`,
    ...points.map(([x, y]) => `L ${x},${y}`),
    `L ${points[points.length - 1][0]},${H - pad}`,
    'Z',
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ height }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#lineGrad)" />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={color} />
      ))}
    </svg>
  )
}
