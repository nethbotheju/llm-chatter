use crate::crypto;
use crate::db::DbState;
use crate::desktop_runtime;
use rusqlite::params;
use serde::Deserialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, State};

static CHAT_ABORT: AtomicBool = AtomicBool::new(false);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub role: String,
    pub content: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendChatInput {
    pub messages: Vec<ChatMessage>,
    pub model_id: String,
    pub conversation_id: Option<String>,
}

#[tauri::command]
pub async fn send_chat(input: SendChatInput, app: AppHandle, state: State<'_, DbState>) -> Result<(), String> {
    CHAT_ABORT.store(false, Ordering::SeqCst);

    let (model_name, provider_type, base_url, api_key, system_prompt, temperature, top_p) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;

        let (model_name, provider_type, base_url, api_key_encrypted):
            (String, String, Option<String>, Option<String>) = conn
            .query_row(
                "SELECT m.name, p.type, p.base_url, p.api_key_encrypted FROM model m JOIN provider p ON m.provider_id = p.id WHERE m.id = ?1 AND m.enabled = 1 AND p.enabled = 1",
                params![input.model_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|e| format!("Model not found: {}", e))?;

        let api_key = api_key_encrypted
            .as_deref()
            .map(crypto::decrypt)
            .transpose()
            .map_err(|_| {
                "Stored API key could not be decrypted. Please open Settings -> Providers and re-save the API key for this provider."
                    .to_string()
            })?
            .ok_or("API key not configured")?;

        let mut system_prompt = String::new();
        let mut temperature = 0.7_f64;
        let mut top_p = 1.0_f64;

        if let Some(ref conv_id) = input.conversation_id {
            let result: Option<(String, f64, f64)> = conn
                .query_row(
                    "SELECT a.system_prompt, a.temperature, a.top_p FROM conversation c JOIN assistant a ON c.assistant_id = a.id WHERE c.id = ?1",
                    params![conv_id],
                    |row| Ok(Some((row.get(0)?, row.get(1)?, row.get(2)?))),
                )
                .unwrap_or(None);

            if let Some((sp, t, tp)) = result {
                system_prompt = sp;
                temperature = t;
                top_p = tp;
            }
        }

        (
            model_name,
            provider_type,
            base_url,
            api_key,
            system_prompt,
            temperature,
            top_p,
        )
    };

    let mut full_content = String::new();

    let body = serde_json::json!({
        "messages": input
            .messages
            .iter()
            .map(|m| serde_json::json!({
                "id": m.id,
                "role": m.role,
                "content": m.content,
            }))
            .collect::<Vec<serde_json::Value>>(),
        "model": model_name,
        "provider": {
            "type": provider_type,
            "apiKey": api_key,
            "baseUrl": base_url,
        },
        "assistantConfig": {
            "systemPrompt": system_prompt,
            "temperature": temperature,
            "topP": top_p,
        }
    });

    desktop_runtime::stream_chat_via_sidecar(&app, &body, |event| {
        if CHAT_ABORT.load(Ordering::SeqCst) {
            app.emit("chat-abort", ()).ok();
            return Err("CHAT_ABORTED".to_string());
        }

        let event_type = event["type"].as_str().unwrap_or_default();
        match event_type {
            "token" => {
                if let Some(token) = event["token"].as_str() {
                    full_content.push_str(token);
                    app.emit("chat-token", token).ok();
                }
            }
            "done" => {
                if let Some(text) = event["text"].as_str() {
                    full_content = text.to_string();
                }
            }
            "error" => {
                let message = event["error"]["message"]
                    .as_str()
                    .unwrap_or("Unknown sidecar error")
                    .to_string();
                return Err(message);
            }
            "abort" => {
                app.emit("chat-abort", ()).ok();
            }
            _ => {}
        }

        Ok(())
    })
    .await
    .or_else(|e| if e == "CHAT_ABORTED" { Ok(()) } else { Err(e) })?;

    if CHAT_ABORT.load(Ordering::SeqCst) {
        return Ok(());
    }

    app.emit("chat-done", &full_content).ok();

    if let Some(ref conv_id) = input.conversation_id {
        let conn = state.0.lock().map_err(|e| e.to_string())?;
        let id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO message (id, conversation_id, role, content) VALUES (?1, ?2, 'assistant', ?3)",
            params![id, conv_id, full_content],
        )
        .map_err(|e| e.to_string())?;

        conn.execute(
            "UPDATE conversation SET updated_at = datetime('now') WHERE id = ?1",
            params![conv_id],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub fn abort_chat() -> Result<(), String> {
    CHAT_ABORT.store(true, Ordering::SeqCst);
    Ok(())
}
