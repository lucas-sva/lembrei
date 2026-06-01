import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Copy, Check, Download, Sparkles, AlertCircle } from 'lucide-react'
import { api } from '../lib/tauri'
import type { ImportarCartaoInput, CriarAlternativaInput } from '../types'

// ─── Gerador de Prompt ───────────────────────────────────────────────────────

type Banca = 'FCC' | 'CESPE/CEBRASPE' | 'VUNESP' | 'FGV' | 'AOCP' | 'Quadrix'
type Nivel = 'médio' | 'médio-alto' | 'alto'

function gerarPrompt(
  disciplina: string,
  banca: Banca,
  topicos: string,
  quantidade: number,
  nivel: Nivel,
  cargo: string,
): string {
  const descBanca: Record<Banca, string> = {
    'FCC':           '5 alternativas (A–E), questões objetivas com alternativas elaboradas e distratores plausíveis',
    'CESPE/CEBRASPE':'afirmações curtas julgadas como certo/errado; adapte para o formato de múltipla escolha com 5 alternativas (A–E)',
    'VUNESP':        '5 alternativas (A–E), linguagem técnica precisa, foco em aplicação prática',
    'FGV':           '5 alternativas (A–E), questões com cenários de aplicação e raciocínio analítico',
    'AOCP':          '5 alternativas (A–E), texto objetivo, foco em memorização de conceitos técnicos',
    'Quadrix':       '5 alternativas (A–E), linguagem clara, questões baseadas em normas e regulamentos',
  }

  return `Você é um especialista em elaboração de questões para concursos públicos, com domínio profundo na banca ${banca} e nas melhores práticas pedagógicas para avaliações de alto nível técnico.

## Tarefa
Crie exatamente ${quantidade} questão${quantidade > 1 ? 's' : ''} de múltipla escolha sobre os seguintes tópicos:

${topicos.trim()}

## Disciplina
${disciplina || '(não especificado)'}

## Cargo/Concurso (contexto)
${cargo.trim() || 'Analista de Tecnologia da Informação'}

## Banca e formato
${banca}: ${descBanca[banca]}

## Nível de dificuldade
${nivel} — exija raciocínio analítico, não apenas memorização direta

## Requisitos de qualidade obrigatórios
1. Cada questão deve ter EXATAMENTE 5 alternativas: A, B, C, D e E
2. Alternativas com extensão e complexidade similar (sem pistas visuais por tamanho)
3. Distratores técnicos precisos — use confusões reais (ex: IaaS vs PaaS, RPO vs RTO, TCP vs UDP, ITIL vs COBIT)
4. Gabaritos distribuídos entre A, B, C, D, E — não concentre em uma letra
5. Justificativa deve explicar POR QUE a correta está certa E o erro específico de CADA distrator
6. Para TI: cite normas, frameworks e leis pelos nomes técnicos (ISO/IEC 27001:2024, ITIL v4, LGPD, Lei nº 14.133/2021)
7. Sem negrito/itálico no enunciado e alternativas; use-os livremente na justificativa
8. Tags: categorias relevantes como Norma, Framework, Lei, Conceito, Protocolo, etc.

## Formato de saída
Retorne SOMENTE um JSON válido, sem texto antes ou depois, sem markdown code fences:

{
  "cartoes": [
    {
      "enunciado": "Texto completo do enunciado com o comando ao final (ex: '...assinale a alternativa correta.')",
      "alternativas": [
        { "letra": "A", "texto": "...", "correta": false },
        { "letra": "B", "texto": "...", "correta": false },
        { "letra": "C", "texto": "...", "correta": true },
        { "letra": "D", "texto": "...", "correta": false },
        { "letra": "E", "texto": "...", "correta": false }
      ],
      "justificativa": "Alternativa C está correta porque... \\n\\nErros das demais:\\nA - ...\\nB - ...\\nD - ...\\nE - ...",
      "tags": ["Framework", "ITIL"]
    }
  ]
}`
}

// ─── Parser de JSON importado ────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^\S\n]{2,}/g, ' ')   // colapsa espaços horizontais mas preserva \n
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface ParseResult {
  cartoes: ImportarCartaoInput[]
  erros: string[]
}

function parseImportJson(raw: string): ParseResult {
  const erros: string[] = []
  let parsed: unknown

  try {
    // Remove code fences se a IA colocou
    const limpo = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
    parsed = JSON.parse(limpo)
  } catch {
    erros.push('JSON inválido. Verifique a saída da IA.')
    return { cartoes: [], erros }
  }

  const obj = parsed as Record<string, unknown>
  const lista = (() => {
    // Nosso formato: { "cartoes": [...] }
    if (Array.isArray(obj.cartoes)) return obj.cartoes as unknown[]
    // Formato antigo Anki: { "cards": [...] }
    if (Array.isArray(obj.cards))   return obj.cards as unknown[]
    erros.push('Estrutura JSON não reconhecida. Esperado: {"cartoes": [...]}')
    return [] as unknown[]
  })()

  const cartoes: ImportarCartaoInput[] = []

  for (let i = 0; i < lista.length; i++) {
    const item = lista[i] as Record<string, unknown>
    const num  = i + 1

    // Enunciado (nosso formato) ou pergunta (anki)
    const enunciadoRaw = (item.enunciado ?? item.pergunta ?? '') as string
    const enunciado = stripHtml(String(enunciadoRaw)).trim()
    if (!enunciado) { erros.push(`Cartão ${num}: enunciado vazio.`); continue }

    // Alternativas — dois formatos
    let alternativas: CriarAlternativaInput[] = []

    if (Array.isArray(item.alternativas)) {
      // Nosso formato: [{letra, texto, correta}]
      alternativas = (item.alternativas as Record<string, unknown>[]).map((a, j) => ({
        letra:   String(a.letra ?? ''),
        texto:   stripHtml(String(a.texto ?? '')),
        correta: Boolean(a.correta),
        ordem:   j,
      })).filter((a) => a.letra && a.texto)
    } else if (item.alternativas && typeof item.alternativas === 'object') {
      // Formato anki: {"A": "...", "B": "..."}
      const corretalLetra = String(item.correta ?? '')
      const obj2 = item.alternativas as Record<string, string>
      alternativas = Object.entries(obj2).map(([letra, texto], j) => ({
        letra,
        texto:   stripHtml(texto),
        correta: letra === corretalLetra,
        ordem:   j,
      }))
    }

    if (alternativas.length < 2) { erros.push(`Cartão ${num}: menos de 2 alternativas válidas.`); continue }
    if (!alternativas.some((a) => a.correta)) { erros.push(`Cartão ${num}: nenhuma alternativa marcada como correta.`); continue }

    const justRaw = (item.justificativa ?? '') as string
    const justificativa = stripHtml(String(justRaw)).trim() || null

    const tagsRaw = item.tags ?? item.fontes ?? []
    const tags = Array.isArray(tagsRaw)
      ? (tagsRaw as unknown[]).map(String).filter(Boolean)
      : []

    cartoes.push({ enunciado, alternativas, assertivas: [], justificativa, tags })
  }

  if (cartoes.length === 0 && erros.length === 0) {
    erros.push('Nenhum cartão válido encontrado no JSON.')
  }

  return { cartoes, erros }
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ImportarPage() {
  const { deckId } = useParams<{ deckId: string }>()
  const navigate   = useNavigate()

  const [deckNome, setDeckNome] = useState('')
  const [prepId,   setPrepId]   = useState<string | null>(null)
  const [aba,      setAba]      = useState<'prompt' | 'import'>('prompt')

  // Gerador
  const [disciplina, setDisciplina] = useState('')
  const [banca,      setBanca]      = useState<Banca>('FCC')
  const [topicos,    setTopicos]    = useState('')
  const [quantidade, setQuantidade] = useState(5)
  const [nivel,      setNivel]      = useState<Nivel>('alto')
  const [cargo,      setCargo]      = useState('')
  const [prompt,     setPrompt]     = useState('')
  const [copiado,    setCopiado]    = useState(false)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  // Importação
  const [jsonInput,  setJsonInput]  = useState('')
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [importando, setImportando] = useState(false)
  const [importSuccess, setImportSuccess] = useState<number | null>(null)

  useEffect(() => {
    if (!deckId) return
    api.decks.buscar(deckId).then(async (deck) => {
      if (!deck) return
      setDeckNome(deck.nome)
      if (deck.preparacaoId) {
        setPrepId(deck.preparacaoId)
        const prep = await api.preparacoes.buscar(deck.preparacaoId)
        if (prep) {
          if (prep.banca) {
            const bancaValida = ['FCC', 'CESPE/CEBRASPE', 'VUNESP', 'FGV', 'AOCP', 'Quadrix'] as const
            const match = bancaValida.find((b) => b.toLowerCase() === prep.banca!.toLowerCase())
            if (match) setBanca(match)
          }
          if (prep.cargo) setCargo(prep.cargo)
        }
      }
    })
  }, [deckId])

  function handleGerarPrompt() {
    if (!topicos.trim()) return
    setPrompt(gerarPrompt(disciplina, banca, topicos, quantidade, nivel, cargo))
  }

  function handleCopiar() {
    const el = promptRef.current
    if (!el) return
    el.select()
    el.setSelectionRange(0, el.value.length)
    document.execCommand('copy')
    window.getSelection()?.removeAllRanges()
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  function handleValidar() {
    if (!jsonInput.trim()) return
    setParseResult(parseImportJson(jsonInput))
    setImportSuccess(null)
  }

  async function handleImportar() {
    if (!parseResult || parseResult.cartoes.length === 0) return
    setImportando(true)
    try {
      await api.cartoes.importarLote({ deckId: deckId!, cartoes: parseResult.cartoes })
      setImportSuccess(parseResult.cartoes.length)
      setJsonInput('')
      setParseResult(null)
    } catch (e) {
      setParseResult({ cartoes: [], erros: [String(e)] })
    } finally {
      setImportando(false)
    }
  }

  const bancas: Banca[] = ['FCC', 'CESPE/CEBRASPE', 'VUNESP', 'FGV', 'AOCP', 'Quadrix']
  const niveis: Nivel[]  = ['médio', 'médio-alto', 'alto']

  return (
    <div className="min-h-screen bg-slate-950 pb-16">
      <header className="border-b border-slate-800 px-5 py-3 flex items-center gap-3 sticky top-0 bg-slate-950/95 backdrop-blur z-10">
        <button onClick={() => navigate(`/painel/${deckId}`)} className="btn-ghost px-2 py-1.5">
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-slate-200">Importar via IA</h1>
          {deckNome && <p className="text-xs text-slate-500 truncate">{deckNome}</p>}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-5 flex flex-col gap-5">
        {/* Abas */}
        <div className="flex gap-1 bg-slate-900 rounded-lg p-1">
          <button
            onClick={() => setAba('prompt')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
              aba === 'prompt' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles size={14} /> Gerar Prompt
          </button>
          <button
            onClick={() => setAba('import')}
            className={`flex-1 flex items-center justify-center gap-2 rounded-md py-2 text-sm font-medium transition-colors ${
              aba === 'import' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download size={14} /> Importar JSON
          </button>
        </div>

        {/* Aba: Gerar Prompt */}
        {aba === 'prompt' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500">
              Preencha os campos abaixo para gerar um prompt otimizado. Cole-o em qualquer IA (Claude, ChatGPT, etc.) e traga o JSON de volta para importar.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Disciplina">
                <input
                  value={disciplina}
                  onChange={(e) => setDisciplina(e.target.value)}
                  placeholder="Ex: Infraestrutura de TI"
                  className="input-field w-full"
                />
              </Field>
              <Field label="Cargo / Concurso">
                <input
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                  placeholder="Ex: Analista TI – TJ-CE"
                  className="input-field w-full"
                />
              </Field>
            </div>

            <Field label="Tópicos a cobrir *">
              <textarea
                value={topicos}
                onChange={(e) => setTopicos(e.target.value)}
                placeholder={"Ex:\n- Modelo OSI e camadas de rede\n- Diferença entre IaaS, PaaS e SaaS\n- ITIL v4: práticas de gerenciamento de serviços"}
                rows={5}
                className="textarea-field"
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Banca">
                <select value={banca} onChange={(e) => setBanca(e.target.value as Banca)} className="input-field w-full">
                  {bancas.map((b) => <option key={b}>{b}</option>)}
                </select>
              </Field>
              <Field label="Nível">
                <select value={nivel} onChange={(e) => setNivel(e.target.value as Nivel)} className="input-field w-full">
                  {niveis.map((n) => <option key={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Quantidade">
                <select
                  value={quantidade}
                  onChange={(e) => setQuantidade(Number(e.target.value))}
                  className="input-field w-full"
                >
                  {[3, 5, 7, 10, 15].map((n) => <option key={n} value={n}>{n} questões</option>)}
                </select>
              </Field>
            </div>

            <button
              onClick={handleGerarPrompt}
              disabled={!topicos.trim()}
              className="btn-primary"
            >
              <Sparkles size={14} /> Gerar Prompt
            </button>

            {prompt && (
              <div className="flex flex-col gap-3 animate-fade-in">
                <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  Prompt gerado — selecione tudo e copie, ou use o botão
                </label>
                <div className="relative">
                  <textarea
                    ref={promptRef}
                    readOnly
                    value={prompt}
                    rows={14}
                    className="textarea-field text-xs text-slate-300 selecao-permitida pr-3 pb-14"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                  {/* Botão de copiar fixo na parte inferior do textarea */}
                  <button
                    onClick={handleCopiar}
                    className={`absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 ${
                      copiado
                        ? 'bg-emerald-600 text-white'
                        : 'bg-brand-600 hover:bg-brand-700 text-white'
                    }`}
                  >
                    {copiado ? <Check size={14} /> : <Copy size={14} />}
                    {copiado ? 'Copiado!' : 'Copiar prompt'}
                  </button>
                </div>
                <p className="text-xs text-slate-600">
                  Cole no Claude, ChatGPT ou outra IA. Depois volte aqui e importe o JSON retornado.
                </p>
                <button onClick={() => setAba('import')} className="btn-ghost text-xs">
                  Tenho o JSON → Importar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Aba: Importar JSON */}
        {aba === 'import' && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-slate-500">
              Cole aqui o JSON retornado pela IA. O Lembrei aceita o formato nativo ou o formato antigo do add-on Anki.
            </p>

            <Field label="JSON da IA *">
              <textarea
                value={jsonInput}
                onChange={(e) => { setJsonInput(e.target.value); setParseResult(null); setImportSuccess(null) }}
                placeholder={'{\n  "cartoes": [\n    {\n      "enunciado": "...",\n      "alternativas": [...],\n      ...\n    }\n  ]\n}'}
                rows={12}
                className="textarea-field text-xs selecao-permitida"
              />
            </Field>

            {!parseResult && (
              <button
                onClick={handleValidar}
                disabled={!jsonInput.trim()}
                className="btn-ghost"
              >
                Validar JSON
              </button>
            )}

            {/* Resultado da validação */}
            {parseResult && parseResult.erros.length > 0 && (
              <div className="flex flex-col gap-2 rounded-lg bg-rose-950/40 border border-rose-800 p-3 animate-fade-in">
                <div className="flex items-center gap-2 text-rose-300 text-sm font-medium">
                  <AlertCircle size={14} /> Problemas encontrados
                </div>
                {parseResult.erros.map((e, i) => (
                  <p key={i} className="text-xs text-rose-400">{e}</p>
                ))}
              </div>
            )}

            {parseResult && parseResult.cartoes.length > 0 && (
              <div className="flex flex-col gap-3 animate-fade-in">
                <div className="rounded-lg bg-emerald-950/40 border border-emerald-800 px-4 py-3 text-sm text-emerald-300">
                  ✓ {parseResult.cartoes.length === 1 ? '1 cartão válido encontrado.' : `${parseResult.cartoes.length} cartões válidos encontrados.`}
                  {parseResult.erros.length > 0 && (
                    <span className="text-amber-400"> ({parseResult.erros.length} ignorado{parseResult.erros.length > 1 ? 's' : ''})</span>
                  )}
                </div>

                {/* Preview dos cartões */}
                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                  {parseResult.cartoes.map((c, i) => (
                    <div key={i} className="card-surface px-3 py-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500 shrink-0 font-mono">{i + 1}.</span>
                      <p className="text-xs text-slate-300 truncate flex-1">{c.enunciado}</p>
                      <span className="text-xs text-slate-600 shrink-0">{c.alternativas.length} alt.</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleImportar}
                  disabled={importando}
                  className="btn-primary"
                >
                  <Download size={14} />
                  {importando ? 'Importando…' : `Importar ${parseResult.cartoes.length} cartões`}
                </button>
              </div>
            )}

            {importSuccess !== null && (
              <div className="rounded-lg bg-emerald-950/40 border border-emerald-800 px-4 py-3 text-sm text-emerald-300 animate-fade-in">
                ✓ {importSuccess === 1 ? '1 cartão importado' : `${importSuccess} cartões importados`} com sucesso!{' '}
                <button
                  onClick={() => navigate(prepId ? `/preparacao/${prepId}` : '/')}
                  className="underline"
                >
                  Ir para revisão
                </button>
              </div>
            )}
          </div>
        )}
      </div>
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
