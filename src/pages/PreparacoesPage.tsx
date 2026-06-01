import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, BarChart2, Pencil, Trash2, BookOpen,
  ChevronRight, Target, Layers, Zap,
} from 'lucide-react'
import { usePreparacoesStore } from '../stores/preparacoesStore'
import { api } from '../lib/tauri'
import type { Preparacao } from '../types'
import logoUrl from '../../assets/logo.png'

// Estatísticas agregadas de uma preparação (soma de todos os decks)
interface StatsPrep {
  total: number
  hoje: number
  decks: number
}

export default function PreparacoesPage() {
  const navigate = useNavigate()
  const { preparacoes, carregando, carregarPreparacoes, criarPreparacao, atualizarPreparacao, deletarPreparacao } =
    usePreparacoesStore()

  const [stats,    setStats]    = useState<Record<string, StatsPrep>>({})
  const [modal,    setModal]    = useState<'criar' | 'editar' | null>(null)
  const [editAlvo, setEditAlvo] = useState<Preparacao | null>(null)

  // Campos do modal
  const [nome,      setNome]      = useState('')
  const [descricao, setDescricao] = useState('')
  const [banca,     setBanca]     = useState('')
  const [cargo,     setCargo]     = useState('')
  const [salvando,  setSalvando]  = useState(false)

  useEffect(() => {
    carregarPreparacoes()
  }, []) // eslint-disable-line

  // Carrega estatísticas de todos os decks de todas as preparações
  useEffect(() => {
    if (preparacoes.length === 0) return
    preparacoes.forEach(async (prep) => {
      const decks = await api.decks.listarDaPreparacao(prep.id)
      if (decks.length === 0) {
        setStats((s) => ({ ...s, [prep.id]: { total: 0, hoje: 0, decks: 0 } }))
        return
      }
      const statsDecks = await Promise.all(decks.map((d) => api.decks.estatisticas(d.id)))
      const agg = statsDecks.reduce<StatsPrep>(
        (acc, s) => ({
          total: acc.total + Number(s.totalCartoes),
          hoje:  acc.hoje  + Number(s.paraRevisarHoje) + Number(s.novos),
          decks: decks.length,
        }),
        { total: 0, hoje: 0, decks: decks.length }
      )
      setStats((s) => ({ ...s, [prep.id]: agg }))
    })
  }, [preparacoes]) // eslint-disable-line

  function abrirCriar() {
    setNome(''); setDescricao(''); setBanca(''); setCargo('')
    setModal('criar')
  }

  function abrirEditar(prep: Preparacao, e: React.MouseEvent) {
    e.stopPropagation()
    setEditAlvo(prep)
    setNome(prep.nome)
    setDescricao(prep.descricao ?? '')
    setBanca(prep.banca ?? '')
    setCargo(prep.cargo ?? '')
    setModal('editar')
  }

  function fecharModal() {
    setModal(null); setEditAlvo(null)
    setNome(''); setDescricao(''); setBanca(''); setCargo('')
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return
    setSalvando(true)
    try {
      if (modal === 'criar') {
        await criarPreparacao(nome.trim(), descricao.trim() || undefined, banca.trim() || undefined, cargo.trim() || undefined)
      } else if (modal === 'editar' && editAlvo) {
        await atualizarPreparacao(editAlvo.id, nome.trim(), descricao.trim() || undefined, banca.trim() || undefined, cargo.trim() || undefined)
      }
      fecharModal()
    } finally {
      setSalvando(false)
    }
  }

  async function handleDeletar(prep: Preparacao, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Excluir "${prep.nome}"? Todos os decks e cartões desta preparação serão removidos permanentemente.`))
      return
    await deletarPreparacao(prep.id)
  }

  const totalHojeGlobal = Object.values(stats).reduce((s, st) => s + st.hoje, 0)

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="px-6 pt-8 pb-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="Lembrei" className="w-9 h-9 rounded-xl object-contain" />
            <div>
              <h1 className="text-xl font-bold text-slate-100 leading-tight">Lembrei</h1>
              <p className="text-xs text-slate-500">Revisão espaçada para concursos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/estatisticas')}
              className="btn-ghost px-3 py-1.5 text-xs"
              title="Estatísticas"
            >
              <BarChart2 size={14} />
              Stats
            </button>
            <button onClick={abrirCriar} className="btn-primary">
              <Plus size={15} />
              Nova Preparação
            </button>
          </div>
        </div>

        {/* Resumo global */}
        {totalHojeGlobal > 0 && (
          <div className="mt-5 rounded-xl bg-amber-950/40 border border-amber-800/50 px-4 py-3 flex items-center gap-3">
            <Zap size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              <span className="font-bold">{totalHojeGlobal}</span> {totalHojeGlobal === 1 ? 'cartão' : 'cartões'} para revisar hoje
            </p>
          </div>
        )}
      </header>

      {/* Conteúdo */}
      <main className="max-w-3xl mx-auto px-6 py-4 pb-16">
        {carregando && (
          <div className="flex items-center justify-center py-20 text-slate-500 text-sm">
            Carregando…
          </div>
        )}

        {/* Estado vazio */}
        {!carregando && preparacoes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
              <BookOpen size={28} className="text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-slate-300 font-semibold mb-1">Nenhuma preparação ainda</p>
              <p className="text-sm text-slate-500 max-w-xs">
                Crie uma preparação para organizar seus decks e cartões por concurso ou área de estudo.
              </p>
            </div>
            <button onClick={abrirCriar} className="btn-primary mt-1">
              <Plus size={15} /> Criar primeira preparação
            </button>
          </div>
        )}

        {/* Lista de preparações */}
        <div className="flex flex-col gap-3">
          {preparacoes.map((prep) => {
            const st = stats[prep.id]
            const temHoje = (st?.hoje ?? 0) > 0

            return (
              <button
                key={prep.id}
                onClick={() => navigate(`/preparacao/${prep.id}`)}
                className="card-surface p-5 text-left flex flex-col gap-3 group hover:border-slate-600
                           hover:bg-slate-800/60 transition-all duration-150 w-full"
              >
                {/* Linha superior: nome + ações */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-slate-100 text-base leading-tight">{prep.nome}</h2>
                      {temHoje && (
                        <span className="chip bg-amber-900/60 text-amber-300 border border-amber-700/50 text-xs">
                          {st.hoje} hoje
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {prep.banca && (
                        <span className="chip bg-brand-900/50 text-brand-400 border border-brand-700/40 text-xs">
                          {prep.banca}
                        </span>
                      )}
                      {prep.cargo && (
                        <span className="text-xs text-slate-500 truncate">{prep.cargo}</span>
                      )}
                    </div>
                    {prep.descricao && (
                      <p className="text-xs text-slate-500 mt-1.5 line-clamp-1">{prep.descricao}</p>
                    )}
                  </div>

                  {/* Ações inline */}
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span
                      role="button"
                      onClick={(e) => abrirEditar(prep, e)}
                      className="btn-ghost px-2 py-1.5 text-xs"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </span>
                    <span
                      role="button"
                      onClick={(e) => handleDeletar(prep, e)}
                      className="btn-ghost px-2 py-1.5 text-xs text-rose-700 hover:text-rose-400"
                      title="Excluir"
                    >
                      <Trash2 size={13} />
                    </span>
                  </div>
                </div>

                {/* Métricas + seta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-xs">
                    {st ? (
                      <>
                        <StatItem icon={<Layers size={12} />} label={`${st.decks} deck${st.decks !== 1 ? 's' : ''}`} />
                        <StatItem icon={<Target size={12} />}  label={`${st.total} cartões`} />
                      </>
                    ) : (
                      <span className="text-slate-600 text-xs">Carregando…</span>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                </div>
              </button>
            )
          })}
        </div>
      </main>

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSalvar}
            className="card-surface w-full max-w-md p-6 flex flex-col gap-4 animate-fade-in"
          >
            <h2 className="text-base font-semibold text-slate-100">
              {modal === 'criar' ? 'Nova Preparação' : 'Editar Preparação'}
            </h2>

            <ModalField label="Nome *">
              <input
                autoFocus
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Analista de TI – TRF-CE 2025"
                className="input-field w-full"
                maxLength={120}
              />
            </ModalField>

            <div className="grid grid-cols-2 gap-3">
              <ModalField label="Banca">
                <input
                  value={banca}
                  onChange={(e) => setBanca(e.target.value)}
                  placeholder="Ex: CESPE, FCC, VUNESP"
                  className="input-field w-full"
                  maxLength={60}
                />
              </ModalField>
              <ModalField label="Cargo / Área">
                <input
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex: Analista TI"
                  className="input-field w-full"
                  maxLength={80}
                />
              </ModalField>
            </div>

            <ModalField label="Descrição">
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Anotações sobre o concurso (opcional)"
                rows={2}
                className="textarea-field"
                maxLength={400}
              />
            </ModalField>

            <div className="flex gap-2 justify-end mt-1">
              <button type="button" onClick={fecharModal} className="btn-ghost">
                Cancelar
              </button>
              <button type="submit" disabled={!nome.trim() || salvando} className="btn-primary">
                {salvando ? 'Salvando…' : modal === 'criar' ? 'Criar' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function StatItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-500">
      {icon}
      <span>{label}</span>
    </span>
  )
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      {children}
    </div>
  )
}
