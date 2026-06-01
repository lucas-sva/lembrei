use crate::models::{AtualizarPreparacaoInput, CriarPreparacaoInput, Preparacao};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn listar_preparacoes(state: State<'_, AppState>) -> Result<Vec<Preparacao>, String> {
    state.db.lock().unwrap().listar_preparacoes().map_err(|e| e.to_string())
}

#[tauri::command]
pub fn criar_preparacao(
    state: State<'_, AppState>,
    input: CriarPreparacaoInput,
) -> Result<Preparacao, String> {
    state.db.lock().unwrap().criar_preparacao(&input).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn atualizar_preparacao(
    state: State<'_, AppState>,
    input: AtualizarPreparacaoInput,
) -> Result<(), String> {
    let linhas = state
        .db
        .lock()
        .unwrap()
        .atualizar_preparacao(&input)
        .map_err(|e| e.to_string())?;

    if linhas == 0 {
        return Err(format!("Preparação '{}' não encontrada.", input.id));
    }
    Ok(())
}

#[tauri::command]
pub fn deletar_preparacao(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let linhas = state
        .db
        .lock()
        .unwrap()
        .deletar_preparacao(&id)
        .map_err(|e| e.to_string())?;

    if linhas == 0 {
        return Err(format!("Preparação '{}' não encontrada.", id));
    }
    Ok(())
}

#[tauri::command]
pub fn buscar_preparacao(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<Preparacao>, String> {
    state.db.lock().unwrap().buscar_preparacao(&id).map_err(|e| e.to_string())
}
