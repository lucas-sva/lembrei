import { invoke } from '@tauri-apps/api/core'
import type {
  AtualizarDeckInput,
  CartaoCompleto,
  CriarCartaoInput,
  CriarDeckInput,
  Deck,
  EstatisticasDeck,
  EstadoSrs,
  RegistrarRevisaoInput,
} from '../types'

// Wrapper tipado sobre os comandos Tauri, mantendo os nomes em snake_case
// do invoke alinhados aos nomes registrados no lib.rs.

export const api = {
  decks: {
    listar: ()                               => invoke<Deck[]>('listar_decks'),
    criar:  (input: CriarDeckInput)          => invoke<Deck>('criar_deck', { input }),
    atualizar: (input: AtualizarDeckInput)   => invoke<void>('atualizar_deck', { input }),
    deletar: (id: string)                    => invoke<void>('deletar_deck', { id }),
    estatisticas: (deckId: string)           => invoke<EstatisticasDeck>('estatisticas_deck', { deckId }),
  },

  cartoes: {
    listarDoDeck:   (deckId: string)         => invoke<CartaoCompleto[]>('listar_cartoes_do_deck', { deckId }),
    buscarCompleto: (cartaoId: string)       => invoke<CartaoCompleto>('buscar_cartao_completo', { cartaoId }),
    criar:          (input: CriarCartaoInput) => invoke<CartaoCompleto>('criar_cartao', { input }),
    deletar:        (cartaoId: string)       => invoke<void>('deletar_cartao', { cartaoId }),
    paraRevisao: (deckId: string, limite?: number) =>
      invoke<CartaoCompleto[]>('buscar_cartoes_para_revisao', { deckId, limite }),
  },

  revisoes: {
    registrar: (input: RegistrarRevisaoInput) => invoke<EstadoSrs>('registrar_revisao', { input }),
  },
}
