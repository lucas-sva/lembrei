import { create } from 'zustand'
import type { Preparacao } from '../types'
import { api } from '../lib/tauri'

interface PreparacoesState {
  preparacoes: Preparacao[]
  carregando: boolean

  carregarPreparacoes: () => Promise<void>
  criarPreparacao: (nome: string, descricao?: string, banca?: string, cargo?: string) => Promise<Preparacao>
  atualizarPreparacao: (id: string, nome: string, descricao?: string, banca?: string, cargo?: string) => Promise<void>
  deletarPreparacao: (id: string) => Promise<void>
}

export const usePreparacoesStore = create<PreparacoesState>((set, get) => ({
  preparacoes: [],
  carregando: false,

  carregarPreparacoes: async () => {
    set({ carregando: true })
    try {
      const preparacoes = await api.preparacoes.listar()
      set({ preparacoes, carregando: false })
    } catch {
      set({ carregando: false })
    }
  },

  criarPreparacao: async (nome, descricao, banca, cargo) => {
    const prep = await api.preparacoes.criar({ nome, descricao, banca, cargo })
    set((s) => ({ preparacoes: [prep, ...s.preparacoes] }))
    return prep
  },

  atualizarPreparacao: async (id, nome, descricao, banca, cargo) => {
    await api.preparacoes.atualizar({ id, nome, descricao, banca, cargo })
    set((s) => ({
      preparacoes: s.preparacoes.map((p) =>
        p.id === id ? { ...p, nome, descricao: descricao ?? null, banca: banca ?? null, cargo: cargo ?? null } : p
      ),
    }))
  },

  deletarPreparacao: async (id) => {
    await api.preparacoes.deletar(id)
    set((s) => ({ preparacoes: s.preparacoes.filter((p) => p.id !== id) }))
    get().carregarPreparacoes()
  },
}))
