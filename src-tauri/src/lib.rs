mod ai;
mod commands;
mod domain;
mod error;
mod storage;

use ai::CodexProvider;
use commands::{
    connect_ai_provider, delete_asset, delete_card, get_ai_provider_status, get_card, import_asset,
    list_cards, organize_card, read_asset, save_card,
};
use std::sync::Arc;
use storage::Storage;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            let data_dir = app.path().app_data_dir()?;
            let storage = Storage::open(&data_dir).map_err(Box::<dyn std::error::Error>::from)?;
            app.manage(storage);
            app.manage(Arc::new(CodexProvider::new()));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_cards,
            get_card,
            save_card,
            delete_card,
            import_asset,
            delete_asset,
            read_asset,
            get_ai_provider_status,
            connect_ai_provider,
            organize_card
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
