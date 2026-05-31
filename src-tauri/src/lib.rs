mod commands;
mod database;
mod models;
mod srs;

use database::Database;
use std::sync::Mutex;
use tauri::Manager;

pub struct AppState {
    pub db: Mutex<Database>,
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("Falha ao resolver diretório de dados do app");

            std::fs::create_dir_all(&app_dir)
                .expect("Falha ao criar diretório de dados");

            let db_path = app_dir.join("lembrei.db");
            let db = Database::new(&db_path)
                .expect("Falha ao inicializar banco de dados SQLite");

            app.manage(AppState { db: Mutex::new(db) });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::decks::listar_decks,
            commands::decks::criar_deck,
            commands::decks::atualizar_deck,
            commands::decks::deletar_deck,
            commands::decks::estatisticas_deck,
            commands::cartoes::listar_cartoes_do_deck,
            commands::cartoes::listar_cartoes_completos_do_deck,
            commands::cartoes::buscar_cartao_completo,
            commands::cartoes::criar_cartao,
            commands::cartoes::atualizar_cartao,
            commands::cartoes::deletar_cartao,
            commands::cartoes::buscar_cartoes_para_revisao,
            commands::cartoes::importar_cartoes_lote,
            commands::revisoes::registrar_revisao,
            commands::revisoes::historico_revisoes,
            commands::revisoes::estatisticas_detalhadas_deck,
        ])
        .run(tauri::generate_context!())
        .expect("Erro ao iniciar aplicação Lembrei");
}
