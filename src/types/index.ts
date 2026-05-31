// Espelha as structs Rust (serde rename_all = "camelCase")

export interface Deck {
  id: string
  nome: string
  descricao: string | null
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

// ─── Inputs para comandos Tauri ──────────────────────────────────────────────

export interface CriarDeckInput {
  nome: string
  descricao?: string | null
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
