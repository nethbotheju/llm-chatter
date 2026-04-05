use crate::db::{DbState, Model};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
pub struct ModelWithProvider {
    #[serde(flatten)]
    pub model: Model,
    pub provider: ProviderInfo,
}

#[derive(Serialize)]
pub struct ProviderInfo {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub provider_type: String,
    pub enabled: bool,
}

#[tauri::command]
pub fn get_models(
    provider_id: Option<String>,
    include_disabled: Option<bool>,
    state: State<DbState>,
) -> Result<Vec<ModelWithProvider>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut sql = String::from(
        "SELECT m.id, m.name, m.provider_id, m.capabilities, m.enabled, m.created_at, m.updated_at, \
         p.id, p.name, p.type, p.enabled \
         FROM model m JOIN provider p ON m.provider_id = p.id WHERE 1=1"
    );

    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref pid) = provider_id {
        sql.push_str(" AND m.provider_id = ?");
        param_values.push(Box::new(pid.clone()));
    }

    let include_disabled = include_disabled.unwrap_or(false);
    if !include_disabled {
        sql.push_str(" AND m.enabled = 1 AND p.enabled = 1");
    }

    sql.push_str(" ORDER BY p.name ASC, m.name ASC");

    let params: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;

    let models = stmt
        .query_map(params.as_slice(), |row| {
            Ok(ModelWithProvider {
                model: Model {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    provider_id: row.get(2)?,
                    capabilities: row.get(3)?,
                    enabled: row.get(4)?,
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                },
                provider: ProviderInfo {
                    id: row.get(7)?,
                    name: row.get(8)?,
                    provider_type: row.get(9)?,
                    enabled: row.get(10)?,
                },
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(models)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateModelInput {
    pub name: String,
    pub provider_id: String,
    pub capabilities: Option<Vec<String>>,
    pub enabled: Option<bool>,
}

#[tauri::command]
pub fn create_model(input: CreateModelInput, state: State<DbState>) -> Result<ModelWithProvider, String> {
    let id = uuid::Uuid::new_v4().to_string();
    let capabilities = serde_json::to_string(&input.capabilities.unwrap_or_else(|| vec!["chat".to_string()]))
        .map_err(|e| e.to_string())?;
    let enabled = input.enabled.unwrap_or(true);

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO model (id, name, provider_id, capabilities, enabled) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![id, input.name, input.provider_id, capabilities, enabled],
    )
    .map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT m.id, m.name, m.provider_id, m.capabilities, m.enabled, m.created_at, m.updated_at, \
             p.id, p.name, p.type, p.enabled \
             FROM model m JOIN provider p ON m.provider_id = p.id WHERE m.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![id], |row| {
        Ok(ModelWithProvider {
            model: Model {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_id: row.get(2)?,
                capabilities: row.get(3)?,
                enabled: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            },
            provider: ProviderInfo {
                id: row.get(7)?,
                name: row.get(8)?,
                provider_type: row.get(9)?,
                enabled: row.get(10)?,
            },
        })
    })
    .map_err(|e| e.to_string())
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateModelInput {
    pub id: String,
    pub name: Option<String>,
    pub capabilities: Option<Vec<String>>,
    pub enabled: Option<bool>,
}

#[tauri::command]
pub fn update_model(input: UpdateModelInput, state: State<DbState>) -> Result<ModelWithProvider, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut updates = Vec::new();
    let mut param_values: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();

    if let Some(ref name) = input.name {
        updates.push("name = ?");
        param_values.push(Box::new(name.clone()));
    }
    if let Some(ref caps) = input.capabilities {
        updates.push("capabilities = ?");
        param_values.push(Box::new(serde_json::to_string(caps).map_err(|e| e.to_string())?));
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

    let sql = format!("UPDATE model SET {} WHERE id = ?", updates.join(", "));
    let params: Vec<&dyn rusqlite::types::ToSql> = param_values.iter().map(|p| p.as_ref()).collect();
    conn.execute(&sql, params.as_slice()).map_err(|e| e.to_string())?;

    let mut stmt = conn
        .prepare(
            "SELECT m.id, m.name, m.provider_id, m.capabilities, m.enabled, m.created_at, m.updated_at, \
             p.id, p.name, p.type, p.enabled \
             FROM model m JOIN provider p ON m.provider_id = p.id WHERE m.id = ?1",
        )
        .map_err(|e| e.to_string())?;

    stmt.query_row(params![input.id], |row| {
        Ok(ModelWithProvider {
            model: Model {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_id: row.get(2)?,
                capabilities: row.get(3)?,
                enabled: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            },
            provider: ProviderInfo {
                id: row.get(7)?,
                name: row.get(8)?,
                provider_type: row.get(9)?,
                enabled: row.get(10)?,
            },
        })
    })
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_model(id: String, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM model WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
