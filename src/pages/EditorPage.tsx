import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/tauri'
import type { CriarAlternativaInput, CriarAssertiviaInput } from '../types'

const ROMANOS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] as const

interface AltForm {
  letra: string
  texto: string
  correta: boolean
}

interface AssForm {
  numeroRomano: string
  texto: string
  correta: boolean
}

export default function EditorPage() {
  const { deckId, cartaoId } = useParams<{ deckId: string; cartaoId?: string }>()
  const navigate              = useNavigate()
  const editando              = Boolean(cartaoId)

  const [enunciado,     setEnunciado]     = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [tags,          setTags]          = useState<string[]>([])
  const [tagInput,      setTagInput]      = useState('')
  const [salvando,      setSalvando]      = useState(false)
  const [erro,          setErro]          = useState<string | null>(null)
  const [carregando,    setCarregando]    = useState(editando)
  const [prepId,        setPrepId]        = useState<string | null>(null)

  const [alternativas, setAlternativas] = useState<AltForm[]>([
    { letra: 'A', texto: '', correta: false },
    { letra: 'B', texto: '', correta: false },
    { letra: 'C', texto: '', correta: false },
    { letra: 'D', texto: '', correta: false },
    { letra: 'E', texto: '', correta: false },
  ])

  const [assertivas, setAssertivas] = useState<AssForm[]>([])

  useEffect(() => {
    if (!deckId) return
    api.decks.buscar(deckId).then((d) => { if (d) setPrepId(d.preparacaoId) })
  }, [deckId])

  // Carrega dados do cartão existente em modo de edição
  useEffect(() => {
    if (!cartaoId) return
    api.cartoes.buscarCompleto(cartaoId).then((c) => {
      setEnunciado(c.cartao.enunciado)
      setJustificativa(c.cartao.justificativa ?? '')
      setTags(c.tags.map((t) => t.nome))
      if (c.alternativas.length > 0) {
        setAlternativas(
          c.alternativas.map((a) => ({ letra: a.letra, texto: a.texto, correta: a.correta }))
        )
      }
      setAssertivas(
        c.assertivas.map((a) => ({ numeroRomano: a.numeroRomano, texto: a.texto, correta: a.correta }))
      )
      setCarregando(false)
    }).catch((e) => {
      setErro(String(e))
      setCarregando(false)
    })
  }, [cartaoId])

  function adicionarAssertiva() {
    const idx = assertivas.length
    if (idx >= ROMANOS.length) return
    setAssertivas((prev) => [...prev, { numeroRomano: ROMANOS[idx], texto: '', correta: false }])
  }

  function removerAssertiva(idx: number) {
    setAssertivas((prev) =>
      prev.filter((_, i) => i !== idx).map((a, i) => ({ ...a, numeroRomano: ROMANOS[i] }))
    )
  }

  function adicionarTag() {
    const t = tagInput.trim()
    if (!t || tags.includes(t)) return
    setTags((prev) => [...prev, t])
    setTagInput('')
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)

    const altsValidas = alternativas.filter((a) => a.texto.trim())
    const corretas    = altsValidas.filter((a) => a.correta)

    if (!enunciado.trim())         { setErro('O enunciado é obrigatório.'); return }
    if (altsValidas.length < 2)    { setErro('Adicione pelo menos 2 alternativas.'); return }
    if (corretas.length !== 1)     { setErro('Marque exatamente uma alternativa correta.'); return }

    setSalvando(true)
    try {
      const altsInput: CriarAlternativaInput[] = altsValidas.map((a, i) => ({
        letra: a.letra, texto: a.texto.trim(), correta: a.correta, ordem: i,
      }))
      const assInput: CriarAssertiviaInput[] = assertivas
        .filter((a) => a.texto.trim())
        .map((a, i) => ({ numeroRomano: a.numeroRomano, texto: a.texto.trim(), correta: a.correta, ordem: i }))

      if (editando && cartaoId) {
        await api.cartoes.atualizar({
          id: cartaoId,
          enunciado: enunciado.trim(),
          justificativa: justificativa.trim() || null,
          alternativas: altsInput,
          assertivas:   assInput,
          tags,
        })
        navigate(`/painel/${deckId}`)
      } else {
        await api.cartoes.criar({
          deckId: deckId!,
          enunciado: enunciado.trim(),
          justificativa: justificativa.trim() || null,
          alternativas: altsInput,
          assertivas:   assInput,
          tags,
        })
        // Após criar, vai para a lista de decks para poder clicar em Revisar
        navigate(prepId ? `/preparacao/${prepId}` : '/')
      }
    } catch (e) {
      setErro(String(e))
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-500">
        Carregando…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <header className="border-b border-slate-800 px-5 py-3 flex items-center gap-3 sticky top-0 bg-slate-950 z-10">
        <button onClick={() => navigate(-1)} className="btn-ghost px-2 py-1.5">
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-sm font-semibold text-slate-200">
          {editando ? 'Editar Cartão' : 'Novo Cartão'}
        </h1>
      </header>

      <form onSubmit={handleSalvar} className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Enunciado */}
        <Field label="Enunciado *">
          <textarea
            value={enunciado}
            onChange={(e) => setEnunciado(e.target.value)}
            placeholder="Digite o enunciado da questão…"
            rows={4}
            className="textarea-field"
          />
        </Field>

        {/* Assertivas */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">
              Assertivas (I, II, III…)
            </label>
            <button type="button" onClick={adicionarAssertiva} className="btn-ghost text-xs px-2 py-1">
              <Plus size={12} /> Adicionar
            </button>
          </div>
          {assertivas.map((ass, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-xs font-bold text-slate-500 w-8 text-right pt-2.5 shrink-0">
                {ass.numeroRomano}.
              </span>
              <input
                value={ass.texto}
                onChange={(e) => setAssertivas((prev) => prev.map((a, i) => i === idx ? { ...a, texto: e.target.value } : a))}
                placeholder="Texto da assertiva…"
                className="input-field flex-1"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-400 pt-2 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ass.correta}
                  onChange={(e) => setAssertivas((prev) => prev.map((a, i) => i === idx ? { ...a, correta: e.target.checked } : a))}
                  className="accent-emerald-500"
                />
                Correta
              </label>
              <button type="button" onClick={() => removerAssertiva(idx)} className="btn-ghost px-1.5 py-1.5 mt-0.5 text-rose-600">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Alternativas */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Alternativas *
          </label>
          {alternativas.map((alt, idx) => (
            <div key={alt.letra} className="flex items-center gap-2">
              <span
                className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center
                            text-xs font-bold transition-colors
                            ${alt.correta ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
              >
                {alt.letra}
              </span>
              <input
                value={alt.texto}
                onChange={(e) => setAlternativas((prev) => prev.map((a, i) => i === idx ? { ...a, texto: e.target.value } : a))}
                placeholder={`Texto da alternativa ${alt.letra}…`}
                className="input-field flex-1"
              />
              <label className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0 cursor-pointer">
                <input
                  type="radio"
                  name="correta"
                  checked={alt.correta}
                  onChange={() =>
                    setAlternativas((prev) => prev.map((a, i) => ({ ...a, correta: i === idx })))
                  }
                  className="accent-emerald-500"
                />
                Correta
              </label>
            </div>
          ))}
        </div>

        {/* Justificativa */}
        <Field label="Justificativa / Gabarito">
          <textarea
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Explicação detalhada da resposta correta (opcional)…"
            rows={4}
            className="textarea-field"
          />
        </Field>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tags</label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarTag() } }}
              placeholder="Lei, Framework, Norma…"
              className="input-field flex-1"
            />
            <button type="button" onClick={adicionarTag} className="btn-ghost px-3">
              <Plus size={14} />
            </button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                  className="chip bg-brand-900/50 text-brand-400 border border-brand-700/50 hover:bg-rose-950/50 hover:text-rose-400 transition-colors"
                >
                  {t} ×
                </button>
              ))}
            </div>
          )}
        </div>

        {erro && (
          <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-800 rounded-lg px-4 py-2">
            {erro}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="btn-primary">
            {salvando ? 'Salvando…' : editando ? 'Salvar Alterações' : 'Salvar Cartão'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">{label}</label>
      {children}
    </div>
  )
}
