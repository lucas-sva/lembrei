use rusqlite::{params, Connection, Result as SqlResult};
use std::path::Path;

use crate::models::*;

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(path: &Path) -> SqlResult<Self> {
        let conn = Connection::open(path)?;
        let db = Database { conn };
        db.inicializar_schema()?;
        db.migrar()?;
        Ok(db)
    }

    fn inicializar_schema(&self) -> SqlResult<()> {
        self.conn.execute_batch(include_str!("schema.sql"))
    }

    // Migrações incrementais — cada ALTER TABLE ignora erro se coluna já existe
    fn migrar(&self) -> SqlResult<()> {
        // Adiciona preparacao_id à tabela decks se ainda não existir
        let _ = self.conn.execute(
            "ALTER TABLE decks ADD COLUMN preparacao_id TEXT REFERENCES preparacoes(id) ON DELETE SET NULL",
            [],
        );
        // Índice criado após garantir que a coluna existe
        let _ = self.conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_decks_preparacao_id ON decks(preparacao_id)",
            [],
        );

        // Migra decks sem preparação para uma preparação padrão "Geral"
        let orphans: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM decks WHERE preparacao_id IS NULL",
            [],
            |r| r.get(0),
        ).unwrap_or(0);

        if orphans > 0 {
            let prep_id = uuid::Uuid::new_v4().to_string();
            let agora = chrono::Utc::now().to_rfc3339();
            self.conn.execute(
                "INSERT OR IGNORE INTO preparacoes (id, nome, descricao, banca, cargo, criado_em, atualizado_em)
                 VALUES (?1, ?2, NULL, NULL, NULL, ?3, ?3)",
                params![prep_id, "Geral", agora],
            )?;
            self.conn.execute(
                "UPDATE decks SET preparacao_id = ?1 WHERE preparacao_id IS NULL",
                params![prep_id],
            )?;
        }

        Ok(())
    }

    // ─── Preparações ──────────────────────────────────────────────────────────

    pub fn listar_preparacoes(&self) -> SqlResult<Vec<crate::models::Preparacao>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, nome, descricao, banca, cargo, criado_em, atualizado_em
             FROM preparacoes ORDER BY criado_em DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(crate::models::Preparacao {
                id:            row.get(0)?,
                nome:          row.get(1)?,
                descricao:     row.get(2)?,
                banca:         row.get(3)?,
                cargo:         row.get(4)?,
                criado_em:     row.get(5)?,
                atualizado_em: row.get(6)?,
            })
        })?;
        rows.collect()
    }

    pub fn criar_preparacao(&self, input: &crate::models::CriarPreparacaoInput) -> SqlResult<crate::models::Preparacao> {
        let id = uuid::Uuid::new_v4().to_string();
        let agora = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO preparacoes (id, nome, descricao, banca, cargo, criado_em, atualizado_em)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
            params![id, input.nome, input.descricao, input.banca, input.cargo, agora],
        )?;
        Ok(crate::models::Preparacao {
            id,
            nome:          input.nome.clone(),
            descricao:     input.descricao.clone(),
            banca:         input.banca.clone(),
            cargo:         input.cargo.clone(),
            criado_em:     agora.clone(),
            atualizado_em: agora,
        })
    }

    pub fn atualizar_preparacao(&self, input: &crate::models::AtualizarPreparacaoInput) -> SqlResult<usize> {
        let agora = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE preparacoes SET nome = ?1, descricao = ?2, banca = ?3, cargo = ?4, atualizado_em = ?5
             WHERE id = ?6",
            params![input.nome, input.descricao, input.banca, input.cargo, agora, input.id],
        )
    }

    pub fn deletar_preparacao(&self, id: &str) -> SqlResult<usize> {
        self.conn.execute("DELETE FROM preparacoes WHERE id = ?1", params![id])
    }

    pub fn buscar_preparacao(&self, id: &str) -> SqlResult<Option<crate::models::Preparacao>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, nome, descricao, banca, cargo, criado_em, atualizado_em
             FROM preparacoes WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            Ok(crate::models::Preparacao {
                id:            row.get(0)?,
                nome:          row.get(1)?,
                descricao:     row.get(2)?,
                banca:         row.get(3)?,
                cargo:         row.get(4)?,
                criado_em:     row.get(5)?,
                atualizado_em: row.get(6)?,
            })
        })?;
        rows.next().transpose()
    }

    // ─── Decks ────────────────────────────────────────────────────────────────

    pub fn listar_decks(&self) -> SqlResult<Vec<Deck>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, nome, descricao, preparacao_id, criado_em, atualizado_em
             FROM decks ORDER BY criado_em DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Deck {
                id:            row.get(0)?,
                nome:          row.get(1)?,
                descricao:     row.get(2)?,
                preparacao_id: row.get(3)?,
                criado_em:     row.get(4)?,
                atualizado_em: row.get(5)?,
            })
        })?;
        rows.collect()
    }

    pub fn listar_decks_da_preparacao(&self, preparacao_id: &str) -> SqlResult<Vec<Deck>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, nome, descricao, preparacao_id, criado_em, atualizado_em
             FROM decks WHERE preparacao_id = ?1 ORDER BY criado_em DESC",
        )?;
        let rows = stmt.query_map(params![preparacao_id], |row| {
            Ok(Deck {
                id:            row.get(0)?,
                nome:          row.get(1)?,
                descricao:     row.get(2)?,
                preparacao_id: row.get(3)?,
                criado_em:     row.get(4)?,
                atualizado_em: row.get(5)?,
            })
        })?;
        rows.collect()
    }

    pub fn buscar_deck(&self, id: &str) -> SqlResult<Option<Deck>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, nome, descricao, preparacao_id, criado_em, atualizado_em
             FROM decks WHERE id = ?1",
        )?;
        let mut rows = stmt.query_map(params![id], |row| {
            Ok(Deck {
                id:            row.get(0)?,
                nome:          row.get(1)?,
                descricao:     row.get(2)?,
                preparacao_id: row.get(3)?,
                criado_em:     row.get(4)?,
                atualizado_em: row.get(5)?,
            })
        })?;
        rows.next().transpose()
    }

    pub fn criar_deck(&self, input: &CriarDeckInput) -> SqlResult<Deck> {
        let id = uuid::Uuid::new_v4().to_string();
        let agora = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO decks (id, nome, descricao, preparacao_id, criado_em, atualizado_em)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
            params![id, input.nome, input.descricao, input.preparacao_id, agora],
        )?;
        Ok(Deck {
            id,
            nome:          input.nome.clone(),
            descricao:     input.descricao.clone(),
            preparacao_id: input.preparacao_id.clone(),
            criado_em:     agora.clone(),
            atualizado_em: agora,
        })
    }

    pub fn atualizar_deck(&self, input: &AtualizarDeckInput) -> SqlResult<usize> {
        let agora = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "UPDATE decks SET nome = ?1, descricao = ?2, atualizado_em = ?3 WHERE id = ?4",
            params![input.nome, input.descricao, agora, input.id],
        )
    }

    pub fn deletar_deck(&self, id: &str) -> SqlResult<usize> {
        self.conn.execute("DELETE FROM decks WHERE id = ?1", params![id])
    }

    pub fn estatisticas_deck(&self, deck_id: &str) -> SqlResult<EstatisticasDeck> {
        let agora = chrono::Utc::now().to_rfc3339();

        let total: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM cartoes WHERE deck_id = ?1",
            params![deck_id],
            |r| r.get(0),
        )?;

        let para_revisar: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM estado_srs s
             JOIN cartoes c ON c.id = s.cartao_id
             WHERE c.deck_id = ?1 AND s.proxima_revisao <= ?2",
            params![deck_id, agora],
            |r| r.get(0),
        )?;

        let novos: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM cartoes c
             WHERE c.deck_id = ?1
               AND NOT EXISTS (SELECT 1 FROM estado_srs s WHERE s.cartao_id = c.id)",
            params![deck_id],
            |r| r.get(0),
        )?;

        let aprendendo: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM estado_srs s
             JOIN cartoes c ON c.id = s.cartao_id
             WHERE c.deck_id = ?1 AND s.estado = 'aprendendo'",
            params![deck_id],
            |r| r.get(0),
        )?;

        let em_revisao: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM estado_srs s
             JOIN cartoes c ON c.id = s.cartao_id
             WHERE c.deck_id = ?1 AND s.estado = 'revisao'",
            params![deck_id],
            |r| r.get(0),
        )?;

        let reaprendendo: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM estado_srs s
             JOIN cartoes c ON c.id = s.cartao_id
             WHERE c.deck_id = ?1 AND s.estado = 'reaprendendo'",
            params![deck_id],
            |r| r.get(0),
        )?;

        Ok(EstatisticasDeck {
            total_cartoes:     total,
            para_revisar_hoje: para_revisar,
            novos,
            aprendendo,
            em_revisao,
            reaprendendo,
        })
    }

    // ─── Cartões ──────────────────────────────────────────────────────────────

    pub fn listar_cartoes_do_deck(&self, deck_id: &str) -> SqlResult<Vec<Cartao>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, deck_id, enunciado, justificativa, criado_em, atualizado_em
             FROM cartoes WHERE deck_id = ?1 ORDER BY criado_em DESC",
        )?;
        let rows = stmt.query_map(params![deck_id], |row| {
            Ok(Cartao {
                id:            row.get(0)?,
                deck_id:       row.get(1)?,
                enunciado:     row.get(2)?,
                justificativa: row.get(3)?,
                criado_em:     row.get(4)?,
                atualizado_em: row.get(5)?,
            })
        })?;
        rows.collect()
    }

    pub fn listar_cartoes_completos_do_deck(&self, deck_id: &str) -> SqlResult<Vec<CartaoCompleto>> {
        let cartoes = self.listar_cartoes_do_deck(deck_id)?;
        cartoes.iter().map(|c| self.buscar_cartao_completo(&c.id)).collect()
    }

    pub fn buscar_cartao_completo(&self, cartao_id: &str) -> SqlResult<CartaoCompleto> {
        let cartao = self.conn.query_row(
            "SELECT id, deck_id, enunciado, justificativa, criado_em, atualizado_em
             FROM cartoes WHERE id = ?1",
            params![cartao_id],
            |row| {
                Ok(Cartao {
                    id:            row.get(0)?,
                    deck_id:       row.get(1)?,
                    enunciado:     row.get(2)?,
                    justificativa: row.get(3)?,
                    criado_em:     row.get(4)?,
                    atualizado_em: row.get(5)?,
                })
            },
        )?;

        let alternativas = self.buscar_alternativas(cartao_id)?;
        let assertivas   = self.buscar_assertivas(cartao_id)?;
        let tags         = self.buscar_tags_do_cartao(cartao_id)?;
        let srs          = self.buscar_estado_srs(cartao_id)?;

        Ok(CartaoCompleto { cartao, alternativas, assertivas, tags, srs })
    }

    pub fn criar_cartao(&self, input: &CriarCartaoInput) -> SqlResult<CartaoCompleto> {
        let cartao_id = uuid::Uuid::new_v4().to_string();
        let agora     = chrono::Utc::now().to_rfc3339();

        self.conn.execute(
            "INSERT INTO cartoes (id, deck_id, enunciado, justificativa, criado_em, atualizado_em)
             VALUES (?1, ?2, ?3, ?4, ?5, ?5)",
            params![cartao_id, input.deck_id, input.enunciado, input.justificativa, agora],
        )?;

        for alt in &input.alternativas {
            let id = uuid::Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO alternativas (id, cartao_id, letra, texto, correta, ordem)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, cartao_id, alt.letra, alt.texto, alt.correta as i32, alt.ordem],
            )?;
        }

        for ass in &input.assertivas {
            let id = uuid::Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO assertivas (id, cartao_id, numero_romano, texto, correta, ordem)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, cartao_id, ass.numero_romano, ass.texto, ass.correta as i32, ass.ordem],
            )?;
        }

        for nome_tag in &input.tags {
            let tag_id = self.obter_ou_criar_tag(nome_tag)?;
            self.conn.execute(
                "INSERT OR IGNORE INTO cartao_tags (cartao_id, tag_id) VALUES (?1, ?2)",
                params![cartao_id, tag_id],
            )?;
        }

        self.buscar_cartao_completo(&cartao_id)
    }

    pub fn atualizar_cartao(&self, input: &AtualizarCartaoInput) -> SqlResult<CartaoCompleto> {
        let agora = chrono::Utc::now().to_rfc3339();

        self.conn.execute(
            "UPDATE cartoes SET enunciado = ?1, justificativa = ?2, atualizado_em = ?3 WHERE id = ?4",
            params![input.enunciado, input.justificativa, agora, input.id],
        )?;

        self.conn.execute("DELETE FROM alternativas WHERE cartao_id = ?1", params![input.id])?;
        for alt in &input.alternativas {
            let id = uuid::Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO alternativas (id, cartao_id, letra, texto, correta, ordem)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, input.id, alt.letra, alt.texto, alt.correta as i32, alt.ordem],
            )?;
        }

        self.conn.execute("DELETE FROM assertivas WHERE cartao_id = ?1", params![input.id])?;
        for ass in &input.assertivas {
            let id = uuid::Uuid::new_v4().to_string();
            self.conn.execute(
                "INSERT INTO assertivas (id, cartao_id, numero_romano, texto, correta, ordem)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, input.id, ass.numero_romano, ass.texto, ass.correta as i32, ass.ordem],
            )?;
        }

        self.conn.execute("DELETE FROM cartao_tags WHERE cartao_id = ?1", params![input.id])?;
        for nome_tag in &input.tags {
            let tag_id = self.obter_ou_criar_tag(nome_tag)?;
            self.conn.execute(
                "INSERT OR IGNORE INTO cartao_tags (cartao_id, tag_id) VALUES (?1, ?2)",
                params![input.id, tag_id],
            )?;
        }

        self.buscar_cartao_completo(&input.id)
    }

    pub fn deletar_cartao(&self, cartao_id: &str) -> SqlResult<usize> {
        self.conn.execute("DELETE FROM cartoes WHERE id = ?1", params![cartao_id])
    }

    pub fn buscar_cartoes_para_revisao(&self, deck_id: &str, limite: i64) -> SqlResult<Vec<CartaoCompleto>> {
        let agora = chrono::Utc::now().to_rfc3339();

        let mut stmt = self.conn.prepare(
            "SELECT c.id FROM cartoes c
             LEFT JOIN estado_srs s ON s.cartao_id = c.id
             WHERE c.deck_id = ?1
               AND (s.cartao_id IS NULL OR s.proxima_revisao <= ?2)
             ORDER BY
               CASE WHEN s.cartao_id IS NULL THEN 1 ELSE 0 END,
               s.proxima_revisao ASC
             LIMIT ?3",
        )?;

        let ids: Vec<String> = stmt
            .query_map(params![deck_id, agora, limite], |row| row.get(0))?
            .collect::<SqlResult<_>>()?;

        ids.iter()
            .map(|id| self.buscar_cartao_completo(id))
            .collect()
    }

    // ─── SRS ──────────────────────────────────────────────────────────────────

    pub fn buscar_estado_srs(&self, cartao_id: &str) -> SqlResult<Option<EstadoSrs>> {
        let mut stmt = self.conn.prepare(
            "SELECT cartao_id, estado, estabilidade, dificuldade,
                    ultima_revisao, proxima_revisao, lapsos, repeticoes
             FROM estado_srs WHERE cartao_id = ?1",
        )?;

        let mut rows = stmt.query_map(params![cartao_id], |row| {
            Ok(EstadoSrs {
                cartao_id:       row.get(0)?,
                estado:          row.get(1)?,
                estabilidade:    row.get(2)?,
                dificuldade:     row.get(3)?,
                ultima_revisao:  row.get(4)?,
                proxima_revisao: row.get(5)?,
                lapsos:          row.get(6)?,
                repeticoes:      row.get(7)?,
            })
        })?;

        rows.next().transpose()
    }

    pub fn salvar_estado_srs(&self, estado: &EstadoSrs) -> SqlResult<()> {
        self.conn.execute(
            "INSERT INTO estado_srs
                (cartao_id, estado, estabilidade, dificuldade,
                 ultima_revisao, proxima_revisao, lapsos, repeticoes)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
             ON CONFLICT(cartao_id) DO UPDATE SET
                estado          = excluded.estado,
                estabilidade    = excluded.estabilidade,
                dificuldade     = excluded.dificuldade,
                ultima_revisao  = excluded.ultima_revisao,
                proxima_revisao = excluded.proxima_revisao,
                lapsos          = excluded.lapsos,
                repeticoes      = excluded.repeticoes",
            params![
                estado.cartao_id,
                estado.estado,
                estado.estabilidade,
                estado.dificuldade,
                estado.ultima_revisao,
                estado.proxima_revisao,
                estado.lapsos,
                estado.repeticoes,
            ],
        )?;
        Ok(())
    }

    pub fn registrar_historico(
        &self,
        cartao_id: &str,
        avaliacao: u8,
        estab_antes: f64,
        estab_depois: f64,
        dif_depois: f64,
        intervalo_dias: i64,
    ) -> SqlResult<()> {
        let id    = uuid::Uuid::new_v4().to_string();
        let agora = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO historico_revisoes
                (id, cartao_id, avaliacao, estabilidade_antes, estabilidade_depois,
                 dificuldade_depois, intervalo_dias, revisado_em)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                id, cartao_id, avaliacao as i32,
                estab_antes, estab_depois, dif_depois, intervalo_dias, agora
            ],
        )?;
        Ok(())
    }

    pub fn historico_por_cartao(&self, cartao_id: &str) -> SqlResult<Vec<HistoricoRevisao>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, cartao_id, avaliacao, estabilidade_antes, estabilidade_depois,
                    dificuldade_depois, intervalo_dias, revisado_em
             FROM historico_revisoes WHERE cartao_id = ?1 ORDER BY revisado_em ASC",
        )?;
        let rows = stmt.query_map(params![cartao_id], |row| {
            Ok(HistoricoRevisao {
                id:                   row.get(0)?,
                cartao_id:            row.get(1)?,
                avaliacao:            row.get(2)?,
                estabilidade_antes:   row.get(3)?,
                estabilidade_depois:  row.get(4)?,
                dificuldade_depois:   row.get(5)?,
                intervalo_dias:       row.get(6)?,
                revisado_em:          row.get(7)?,
            })
        })?;
        rows.collect()
    }

    pub fn estatisticas_detalhadas_deck(&self, deck_id: &str) -> SqlResult<EstatisticasDetalhadas> {
        let agora = chrono::Utc::now();

        let total_revisoes: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM historico_revisoes h
             JOIN cartoes c ON c.id = h.cartao_id WHERE c.deck_id = ?1",
            params![deck_id],
            |r| r.get(0),
        )?;

        let corretas: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM historico_revisoes h
             JOIN cartoes c ON c.id = h.cartao_id
             WHERE c.deck_id = ?1 AND h.avaliacao >= 2",
            params![deck_id],
            |r| r.get(0),
        )?;

        let taxa_retencao = if total_revisoes > 0 {
            corretas as f64 / total_revisoes as f64
        } else {
            0.0
        };

        // Recuperabilidade média: R(t, S) para cada cartão com estado SRS ativo
        let mut stmt = self.conn.prepare(
            "SELECT s.estabilidade, s.ultima_revisao
             FROM estado_srs s
             JOIN cartoes c ON c.id = s.cartao_id
             WHERE c.deck_id = ?1 AND s.estabilidade > 0",
        )?;
        let cards_srs: Vec<(f64, Option<String>)> = stmt
            .query_map(params![deck_id], |row| Ok((row.get(0)?, row.get(1)?)))?
            .collect::<SqlResult<_>>()?;

        let recuperabilidade_media = if !cards_srs.is_empty() {
            let sum: f64 = cards_srs.iter().map(|(s, ultima)| {
                let t = ultima
                    .as_deref()
                    .and_then(|u| chrono::DateTime::parse_from_rfc3339(u).ok())
                    .map(|dt| (agora - dt.with_timezone(&chrono::Utc)).num_days().max(0) as f64)
                    .unwrap_or(0.0);
                crate::srs::Fsrs::calcular_retencao(t, *s)
            }).sum();
            sum / cards_srs.len() as f64
        } else {
            0.0
        };

        // Revisões agrupadas por dia nos últimos 30 dias
        let trinta_dias_atras = (agora - chrono::Duration::days(30)).to_rfc3339();
        let mut stmt2 = self.conn.prepare(
            "SELECT substr(h.revisado_em, 1, 10) AS dia,
                    COUNT(*) AS total,
                    SUM(CASE WHEN h.avaliacao >= 2 THEN 1 ELSE 0 END) AS corretas
             FROM historico_revisoes h
             JOIN cartoes c ON c.id = h.cartao_id
             WHERE c.deck_id = ?1 AND h.revisado_em >= ?2
             GROUP BY dia ORDER BY dia ASC",
        )?;
        let revisoes_por_dia: Vec<RevisoesDia> = stmt2
            .query_map(params![deck_id, trinta_dias_atras], |row| {
                Ok(RevisoesDia {
                    data:     row.get(0)?,
                    total:    row.get(1)?,
                    corretas: row.get(2)?,
                })
            })?
            .collect::<SqlResult<_>>()?;

        let distribuicao_estados = self.estatisticas_deck(deck_id)?;

        Ok(EstatisticasDetalhadas {
            total_revisoes,
            taxa_retencao,
            recuperabilidade_media,
            revisoes_por_dia,
            distribuicao_estados,
        })
    }

    // ─── Helpers internos ─────────────────────────────────────────────────────

    fn buscar_alternativas(&self, cartao_id: &str) -> SqlResult<Vec<Alternativa>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, cartao_id, letra, texto, correta, ordem
             FROM alternativas WHERE cartao_id = ?1 ORDER BY ordem",
        )?;
        let rows = stmt.query_map(params![cartao_id], |row| {
            Ok(Alternativa {
                id:        row.get(0)?,
                cartao_id: row.get(1)?,
                letra:     row.get(2)?,
                texto:     row.get(3)?,
                correta:   row.get::<_, i32>(4)? != 0,
                ordem:     row.get(5)?,
            })
        })?;
        rows.collect()
    }

    fn buscar_assertivas(&self, cartao_id: &str) -> SqlResult<Vec<Assertiva>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, cartao_id, numero_romano, texto, correta, ordem
             FROM assertivas WHERE cartao_id = ?1 ORDER BY ordem",
        )?;
        let rows = stmt.query_map(params![cartao_id], |row| {
            Ok(Assertiva {
                id:            row.get(0)?,
                cartao_id:     row.get(1)?,
                numero_romano: row.get(2)?,
                texto:         row.get(3)?,
                correta:       row.get::<_, i32>(4)? != 0,
                ordem:         row.get(5)?,
            })
        })?;
        rows.collect()
    }

    fn buscar_tags_do_cartao(&self, cartao_id: &str) -> SqlResult<Vec<Tag>> {
        let mut stmt = self.conn.prepare(
            "SELECT t.id, t.nome, t.cor
             FROM tags t
             JOIN cartao_tags ct ON ct.tag_id = t.id
             WHERE ct.cartao_id = ?1
             ORDER BY t.nome",
        )?;
        let rows = stmt.query_map(params![cartao_id], |row| {
            Ok(Tag { id: row.get(0)?, nome: row.get(1)?, cor: row.get(2)? })
        })?;
        rows.collect()
    }

    fn obter_ou_criar_tag(&self, nome: &str) -> SqlResult<String> {
        let existente: Option<String> = self
            .conn
            .query_row("SELECT id FROM tags WHERE nome = ?1", params![nome], |r| r.get(0))
            .ok();

        if let Some(id) = existente {
            return Ok(id);
        }

        let id  = uuid::Uuid::new_v4().to_string();
        let cor = Self::cor_para_tag(nome);
        self.conn.execute(
            "INSERT INTO tags (id, nome, cor) VALUES (?1, ?2, ?3)",
            params![id, nome, cor],
        )?;
        Ok(id)
    }

    fn cor_para_tag(nome: &str) -> &'static str {
        match nome.to_lowercase().as_str() {
            "lei" | "legislação"         => "#3b82f6",
            "doutrina"                   => "#8b5cf6",
            "jurisprudência" | "súmula"  => "#f59e0b",
            "constitucional"             => "#10b981",
            "penal" | "processo penal"   => "#ef4444",
            "norma"                      => "#06b6d4",
            "framework"                  => "#a855f7",
            _                            => "#6366f1",
        }
    }
}
