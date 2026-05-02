mod commands;
mod crypto;
mod db;
mod desktop_runtime;

use commands::*;
use desktop_runtime::get_sidecar_config;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let app_handle = app.handle().clone();
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .map_err(|e| format!("failed to resolve app data dir: {}", e))?;
            std::fs::create_dir_all(&app_data_dir)
                .map_err(|e| format!("failed to create app data dir: {}", e))?;

            let secret_file = app_data_dir.join("master_secret");
            let secret = if secret_file.exists() {
                std::fs::read_to_string(&secret_file)
                    .map_err(|e| format!("failed to read master secret: {}", e))?
            } else {
                let generated = uuid::Uuid::new_v4().to_string();
                std::fs::write(&secret_file, &generated)
                    .map_err(|e| format!("failed to persist master secret: {}", e))?;
                generated
            };

            crypto::init_master_secret(secret.trim().to_string());

            let db_path = app_data_dir
                .join("llm-chatter.db")
                .to_str()
                .expect("invalid db path")
                .to_string();

            db::init_database(&app_handle)?;
            desktop_runtime::init_runtime_state(app, db_path, secret.trim().to_string());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Providers
            get_providers,
            create_provider,
            update_provider,
            delete_provider,
            validate_provider,
            // Models
            get_models,
            create_model,
            update_model,
            delete_model,
            // Assistants
            get_assistants,
            create_assistant,
            update_assistant,
            delete_assistant,
            // Conversations
            get_conversations,
            get_conversation,
            create_conversation,
            update_conversation,
            delete_conversations,
            // Messages
            get_messages,
            create_message,
            update_message,
            delete_message,
            // Desktop runtime
            get_sidecar_config,
            save_assistant_message,
            resolve_chat_config,
            // Utils
            search_messages,
            export_data,
            get_stats,
            reset_data,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::Exit = event {
                desktop_runtime::kill_sidecar(app_handle);
            }
        });
}
