use crate::crypto;
use crate::db::{DbState, Provider};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
pub struct ProviderView {
    #[serde(flatten)]
    pub provider: Provider,
    pub has_api_key: bool,
}

impl ProviderView {
    fn from_provider(p: Provider) -> Self {
        let has_api_key = p.api_key_encrypted.is_some();
        Self {
            provider: Provider {
                api_key_encrypted: None,
                ..p
            },
            has_api_key,
        }
    }
}

#[tauri::command]
pub fn get_providers(state: State<DbState>) -> Result<Vec<ProviderView>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, name, type, base_url, api_key_encrypted, enabled, created_at, updated_at FROM provider ORDER BY name ASC")
        .map_err(|e| e.to_string())?;

    let providers = stmt
        .query_map([], |row| {
            Ok(Provider {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_type: row.get(2)?,
                base_url: row.get(3)?,
                api_key_encrypted: row.get(4)?,
                enabled: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(providers.into_iter().map(ProviderView::from_provider).collect())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProviderInput {
    pub name: String,
    #[serde(rename = "type")]
    pub provider_type: String,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub enabled: Option<bool>,
}

#[tauri::command]
pub fn create_provider(input: CreateProviderInput, state: State<DbState>) -> Result<ProviderView, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let api_key_encrypted = input
        .api_key
        .as_deref()
        .map(|k| crypto::encrypt(k))
        .transpose()?;
    let enabled = input.enabled.unwrap_or(true);

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO provider (id, name, type, base_url, api_key_encrypted, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, input.name, input.provider_type, input.base_url, api_key_encrypted, enabled],
    )
    .map_err(|e| e.to_string())?;

    let provider = Provider {
        id,
        name: input.name,
        provider_type: input.provider_type,
        base_url: input.base_url,
        api_key_encrypted,
        enabled,
        created_at: String::new(),
        updated_at: String::new(),
    };

    Ok(ProviderView::from_provider(provider))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProviderInput {
    pub id: String,
    pub name: Option<String>,
    #[serde(rename = "type")]
    pub provider_type: Option<String>,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
    pub enabled: Option<bool>,
}

#[tauri::command]
pub fn update_provider(input: UpdateProviderInput, state: State<DbState>) -> Result<ProviderView, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut updates = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref name) = input.name {
        updates.push("name = ?");
        param_values.push(Box::new(name.clone()));
    }
    if let Some(ref pt) = input.provider_type {
        updates.push("type = ?");
        param_values.push(Box::new(pt.clone()));
    }
    if input.base_url.is_some() {
        updates.push("base_url = ?");
        param_values.push(Box::new(input.base_url.clone()));
    }
    if input.api_key.is_some() {
        let encrypted = input.api_key.as_deref().map(|k| crypto::encrypt(k)).transpose()?;
        updates.push("api_key_encrypted = ?");
        param_values.push(Box::new(encrypted));
    }
    if let Some(enabled) = input.enabled {
        updates.push("enabled = ?");
        param_values.push(Box::new(enabled));
    }

    if updates.is_empty() {
        return Err("No fields to update".to_string());
    }

    updates.push("updated_at = datetime('now')");
    param_values.push(Box::new(input.id.clone()));

    let sql = format!("UPDATE provider SET {} WHERE id = ?", updates.join(", "));
    let params: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, params.as_slice()).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, type, base_url, api_key_encrypted, enabled, created_at, updated_at FROM provider WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    let provider = stmt
        .query_row(params![input.id], |row| {
            Ok(Provider {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_type: row.get(2)?,
                base_url: row.get(3)?,
                api_key_encrypted: row.get(4)?,
                enabled: row.get(5)?,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| e.to_string())?;

    Ok(ProviderView::from_provider(provider))
}

#[tauri::command]
pub fn delete_provider(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM provider WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
pub struct ValidateProviderInput {
    pub provider_id: Option<String>,
    pub name: Option<String>,
    #[serde(rename = "type")]
    pub provider_type: Option<String>,
    pub base_url: Option<String>,
    pub api_key: Option<String>,
}

#[tauri::command]
pub async fn validate_provider(input: ValidateProviderInput, _state: State<'_, DbState>) -> Result<serde_json::Value, String> {
    let api_key = input.api_key.ok_or("API key is required")?;
    let provider_type = input.provider_type.ok_or("Provider type is required")?;

    let base_url = input.base_url.unwrap_or_else(|| match provider_type.as_str() {
        "openai" | "openai-compatible" => "https://api.openai.com/v1".to_string(),
        "anthropic" | "anthropic-compatible" => "https://api.anthropic.com".to_string(),
        "google" => "https://generativelanguage.googleapis.com".to_string(),
        _ => String::new(),
    });

    let client = reqwest::Client::new();
    let result = match provider_type.as_str() {
        "openai" | "openai-compatible" => {
            let url = format!("{}/chat/completions", base_url);
            client
                .post(&url)
                .header("Authorization", format!("Bearer {}", api_key))
                .json(&serde_json::json!({
                    "model": "gpt-4o-mini",
                    "messages": [{"role": "user", "content": "Reply with: ok"}],
                    "max_tokens": 5
                }))
                .send()
                .await
        }
        "anthropic" | "anthropic-compatible" => {
            let url = format!("{}/v1/messages", base_url);
            client
                .post(&url)
                .header("x-api-key", &api_key)
                .header("anthropic-version", "2023-06-01")
                .json(&serde_json::json!({
                    "model": "claude-3-haiku-20240307",
                    "messages": [{"role": "user", "content": "Reply with: ok"}],
                    "max_tokens": 5
                }))
                .send()
                .await
        }
        "google" => {
            let url = format!(
                "{}/v1beta/models/gemini-1.5-flash:generateContent?key={}",
                base_url, api_key
            );
            client
                .post(&url)
                .json(&serde_json::json!({
                    "contents": [{"parts": [{"text": "Reply with: ok"}]}]
                }))
                .send()
                .await
        }
        _ => return Err(format!("Unknown provider type: {}", provider_type)),
    };

    match result {
        Ok(resp) if resp.status().is_success() => Ok(serde_json::json!({"valid": true})),
        Ok(resp) => {
            let status = resp.status();
            let body = resp.text().await.unwrap_or_default();
            Ok(serde_json::json!({
                "valid": false,
                "error": format!("HTTP {}: {}", status, body.chars().take(200).collect::<String>())
            }))
        }
        Err(e) => Ok(serde_json::json!({"valid": false, "error": e.to_string()})),
    }
}
