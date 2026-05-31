import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Target, BookOpen, Zap } from 'lucide-react'
import { api } from '../lib/tauri'
import type { Deck, EstatisticasDetalhadas } from '../types'
import BarChart from '../components/charts/BarChart'
import DonutChart from '../components/charts/DonutChart'
import StudyCalendar from '../components/charts/StudyCalendar'

export default function EstatisticasPage() {
  const navigate = useNavigate()

  const [decks,      setDecks]      = useState<Deck[]>([])
  const [deckId,     setDeckId]     = useState<string>('')
  const [stats,      setStats]      = useState<EstatisticasDetalhadas | null>(null)
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    api.decks.listar().then((lista) => {
      setDecks(lista)
      if (lista.length > 0) setDeckId(lista[0].id)
    })
  }, [])

  useEffect(() => {
    if (!deckId) return
    setCarregando(true)
    api.revisoes.estatisticasDetalhadas(deckId).then((s) => {
      setStats(s)
      setCarregando(false)
    }).catch(() => setCarregando(false))
  }, [deckId])

  const deckAtual = decks.find((d) => d.id === deckId)

  const segmentosDonut = stats ? [
    { label: 'Novo',         value: stats.distribuicaoEstados.novos,         color: '#475569' },
    { label: 'Aprendendo',   value: stats.distribuicaoEstados.aprendendo,     color: '#0284c7' },
    { label: 'Revisão',      value: stats.distribuicaoEstados.emRevisao,      color: '#059669' },
    { label: 'Reaprendendo', value: stats.distribuicaoEstados.reaprendendo,   color: '#dc2626' },
  ] : []

  // Preenche os 30 dias com zeros para o bar chart
  const barData = (() => {
    if (!stats) return []
    const dias: { label: string; value: number; secondary: number }[] = []
    const hoje  = new Date()
    const mapa  = new Map(stats.revisoesPorDia.map((d) => [d.data, d]))
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje)
      d.setDate(hoje.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const entry = mapa.get(key)
      dias.push({
        label:     key.slice(5),   // "MM-DD"
        value:     entry?.corretas ?? 0,
        secondary: entry ? entry.total - entry.corretas : 0,
      })
    }
    return dias
  })()

  const calendarData = stats?.revisoesPorDia.map((d) => ({ date: d.data, count: d.total })) ?? []

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <header className="border-b border-slate-800 px-5 py-3 flex items-center gap-3 sticky top-0 bg-slate-950 z-10">
        <button onClick={() => navigate('/')} className="btn-ghost px-2 py-1.5">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-sm font-semibold text-slate-200 flex-1">Estatísticas</h1>

        {/* Seletor de deck */}
        {decks.length > 1 && (
          <select
            value={deckId}
            onChange={(e) => setDeckId(e.target.value)}
            className="input-field text-xs py-1 px-2"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </select>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col gap-6">
        {decks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
            <BookOpen size={40} className="opacity-30" />
            <p className="text-sm">Nenhum deck encontrado.</p>
          </div>
        )}

        {deckAtual && (
          <p className="text-xs text-slate-500">{deckAtual.nome}</p>
        )}

        {carregando && (
          <div className="flex justify-center py-16 text-slate-500 text-sm">Calculando…</div>
        )}

        {stats && !carregando && (
          <>
            {/* Métricas principais */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metrica
                icon={<Zap size={16} className="text-amber-400" />}
                label="Recuperabilidade"
                valor={`${(stats.recuperabilidadeMedia * 100).toFixed(0)}%`}
                sub="prob. de lembrar agora"
              />
              <Metrica
                icon={<Target size={16} className="text-emerald-400" />}
                label="Retenção"
                valor={`${(stats.taxaRetencao * 100).toFixed(0)}%`}
                sub="acertos nos últimos 30d"
              />
              <Metrica
                icon={<BookOpen size={16} className="text-sky-400" />}
                label="Total de cartões"
                valor={String(stats.distribuicaoEstados.totalCartoes)}
                sub={`${stats.distribuicaoEstados.paraRevisarHoje} p/ hoje`}
              />
              <Metrica
                icon={<TrendingUp size={16} className="text-brand-400" />}
                label="Revisões"
                valor={String(stats.totalRevisoes)}
                sub="acumuladas"
              />
            </div>

            {/* Distribuição de estados */}
            <Secao titulo="Distribuição de estados">
              <div className="flex items-center gap-6">
                <DonutChart segments={segmentosDonut} size={130} />
                <div className="flex flex-col gap-2">
                  {segmentosDonut.map((s) => (
                    <div key={s.label} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
                      <span className="text-slate-400">{s.label}</span>
                      <span className="font-semibold tabular-nums text-slate-200 ml-auto pl-4">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Secao>

            {/* Atividade — últimos 30 dias */}
            <Secao titulo="Revisões — últimos 30 dias">
              <BarChart
                data={barData}
                height={100}
                color="#059669"
                secondaryColor="#dc2626"
                emptyMessage="Nenhuma revisão ainda neste período."
              />
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600" /> Acertos
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 opacity-70" /> Erros
                </span>
              </div>
            </Secao>

            {/* Calendário de estudos */}
            <Secao titulo="Calendário de estudos">
              <StudyCalendar data={calendarData} weeks={15} />
              <p className="text-xs text-slate-600 mt-2">Intensidade indica número de revisões no dia.</p>
            </Secao>
          </>
        )}
      </div>
    </div>
  )
}

function Metrica({ icon, label, valor, sub }: {
  icon: React.ReactNode
  label: string
  valor: string
  sub: string
}) {
  return (
    <div className="card-surface p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-slate-100 tabular-nums">{valor}</p>
      <p className="text-xs text-slate-600">{sub}</p>
    </div>
  )
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="card-surface p-4 flex flex-col gap-3">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{titulo}</h3>
      {children}
    </div>
  )
}
