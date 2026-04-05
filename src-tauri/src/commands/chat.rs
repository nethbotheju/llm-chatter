use crate::crypto;
use crate::db::DbState;
use futures_util::StreamExt;
use rusqlite::params;
use serde::Deserialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{AppHandle, Emitter, State};

static CHAT_ABORT: AtomicBool = AtomicBool::new(false);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
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

    // Extract all DB data in a scope to drop the MutexGuard before any .await
    let (model_name, provider_type, base_url, api_key, system_prompt, temperature, top_p) = {
        let conn = state.0.lock().map_err(|e| e.to_string())?;

        let (model_name, provider_type, base_url, api_key_encrypted): (String, String, Option<String>, Option<String>) =
            conn.query_row(
                "SELECT m.name, p.type, p.base_url, p.api_key_encrypted FROM model m JOIN provider p ON m.provider_id = p.id WHERE m.id = ?1 AND m.enabled = 1 AND p.enabled = 1",
                params![input.model_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .map_err(|e| format!("Model not found: {}", e))?;

        let api_key = api_key_encrypted
            .as_deref()
            .map(crypto::decrypt)
            .transpose()?
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

        (model_name, provider_type, base_url, api_key, system_prompt, temperature, top_p)
    }; // conn is dropped here

    // Build messages for API
    let mut api_messages: Vec<serde_json::Value> = Vec::new();
    if !system_prompt.is_empty() {
        api_messages.push(serde_json::json!({
            "role": "system",
            "content": system_prompt
        }));
    }
    for msg in &input.messages {
        api_messages.push(serde_json::json!({
            "role": msg.role,
            "content": msg.content
        }));
    }

    let client = reqwest::Client::new();
    let mut full_content = String::new();

    match provider_type.as_str() {
        "openai" | "openai-compatible" => {
            let url = format!(
                "{}/chat/completions",
                base_url.unwrap_or_else(|| "https://api.openai.com/v1".to_string())
            );

            let body = serde_json::json!({
                "model": model_name,
                "messages": api_messages,
                "stream": true,
                "temperature": temperature,
                "top_p": top_p,
            });

            let resp = client
                .post(&url)
                .header("Authorization", format!("Bearer {}", api_key))
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                if CHAT_ABORT.load(Ordering::SeqCst) {
                    app.emit("chat-abort", ()).ok();
                    return Ok(());
                }

                let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
                buffer.push_str(&String::from_utf8_lossy(&chunk));

                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();

                    if let Some(data) = line.strip_prefix("data: ") {
                        if data == "[DONE]" {
                            break;
                        }
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(content) = parsed["choices"][0]["delta"]["content"].as_str() {
                                full_content.push_str(content);
                                app.emit("chat-token", content).ok();
                            }
                        }
                    }
                }
            }
        }
        "anthropic" | "anthropic-compatible" => {
            let url = format!(
                "{}/v1/messages",
                base_url.unwrap_or_else(|| "https://api.anthropic.com".to_string())
            );

            let mut anthropic_messages: Vec<serde_json::Value> = Vec::new();
            let mut system_msg = String::new();

            for msg in &api_messages {
                if msg["role"] == "system" {
                    system_msg = msg["content"].as_str().unwrap_or("").to_string();
                } else {
                    anthropic_messages.push(msg.clone());
                }
            }

            let body = serde_json::json!({
                "model": model_name,
                "messages": anthropic_messages,
                "system": system_msg,
                "stream": true,
                "max_tokens": 4096,
                "temperature": temperature,
                "top_p": top_p,
            });

            let resp = client
                .post(&url)
                .header("x-api-key", &api_key)
                .header("anthropic-version", "2023-06-01")
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                if CHAT_ABORT.load(Ordering::SeqCst) {
                    app.emit("chat-abort", ()).ok();
                    return Ok(());
                }

                let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
                buffer.push_str(&String::from_utf8_lossy(&chunk));

                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();

                    if let Some(data) = line.strip_prefix("data: ") {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            if parsed["type"] == "content_block_delta" {
                                if let Some(text) = parsed["delta"]["text"].as_str() {
                                    full_content.push_str(text);
                                    app.emit("chat-token", text).ok();
                                }
                            }
                        }
                    }
                }
            }
        }
        "google" => {
            let url = format!(
                "{}/v1beta/models/{}:streamGenerateContent?alt=sse&key={}",
                base_url.unwrap_or_else(|| "https://generativelanguage.googleapis.com".to_string()),
                model_name,
                api_key
            );

            let mut contents: Vec<serde_json::Value> = Vec::new();
            for msg in &api_messages {
                if msg["role"] != "system" {
                    contents.push(serde_json::json!({
                        "role": if msg["role"] == "assistant" { "model" } else { "user" },
                        "parts": [{"text": msg["content"]}]
                    }));
                }
            }

            let mut body = serde_json::json!({
                "contents": contents,
                "generationConfig": {
                    "temperature": temperature,
                    "topP": top_p,
                }
            });

            if !system_prompt.is_empty() {
                body["systemInstruction"] = serde_json::json!({
                    "parts": [{"text": system_prompt}]
                });
            }

            let resp = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&body)
                .send()
                .await
                .map_err(|e| format!("Request failed: {}", e))?;

            let mut stream = resp.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                if CHAT_ABORT.load(Ordering::SeqCst) {
                    app.emit("chat-abort", ()).ok();
                    return Ok(());
                }

                let chunk = chunk.map_err(|e| format!("Stream error: {}", e))?;
                buffer.push_str(&String::from_utf8_lossy(&chunk));

                while let Some(pos) = buffer.find('\n') {
                    let line = buffer[..pos].trim().to_string();
                    buffer = buffer[pos + 1..].to_string();

                    if let Some(data) = line.strip_prefix("data: ") {
                        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                            if let Some(text) = parsed["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                                full_content.push_str(text);
                                app.emit("chat-token", text).ok();
                            }
                        }
                    }
                }
            }
        }
        _ => return Err(format!("Unknown provider type: {}", provider_type)),
    }

    app.emit("chat-done", &full_content).ok();

    // Save assistant message (new scope for the lock)
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
