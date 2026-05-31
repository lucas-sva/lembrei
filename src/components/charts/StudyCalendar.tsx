interface DayDatum {
  date: string  // "YYYY-MM-DD"
  count: number
}

interface StudyCalendarProps {
  data: DayDatum[]
  weeks?: number
}

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function StudyCalendar({ data, weeks = 15 }: StudyCalendarProps) {
  const dataMap = new Map(data.map((d) => [d.date, d.count]))
  const maxCount = Math.max(...data.map((d) => d.count), 1)

  const today   = new Date()
  const cells: { date: string; count: number }[] = []

  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    cells.push({ date: key, count: dataMap.get(key) ?? 0 })
  }

  function intensidade(count: number): string {
    if (count === 0) return 'bg-slate-800'
    const pct = count / maxCount
    if (pct < 0.25) return 'bg-brand-900'
    if (pct < 0.5)  return 'bg-brand-700'
    if (pct < 0.75) return 'bg-brand-600'
    return 'bg-brand-400'
  }

  const cols = weeks
  const rows = 7

  return (
    <div className="flex gap-1">
      {/* Labels dos dias da semana */}
      <div className="flex flex-col gap-1 pt-0.5">
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} className="w-3 h-3 flex items-center justify-center text-slate-600" style={{ fontSize: 8 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid de semanas */}
      <div className="flex gap-1">
        {Array.from({ length: cols }).map((_, col) => (
          <div key={col} className="flex flex-col gap-1">
            {Array.from({ length: rows }).map((_, row) => {
              const idx  = col * rows + row
              const cell = cells[idx]
              if (!cell) return <div key={row} className="w-3 h-3" />
              return (
                <div
                  key={row}
                  title={`${cell.date}: ${cell.count} revisões`}
                  className={`w-3 h-3 rounded-sm ${intensidade(cell.count)}`}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
