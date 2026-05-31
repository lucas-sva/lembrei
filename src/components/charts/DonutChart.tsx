interface Segment {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: Segment[]
  size?: number
}

export default function DonutChart({ segments, size = 120 }: DonutChartProps) {
  const total = segments.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center text-slate-600 text-xs"
      >
        Sem dados
      </div>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const r  = size * 0.38
  const ri = size * 0.22

  let cumulative = 0
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((seg) => {
      const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2
      cumulative += seg.value
      const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2

      const x1 = cx + r * Math.cos(startAngle)
      const y1 = cy + r * Math.sin(startAngle)
      const x2 = cx + r * Math.cos(endAngle)
      const y2 = cy + r * Math.sin(endAngle)
      const xi1 = cx + ri * Math.cos(endAngle)
      const yi1 = cy + ri * Math.sin(endAngle)
      const xi2 = cx + ri * Math.cos(startAngle)
      const yi2 = cy + ri * Math.sin(startAngle)

      const largeArc = seg.value / total > 0.5 ? 1 : 0

      const d = [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${xi1} ${yi1}`,
        `A ${ri} ${ri} 0 ${largeArc} 0 ${xi2} ${yi2}`,
        'Z',
      ].join(' ')

      return { d, color: seg.color, seg }
    })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map(({ d, color }, i) => (
        <path key={i} d={d} fill={color} opacity={0.9} />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={11} fill="#94a3b8">
        Total
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#f1f5f9">
        {total}
      </text>
    </svg>
  )
}
