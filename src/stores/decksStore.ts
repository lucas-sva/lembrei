import { create } from 'zustand'
import type { Deck, EstatisticasDeck } from '../types'
import { api } from '../lib/tauri'

interface DecksState {
  decks: Deck[]
  estatisticas: Record<string, EstatisticasDeck>
  carregando: boolean
  erro: string | null

  carregarDecks: () => Promise<void>
  carregarEstatisticas: (deckId: string) => Promise<void>
  criarDeck: (nome: string, descricao?: string) => Promise<Deck>
  deletarDeck: (id: string) => Promise<void>
}

export const useDecksStore = create<DecksState>((set, get) => ({
  decks:        [],
  estatisticas: {},
  carregando:   false,
  erro:         null,

  carregarDecks: async () => {
    set({ carregando: true, erro: null })
    try {
      const decks = await api.decks.listar()
      set({ decks, carregando: false })
    } catch (e) {
      set({ erro: String(e), carregando: false })
    }
  },

  carregarEstatisticas: async (deckId) => {
    try {
      const stats = await api.decks.estatisticas(deckId)
      set((s) => ({ estatisticas: { ...s.estatisticas, [deckId]: stats } }))
    } catch (_) {
      // silencia — estatísticas são não-críticas
    }
  },

  criarDeck: async (nome, descricao) => {
    const deck = await api.decks.criar({ nome, descricao })
    set((s) => ({ decks: [deck, ...s.decks] }))
    return deck
  },

  deletarDeck: async (id) => {
    await api.decks.deletar(id)
    set((s) => ({
      decks:        s.decks.filter((d) => d.id !== id),
      estatisticas: Object.fromEntries(
        Object.entries(s.estatisticas).filter(([k]) => k !== id)
      ),
    }))
    get().carregarDecks()
  },
}))
