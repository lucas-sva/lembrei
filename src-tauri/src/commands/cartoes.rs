use crate::models::{
    AtualizarCartaoInput, CartaoCompleto, CriarCartaoInput, ImportarLoteInput,
};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn listar_cartoes_do_deck(
    state: State<'_, AppState>,
    deck_id: String,
) -> Result<Vec<crate::models::Cartao>, String> {
    state
        .db
        .lock()
        .unwrap()
        .listar_cartoes_do_deck(&deck_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_cartoes_completos_do_deck(
    state: State<'_, AppState>,
    deck_id: String,
) -> Result<Vec<CartaoCompleto>, String> {
    state
        .db
        .lock()
        .unwrap()
        .listar_cartoes_completos_do_deck(&deck_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn buscar_cartao_completo(
    state: State<'_, AppState>,
    cartao_id: String,
) -> Result<CartaoCompleto, String> {
    state
        .db
        .lock()
        .unwrap()
        .buscar_cartao_completo(&cartao_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn criar_cartao(
    state: State<'_, AppState>,
    input: CriarCartaoInput,
) -> Result<CartaoCompleto, String> {
    state
        .db
        .lock()
        .unwrap()
        .criar_cartao(&input)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn atualizar_cartao(
    state: State<'_, AppState>,
    input: AtualizarCartaoInput,
) -> Result<CartaoCompleto, String> {
    state
        .db
        .lock()
        .unwrap()
        .atualizar_cartao(&input)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn deletar_cartao(
    state: State<'_, AppState>,
    cartao_id: String,
) -> Result<(), String> {
    let linhas = state
        .db
        .lock()
        .unwrap()
        .deletar_cartao(&cartao_id)
        .map_err(|e| e.to_string())?;

    if linhas == 0 {
        return Err(format!("Cartão '{}' não encontrado.", cartao_id));
    }
    Ok(())
}

#[tauri::command]
pub fn buscar_cartoes_para_revisao(
    state: State<'_, AppState>,
    deck_id: String,
    limite: Option<i64>,
) -> Result<Vec<CartaoCompleto>, String> {
    state
        .db
        .lock()
        .unwrap()
        .buscar_cartoes_para_revisao(&deck_id, limite.unwrap_or(50))
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn importar_cartoes_lote(
    state: State<'_, AppState>,
    input: ImportarLoteInput,
) -> Result<Vec<CartaoCompleto>, String> {
    let db = state.db.lock().unwrap();
    let mut resultados = Vec::new();
    for c in &input.cartoes {
        let criar_input = CriarCartaoInput {
            deck_id:      input.deck_id.clone(),
            enunciado:    c.enunciado.clone(),
            justificativa: c.justificativa.clone(),
            alternativas: c.alternativas.clone(),
            assertivas:   c.assertivas.clone(),
            tags:         c.tags.clone(),
        };
        let cartao = db.criar_cartao(&criar_input).map_err(|e| e.to_string())?;
        resultados.push(cartao);
    }
    Ok(resultados)
}
