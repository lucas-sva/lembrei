import { invoke } from '@tauri-apps/api/core'
import type {
  AtualizarCartaoInput,
  AtualizarDeckInput,
  CartaoCompleto,
  CriarCartaoInput,
  CriarDeckInput,
  Deck,
  EstatisticasDeck,
  EstadoSrs,
  EstatisticasDetalhadas,
  HistoricoRevisao,
  ImportarLoteInput,
  RegistrarRevisaoInput,
} from '../types'

export const api = {
  decks: {
    listar:       ()                              => invoke<Deck[]>('listar_decks'),
    criar:        (input: CriarDeckInput)         => invoke<Deck>('criar_deck', { input }),
    atualizar:    (input: AtualizarDeckInput)     => invoke<void>('atualizar_deck', { input }),
    deletar:      (id: string)                    => invoke<void>('deletar_deck', { id }),
    estatisticas: (deckId: string)                => invoke<EstatisticasDeck>('estatisticas_deck', { deckId }),
  },

  cartoes: {
    listarDoDeck:   (deckId: string)                => invoke<CartaoCompleto[]>('listar_cartoes_completos_do_deck', { deckId }),
    buscarCompleto: (cartaoId: string)              => invoke<CartaoCompleto>('buscar_cartao_completo', { cartaoId }),
    criar:          (input: CriarCartaoInput)       => invoke<CartaoCompleto>('criar_cartao', { input }),
    atualizar:      (input: AtualizarCartaoInput)   => invoke<CartaoCompleto>('atualizar_cartao', { input }),
    deletar:        (cartaoId: string)              => invoke<void>('deletar_cartao', { cartaoId }),
    paraRevisao:    (deckId: string, limite?: number) =>
      invoke<CartaoCompleto[]>('buscar_cartoes_para_revisao', { deckId, limite }),
    importarLote:   (input: ImportarLoteInput)      => invoke<CartaoCompleto[]>('importar_cartoes_lote', { input }),
  },

  revisoes: {
    registrar:           (input: RegistrarRevisaoInput) => invoke<EstadoSrs>('registrar_revisao', { input }),
    historico:           (cartaoId: string)             => invoke<HistoricoRevisao[]>('historico_revisoes', { cartaoId }),
    estatisticasDetalhadas: (deckId: string)            => invoke<EstatisticasDetalhadas>('estatisticas_detalhadas_deck', { deckId }),
  },
}
