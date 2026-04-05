use crate::db::{Assistant, DbState};
use rusqlite::params;
use serde::Deserialize;
use tauri::State;

#[tauri::command]
pub fn get_assistants(id: Option<String>, state: State<DbState>) -> Result<serde_json::Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(id) = id {
        let mut stmt = conn
            .prepare("SELECT id, name, image, system_prompt, temperature, top_p, enabled, is_default, created_at, updated_at FROM assistant WHERE id = ?1")
            .map_err(|e| e.to_string())?;

        let assistant = stmt
            .query_row(params![id], |row| {
                Ok(Assistant {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    image: row.get(2)?,
                    system_prompt: row.get(3)?,
                    temperature: row.get(4)?,
                    top_p: row.get(5)?,
                    enabled: row.get(6)?,
                    is_default: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                })
            })
            .map_err(|e| e.to_string())?;

        return Ok(serde_json::to_value(assistant).map_err(|e| e.to_string())?);
    }

    let mut stmt = conn
        .prepare("SELECT id, name, image, system_prompt, temperature, top_p, enabled, is_default, created_at, updated_at FROM assistant ORDER BY is_default DESC")
        .map_err(|e| e.to_string())?;

    let assistants = stmt
        .query_map([], |row| {
            Ok(Assistant {
                id: row.get(0)?,
                name: row.get(1)?,
                image: row.get(2)?,
                system_prompt: row.get(3)?,
                temperature: row.get(4)?,
                top_p: row.get(5)?,
                enabled: row.get(6)?,
                is_default: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(assistants).map_err(|e| e.to_string())?)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateAssistantInput {
    pub name: String,
    pub system_prompt: String,
    pub temperature: Option<f64>,
    pub top_p: Option<f64>,
    pub is_default: Option<bool>,
    pub enabled: Option<bool>,
}

#[tauri::command]
pub fn create_assistant(input: CreateAssistantInput, state: State<DbState>) -> Result<Assistant, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    let is_default = input.is_default.unwrap_or(false);
    let enabled = input.enabled.unwrap_or(true);

    if is_default {
        conn.execute("UPDATE assistant SET is_default = 0", [])
            .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "INSERT INTO assistant (id, name, system_prompt, temperature, top_p, is_default, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![id, input.name, input.system_prompt, input.temperature.unwrap_or(0.7), input.top_p.unwrap_or(1.0), is_default, enabled],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare("SELECT id, name, image, system_prompt, temperature, top_p, enabled, is_default, created_at, updated_at FROM assistant WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| {
        Ok(Assistant {
            id: row.get(0)?,
            name: row.get(1)?,
            image: row.get(2)?,
            system_prompt: row.get(3)?,
            temperature: row.get(4)?,
            top_p: row.get(5)?,
            enabled: row.get(6)?,
            is_default: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })
    .map_err(|e| e.to_string())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAssistantInput {
    pub id: String,
    pub name: Option<String>,
    pub system_prompt: Option<String>,
    pub temperature: Option<f64>,
    pub top_p: Option<f64>,
    pub is_default: Option<bool>,
    pub enabled: Option<bool>,
    pub image: Option<String>,
}

#[tauri::command]
pub fn update_assistant(input: UpdateAssistantInput, state: State<DbState>) -> Result<Assistant, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if input.is_default == Some(true) {
        conn.execute("UPDATE assistant SET is_default = 0", [])
            .map_err(|e| e.to_string())?;
    }

    let mut updates = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref v) = input.name { updates.push("name = ?"); param_values.push(Box::new(v.clone())); }
    if let Some(ref v) = input.system_prompt { updates.push("system_prompt = ?"); param_values.push(Box::new(v.clone())); }
    if let Some(v) = input.temperature { updates.push("temperature = ?"); param_values.push(Box::new(v)); }
    if let Some(v) = input.top_p { updates.push("top_p = ?"); param_values.push(Box::new(v)); }
    if let Some(v) = input.is_default { updates.push("is_default = ?"); param_values.push(Box::new(v)); }
    if let Some(v) = input.enabled { updates.push("enabled = ?"); param_values.push(Box::new(v)); }
    if input.image.is_some() { updates.push("image = ?"); param_values.push(Box::new(input.image.clone())); }

    if !updates.is_empty() {
        updates.push("updated_at = datetime('now')");
        param_values.push(Box::new(input.id.clone()));

        let sql = format!("UPDATE assistant SET {} WHERE id = ?", updates.join(", "));
        let params: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
        conn.execute(&sql, params.as_slice()).map_err(|e| e.to_string())?;
    }

    let mut stmt = conn
        .prepare("SELECT id, name, image, system_prompt, temperature, top_p, enabled, is_default, created_at, updated_at FROM assistant WHERE id = ?1")
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![input.id], |row| {
        Ok(Assistant {
            id: row.get(0)?,
            name: row.get(1)?,
            image: row.get(2)?,
            system_prompt: row.get(3)?,
            temperature: row.get(4)?,
            top_p: row.get(5)?,
            enabled: row.get(6)?,
            is_default: row.get(7)?,
            created_at: row.get(8)?,
            updated_at: row.get(9)?,
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_assistant(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM assistant", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if count <= 1 {
        return Err("Cannot delete the last assistant".to_string());
    }

    let is_default: bool = conn
        .query_row("SELECT is_default FROM assistant WHERE id = ?1", params![id], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if is_default {
        conn.execute(
            "UPDATE assistant SET is_default = 1 WHERE id != ?1 LIMIT 1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute("DELETE FROM assistant WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}
