PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS decks (
    id           TEXT PRIMARY KEY,
    nome         TEXT NOT NULL,
    descricao    TEXT,
    criado_em    TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cartoes (
    id            TEXT PRIMARY KEY,
    deck_id       TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
    enunciado     TEXT NOT NULL,
    justificativa TEXT,
    criado_em     TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS alternativas (
    id         TEXT PRIMARY KEY,
    cartao_id  TEXT NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
    letra      TEXT NOT NULL CHECK(letra IN ('A','B','C','D','E')),
    texto      TEXT NOT NULL,
    correta    INTEGER NOT NULL DEFAULT 0 CHECK(correta IN (0, 1)),
    ordem      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assertivas (
    id            TEXT PRIMARY KEY,
    cartao_id     TEXT NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
    numero_romano TEXT NOT NULL,
    texto         TEXT NOT NULL,
    correta       INTEGER NOT NULL DEFAULT 0 CHECK(correta IN (0, 1)),
    ordem         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tags (
    id   TEXT PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    cor  TEXT NOT NULL DEFAULT '#6366f1'
);

CREATE TABLE IF NOT EXISTS cartao_tags (
    cartao_id TEXT NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
    tag_id    TEXT NOT NULL REFERENCES tags(id)    ON DELETE CASCADE,
    PRIMARY KEY (cartao_id, tag_id)
);

CREATE TABLE IF NOT EXISTS estado_srs (
    cartao_id       TEXT PRIMARY KEY REFERENCES cartoes(id) ON DELETE CASCADE,
    estado          TEXT NOT NULL DEFAULT 'novo'
                         CHECK(estado IN ('novo','aprendendo','revisao','reaprendendo')),
    estabilidade    REAL NOT NULL DEFAULT 0,
    dificuldade     REAL NOT NULL DEFAULT 0,
    ultima_revisao  TEXT,
    proxima_revisao TEXT NOT NULL DEFAULT (datetime('now')),
    lapsos          INTEGER NOT NULL DEFAULT 0,
    repeticoes      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS historico_revisoes (
    id                  TEXT PRIMARY KEY,
    cartao_id           TEXT NOT NULL REFERENCES cartoes(id) ON DELETE CASCADE,
    avaliacao           INTEGER NOT NULL CHECK(avaliacao BETWEEN 1 AND 4),
    estabilidade_antes  REAL NOT NULL,
    estabilidade_depois REAL NOT NULL,
    dificuldade_depois  REAL NOT NULL,
    intervalo_dias      INTEGER NOT NULL,
    revisado_em         TEXT NOT NULL
);

-- ─── Índices de performance ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cartoes_deck_id
    ON cartoes(deck_id);

CREATE INDEX IF NOT EXISTS idx_alternativas_cartao_id
    ON alternativas(cartao_id);

CREATE INDEX IF NOT EXISTS idx_assertivas_cartao_id
    ON assertivas(cartao_id);

CREATE INDEX IF NOT EXISTS idx_cartao_tags_cartao_id
    ON cartao_tags(cartao_id);

-- Query crítica: cartões cuja proxima_revisao <= now()
CREATE INDEX IF NOT EXISTS idx_estado_srs_proxima
    ON estado_srs(proxima_revisao);

CREATE INDEX IF NOT EXISTS idx_historico_cartao_id
    ON historico_revisoes(cartao_id);

CREATE INDEX IF NOT EXISTS idx_historico_revisado_em
    ON historico_revisoes(revisado_em);
