# Modelagem de Dados — Lembrei

## Diagrama de Entidade-Relacionamento

```
┌──────────┐         ┌──────────────┐         ┌───────────────┐
│  decks   │ 1     N │   cartoes    │ 1     N  │  alternativas │
│──────────│─────────│──────────────│──────────│───────────────│
│ id (PK)  │         │ id (PK)      │          │ id (PK)       │
│ nome     │         │ deck_id (FK) │          │ cartao_id(FK) │
│ descricao│         │ enunciado    │          │ letra         │
│ criado_em│         │ justificativa│          │ texto         │
│ atualiz..│         │ criado_em    │          │ correta       │
└──────────┘         │ atualizado_em│          │ ordem         │
                     └──────┬───────┘          └───────────────┘
                            │ 1
                            │                  ┌───────────────┐
                            │ N                │   assertivas  │
                            │──────────────────│───────────────│
                            │                  │ id (PK)       │
                            │                  │ cartao_id(FK) │
                            │                  │ numero_romano │
                            │                  │ texto         │
                     ┌──────┴───────┐          │ correta       │
                     │  estado_srs  │          │ ordem         │
                     │──────────────│          └───────────────┘
                     │ cartao_id(PK)│
                     │ estado       │          ┌───────────────┐
                     │ estabilidade │    N   N  │     tags      │
                     │ dificuldade  │──────────│───────────────│
                     │ ultima_rev.  │ cartao_  │ id (PK)       │
                     │ proxima_rev. │ tags     │ nome (UNIQUE) │
                     │ lapsos       │          │ cor           │
                     │ repeticoes   │          └───────────────┘
                     └──────┬───────┘
                            │ 1
                            │ N
                     ┌──────┴────────────┐
                     │ historico_revisoes│
                     │───────────────────│
                     │ id (PK)           │
                     │ cartao_id (FK)    │
                     │ avaliacao (1-4)   │
                     │ estab_antes       │
                     │ estab_depois      │
                     │ dificuldade_depois│
                     │ intervalo_dias    │
                     │ revisado_em       │
                     └───────────────────┘
```

## Descrição das Entidades

### `decks`
Coleção temática de cartões. Um deck corresponde a uma disciplina, matéria ou assunto (ex: "Direito Civil", "Algoritmos", "Patologia").

### `cartoes`
Unidade atômica de estudo. Contém o enunciado da questão e a justificativa (gabarito comentado). Um cartão pertence a exatamente um deck.

### `alternativas`
Opções de múltipla escolha de um cartão (A–E). Exatamente uma deve ter `correta = 1`.

### `assertivas`
Itens de julgamento numerados em romano (I, II, III...). Cada assertiva tem `correta` indicando se ela é verdadeira ou falsa. As alternativas referenciam combinações dessas assertivas.

### `tags`
Etiquetas visuais categorizando o tipo de conteúdo (ex: "Lei", "Doutrina", "Jurisprudência", "Súmula"). Têm cor customizável para exibição como chips.

### `cartao_tags`
Tabela de junção N:N entre cartões e tags.

### `estado_srs`
Estado atual do algoritmo FSRS para cada cartão. É o coração do sistema de agendamento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `estado` | TEXT | `novo` \| `aprendendo` \| `revisao` \| `reaprendendo` |
| `estabilidade` | REAL | S: dias para 90% de retenção |
| `dificuldade` | REAL | D: 1.0 (fácil) a 10.0 (difícil) |
| `ultima_revisao` | TEXT | ISO 8601 — base para cálculo de retenção |
| `proxima_revisao` | TEXT | ISO 8601 — quando o cartão estará disponível |
| `lapsos` | INTEGER | Quantas vezes o cartão foi avaliado como "Esqueci" no estado Review |
| `repeticoes` | INTEGER | Total de revisões realizadas |

### `historico_revisoes`
Log imutável de todas as revisões. Usado para estatísticas, gráficos de progresso e futura personalização de parâmetros FSRS por usuário.

## Índices

```sql
CREATE INDEX idx_cartoes_deck_id ON cartoes(deck_id);
CREATE INDEX idx_alternativas_cartao_id ON alternativas(cartao_id);
CREATE INDEX idx_assertivas_cartao_id ON assertivas(cartao_id);
CREATE INDEX idx_estado_srs_proxima ON estado_srs(proxima_revisao);
CREATE INDEX idx_historico_cartao_id ON historico_revisoes(cartao_id);
CREATE INDEX idx_historico_revisado_em ON historico_revisoes(revisado_em);
```

O índice em `estado_srs(proxima_revisao)` é crítico: a query mais frequente do app é "quais cartões estão com `proxima_revisao <= agora`", executada a cada abertura de sessão de revisão.
