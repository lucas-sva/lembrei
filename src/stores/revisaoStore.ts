import { create } from 'zustand'
import type { CartaoCompleto, Avaliacao, EstadoSrs } from '../types'
import { api } from '../lib/tauri'

interface RevisaoState {
  fila: CartaoCompleto[]
  indiceAtual: number
  totalSessao: number
  revisadosNaSessao: number
  ultimoEstadoSrs: EstadoSrs | null
  carregando: boolean
  erro: string | null

  iniciarSessao: (deckId: string) => Promise<void>
  responder:     (cartaoId: string, avaliacao: Avaliacao) => Promise<EstadoSrs>
  avancar:       () => void
  cartaoAtual:   () => CartaoCompleto | null
  progresso:     () => number
  encerrada:     () => boolean
}

export const useRevisaoStore = create<RevisaoState>((set, get) => ({
  fila:               [],
  indiceAtual:        0,
  totalSessao:        0,
  revisadosNaSessao:  0,
  ultimoEstadoSrs:    null,
  carregando:         false,
  erro:               null,

  iniciarSessao: async (deckId) => {
    set({ carregando: true, erro: null, ultimoEstadoSrs: null })
    try {
      const fila = await api.cartoes.paraRevisao(deckId, 50)
      set({
        fila,
        indiceAtual:       0,
        totalSessao:       fila.length,
        revisadosNaSessao: 0,
        ultimoEstadoSrs:   null,
        carregando:        false,
      })
    } catch (e) {
      set({ erro: String(e), carregando: false })
    }
  },

  responder: async (cartaoId, avaliacao) => {
    const estado = await api.revisoes.registrar({ cartaoId, avaliacao })
    set({ ultimoEstadoSrs: estado })
    return estado
  },

  avancar: () => {
    set((s) => ({
      indiceAtual:       s.indiceAtual + 1,
      revisadosNaSessao: s.revisadosNaSessao + 1,
      ultimoEstadoSrs:   null,
    }))
  },

  cartaoAtual: () => {
    const { fila, indiceAtual } = get()
    return fila[indiceAtual] ?? null
  },

  progresso: () => {
    const { totalSessao, indiceAtual } = get()
    if (totalSessao === 0) return 100
    return Math.round((indiceAtual / totalSessao) * 100)
  },

  encerrada: () => {
    const { fila, indiceAtual } = get()
    return indiceAtual >= fila.length
  },
}))
