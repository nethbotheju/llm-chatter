mod commands;
mod crypto;
mod db;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
        .setup(|app| {
            let app_handle = app.handle().clone();
            db::init_database(&app_handle)?;
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
            // Chat
            send_chat,
            abort_chat,
            // Utils
            search_messages,
            export_data,
            get_stats,
            reset_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
