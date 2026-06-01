// Espelha as structs Rust (serde rename_all = "camelCase")

export interface Preparacao {
  id: string
  nome: string
  descricao: string | null
  banca: string | null
  cargo: string | null
  criadoEm: string
  atualizadoEm: string
}

export interface Deck {
  id: string
  nome: string
  descricao: string | null
  preparacaoId: string | null
  criadoEm: string
  atualizadoEm: string
}

export interface Cartao {
  id: string
  deckId: string
  enunciado: string
  justificativa: string | null
  criadoEm: string
  atualizadoEm: string
}

export interface Alternativa {
  id: string
  cartaoId: string
  letra: string
  texto: string
  correta: boolean
  ordem: number
}

export interface Assertiva {
  id: string
  cartaoId: string
  numeroRomano: string
  texto: string
  correta: boolean
  ordem: number
}

export interface Tag {
  id: string
  nome: string
  cor: string
}

export interface EstadoSrs {
  cartaoId: string
  estado: 'novo' | 'aprendendo' | 'revisao' | 'reaprendendo'
  estabilidade: number
  dificuldade: number
  ultimaRevisao: string | null
  proximaRevisao: string
  lapsos: number
  repeticoes: number
}

export interface CartaoCompleto {
  cartao: Cartao
  alternativas: Alternativa[]
  assertivas: Assertiva[]
  tags: Tag[]
  srs: EstadoSrs | null
}

export interface EstatisticasDeck {
  totalCartoes: number
  paraRevisarHoje: number
  novos: number
  aprendendo: number
  emRevisao: number
  reaprendendo: number
}

export interface HistoricoRevisao {
  id: string
  cartaoId: string
  avaliacao: number
  estabilidadeAntes: number
  estabilidadeDepois: number
  dificuldadeDepois: number
  intervaloDias: number
  revisadoEm: string
}

export interface RevisoesDia {
  data: string
  total: number
  corretas: number
}

export interface EstatisticasDetalhadas {
  totalRevisoes: number
  taxaRetencao: number
  recuperabilidadeMedia: number
  revisoesPorDia: RevisoesDia[]
  distribuicaoEstados: EstatisticasDeck
}

// ─── Inputs para comandos Tauri ──────────────────────────────────────────────

export interface CriarPreparacaoInput {
  nome: string
  descricao?: string | null
  banca?: string | null
  cargo?: string | null
}

export interface AtualizarPreparacaoInput {
  id: string
  nome: string
  descricao?: string | null
  banca?: string | null
  cargo?: string | null
}

export interface CriarDeckInput {
  nome: string
  descricao?: string | null
  preparacaoId?: string | null
}

export interface AtualizarDeckInput {
  id: string
  nome: string
  descricao?: string | null
}

export interface CriarAlternativaInput {
  letra: string
  texto: string
  correta: boolean
  ordem: number
}

export interface CriarAssertiviaInput {
  numeroRomano: string
  texto: string
  correta: boolean
  ordem: number
}

export interface CriarCartaoInput {
  deckId: string
  enunciado: string
  justificativa?: string | null
  alternativas: CriarAlternativaInput[]
  assertivas: CriarAssertiviaInput[]
  tags: string[]
}

export interface AtualizarCartaoInput {
  id: string
  enunciado: string
  justificativa?: string | null
  alternativas: CriarAlternativaInput[]
  assertivas: CriarAssertiviaInput[]
  tags: string[]
}

export interface ImportarCartaoInput {
  enunciado: string
  justificativa?: string | null
  alternativas: CriarAlternativaInput[]
  assertivas: CriarAssertiviaInput[]
  tags: string[]
}

export interface ImportarLoteInput {
  deckId: string
  cartoes: ImportarCartaoInput[]
}

export interface RegistrarRevisaoInput {
  cartaoId: string
  avaliacao: 1 | 2 | 3 | 4
}

// ─── Utilitários ─────────────────────────────────────────────────────────────

export type Avaliacao = 1 | 2 | 3 | 4

export const LABELS_AVALIACAO: Record<Avaliacao, string> = {
  1: 'Esqueci',
  2: 'Difícil',
  3: 'Bom',
  4: 'Fácil',
}

export const CORES_AVALIACAO: Record<Avaliacao, string> = {
  1: 'bg-rose-600 hover:bg-rose-700',
  2: 'bg-amber-600 hover:bg-amber-700',
  3: 'bg-sky-600 hover:bg-sky-700',
  4: 'bg-emerald-600 hover:bg-emerald-700',
}

export const LABELS_ESTADO: Record<string, string> = {
  novo:         'Novo',
  aprendendo:   'Aprendendo',
  revisao:      'Revisão',
  reaprendendo: 'Reaprendendo',
}

export const CORES_ESTADO: Record<string, string> = {
  novo:         'bg-slate-700 text-slate-300',
  aprendendo:   'bg-sky-900/60 text-sky-300',
  revisao:      'bg-emerald-900/60 text-emerald-300',
  reaprendendo: 'bg-rose-900/60 text-rose-300',
}

// Insere \n antes de itens romanos (I. II. III. etc.) embutidos no enunciado
// Ex: "...considere: I. texto A. II. texto B." → "...considere:\nI. texto A.\nII. texto B."
export function formatarEnunciado(texto: string): string {
  if (/\n[IVX]+\./.test(texto)) return texto  // já formatado
  return texto.replace(
    /([.:]) ((?:I{1,3}|IV|VI{0,3})\.) ([A-ZÁÉÍÓÚÀÈÌÒÙÃÕÂÊÎÔÛÇ])/g,
    '$1\n$2 $3'
  )
}

export function diasAteRevisao(proximaRevisao: string): number {
  const proxima = new Date(proximaRevisao)
  const agora   = new Date()
  return Math.ceil((proxima.getTime() - agora.getTime()) / 86_400_000)
}

export function formatarIntervalo(dias: number): string {
  if (dias <= 0)  return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias < 7)   return `em ${dias} dias`
  if (dias < 14)  return 'em 1 semana'
  if (dias < 30)  return `em ${Math.round(dias / 7)} semanas`
  if (dias < 60)  return 'em 1 mês'
  return `em ${Math.round(dias / 30)} meses`
}
