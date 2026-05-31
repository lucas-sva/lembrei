use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Deck {
    pub id: String,
    pub nome: String,
    pub descricao: Option<String>,
    pub criado_em: String,
    pub atualizado_em: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cartao {
    pub id: String,
    pub deck_id: String,
    pub enunciado: String,
    pub justificativa: Option<String>,
    pub criado_em: String,
    pub atualizado_em: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Alternativa {
    pub id: String,
    pub cartao_id: String,
    pub letra: String,
    pub texto: String,
    pub correta: bool,
    pub ordem: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Assertiva {
    pub id: String,
    pub cartao_id: String,
    pub numero_romano: String,
    pub texto: String,
    pub correta: bool,
    pub ordem: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: String,
    pub nome: String,
    pub cor: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstadoSrs {
    pub cartao_id: String,
    pub estado: String,
    pub estabilidade: f64,
    pub dificuldade: f64,
    pub ultima_revisao: Option<String>,
    pub proxima_revisao: String,
    pub lapsos: i32,
    pub repeticoes: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CartaoCompleto {
    pub cartao: Cartao,
    pub alternativas: Vec<Alternativa>,
    pub assertivas: Vec<Assertiva>,
    pub tags: Vec<Tag>,
    pub srs: Option<EstadoSrs>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstatisticasDeck {
    pub total_cartoes: i64,
    pub para_revisar_hoje: i64,
    pub novos: i64,
    pub aprendendo: i64,
    pub em_revisao: i64,
    pub reaprendendo: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoricoRevisao {
    pub id: String,
    pub cartao_id: String,
    pub avaliacao: i32,
    pub estabilidade_antes: f64,
    pub estabilidade_depois: f64,
    pub dificuldade_depois: f64,
    pub intervalo_dias: i64,
    pub revisado_em: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RevisoesDia {
    pub data: String,
    pub total: i64,
    pub corretas: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EstatisticasDetalhadas {
    pub total_revisoes: i64,
    pub taxa_retencao: f64,
    pub recuperabilidade_media: f64,
    pub revisoes_por_dia: Vec<RevisoesDia>,
    pub distribuicao_estados: EstatisticasDeck,
}

// ─── Inputs (frontend → backend) ────────────────────────────────────────────

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CriarDeckInput {
    pub nome: String,
    pub descricao: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtualizarDeckInput {
    pub id: String,
    pub nome: String,
    pub descricao: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CriarAlternativaInput {
    pub letra: String,
    pub texto: String,
    pub correta: bool,
    pub ordem: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CriarAssertiviaInput {
    pub numero_romano: String,
    pub texto: String,
    pub correta: bool,
    pub ordem: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CriarCartaoInput {
    pub deck_id: String,
    pub enunciado: String,
    pub justificativa: Option<String>,
    pub alternativas: Vec<CriarAlternativaInput>,
    pub assertivas: Vec<CriarAssertiviaInput>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtualizarCartaoInput {
    pub id: String,
    pub enunciado: String,
    pub justificativa: Option<String>,
    pub alternativas: Vec<CriarAlternativaInput>,
    pub assertivas: Vec<CriarAssertiviaInput>,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportarCartaoInput {
    pub enunciado: String,
    pub justificativa: Option<String>,
    pub alternativas: Vec<CriarAlternativaInput>,
    pub assertivas: Vec<CriarAssertiviaInput>,
    pub tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportarLoteInput {
    pub deck_id: String,
    pub cartoes: Vec<ImportarCartaoInput>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistrarRevisaoInput {
    pub cartao_id: String,
    pub avaliacao: u8,
}
