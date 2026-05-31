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
        Ok(db)
    }

    fn inicializar_schema(&self) -> SqlResult<()> {
        self.conn.execute_batch(include_str!("schema.sql"))
    }

    // ─── Decks ────────────────────────────────────────────────────────────────

    pub fn listar_decks(&self) -> SqlResult<Vec<Deck>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, nome, descricao, criado_em, atualizado_em FROM decks ORDER BY criado_em DESC",
        )?;
        let rows = stmt.query_map([], |row| {
            Ok(Deck {
                id:            row.get(0)?,
                nome:          row.get(1)?,
                descricao:     row.get(2)?,
                criado_em:     row.get(3)?,
                atualizado_em: row.get(4)?,
            })
        })?;
        rows.collect()
    }

    pub fn criar_deck(&self, input: &CriarDeckInput) -> SqlResult<Deck> {
        let id = uuid::Uuid::new_v4().to_string();
        let agora = chrono::Utc::now().to_rfc3339();
        self.conn.execute(
            "INSERT INTO decks (id, nome, descricao, criado_em, atualizado_em)
             VALUES (?1, ?2, ?3, ?4, ?4)",
            params![id, input.nome, input.descricao, agora],
        )?;
        Ok(Deck {
            id,
            nome:          input.nome.clone(),
            descricao:     input.descricao.clone(),
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
            total_cartoes:   total,
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

    pub fn deletar_cartao(&self, cartao_id: &str) -> SqlResult<usize> {
        self.conn.execute("DELETE FROM cartoes WHERE id = ?1", params![cartao_id])
    }

    /// Retorna cartões prontos para revisão: vencidos (proxima_revisao <= agora) + novos.
    pub fn buscar_cartoes_para_revisao(&self, deck_id: &str, limite: i64) -> SqlResult<Vec<CartaoCompleto>> {
        let agora = chrono::Utc::now().to_rfc3339();

        // Cartões vencidos + novos (sem estado_srs ainda)
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
            _                            => "#6366f1",
        }
    }
}
