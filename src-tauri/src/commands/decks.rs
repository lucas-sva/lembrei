use crate::models::{AtualizarDeckInput, CriarDeckInput, Deck, EstatisticasDeck};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn listar_decks(state: State<'_, AppState>) -> Result<Vec<Deck>, String> {
    state.db.lock().unwrap().listar_decks().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn listar_decks_da_preparacao(
    state: State<'_, AppState>,
    preparacao_id: String,
) -> Result<Vec<Deck>, String> {
    state
        .db
        .lock()
        .unwrap()
        .listar_decks_da_preparacao(&preparacao_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn buscar_deck(state: State<'_, AppState>, id: String) -> Result<Option<Deck>, String> {
    state.db.lock().unwrap().buscar_deck(&id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn criar_deck(state: State<'_, AppState>, input: CriarDeckInput) -> Result<Deck, String> {
    state.db.lock().unwrap().criar_deck(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn atualizar_deck(
    state: State<'_, AppState>,
    input: AtualizarDeckInput,
) -> Result<(), String> {
    let linhas = state
        .db
        .lock()
        .unwrap()
        .atualizar_deck(&input)
        .map_err(|e| e.to_string())?;

    if linhas == 0 {
        return Err(format!("Deck '{}' não encontrado.", input.id));
    }
    Ok(())
}

#[tauri::command]
pub fn deletar_deck(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let linhas = state
        .db
        .lock()
        .unwrap()
        .deletar_deck(&id)
        .map_err(|e| e.to_string())?;

    if linhas == 0 {
        return Err(format!("Deck '{}' não encontrado.", id));
    }
    Ok(())
}

#[tauri::command]
pub fn estatisticas_deck(
    state: State<'_, AppState>,
    deck_id: String,
) -> Result<EstatisticasDeck, String> {
    state
        .db
        .lock()
        .unwrap()
        .estatisticas_deck(&deck_id)
        .map_err(|e| e.to_string())
}
