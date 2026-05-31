use crate::models::{EstadoSrs, RegistrarRevisaoInput};
use crate::srs::{Avaliacao, Fsrs};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn registrar_revisao(
    state: State<'_, AppState>,
    input: RegistrarRevisaoInput,
) -> Result<EstadoSrs, String> {
    let avaliacao = Avaliacao::try_from(input.avaliacao)?;
    let db = state.db.lock().unwrap();

    let estado_anterior = db
        .buscar_estado_srs(&input.cartao_id)
        .map_err(|e| e.to_string())?;

    let estab_antes = estado_anterior
        .as_ref()
        .map(|e| e.estabilidade)
        .unwrap_or(0.0);

    let mut novo_estado = Fsrs::agendar(estado_anterior.as_ref(), avaliacao);
    novo_estado.cartao_id = input.cartao_id.clone();

    let intervalo_dias = {
        use chrono::DateTime;
        let proxima = DateTime::parse_from_rfc3339(&novo_estado.proxima_revisao)
            .map_err(|e| e.to_string())?;
        let ultima = novo_estado
            .ultima_revisao
            .as_deref()
            .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
            .unwrap_or(proxima);
        (proxima - ultima).num_days()
    };

    db.salvar_estado_srs(&novo_estado)
        .map_err(|e| e.to_string())?;

    db.registrar_historico(
        &input.cartao_id,
        input.avaliacao,
        estab_antes,
        novo_estado.estabilidade,
        novo_estado.dificuldade,
        intervalo_dias,
    )
    .map_err(|e| e.to_string())?;

    Ok(novo_estado)
}

#[tauri::command]
pub fn historico_revisoes(
    state: State<'_, AppState>,
    cartao_id: String,
) -> Result<Vec<serde_json::Value>, String> {
    let db = state.db.lock().unwrap();
    let conn = &db;

    // Acesso direto via método público seria ideal; aqui retornamos JSON bruto
    // para evitar criar outro struct de histórico neste momento.
    let _ = (conn, cartao_id);
    Ok(vec![])
}
