use crate::db::DbState;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn export_data(state: State<DbState>) -> Result<serde_json::Value, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let mut conv_stmt = conn
        .prepare(
            "SELECT c.id, c.title, c.created_at, a.name as assistant_name \
             FROM conversation c JOIN assistant a ON c.assistant_id = a.id \
             ORDER BY c.created_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let conversations: Vec<serde_json::Value> = conv_stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let title: Option<String> = row.get(1)?;
            let created_at: String = row.get(2)?;
            let assistant_name: String = row.get(3)?;

            Ok(serde_json::json!({
                "id": id,
                "title": title,
                "assistant": assistant_name,
                "createdAt": created_at,
                "messages": [],
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    drop(conv_stmt);

    let mut result = Vec::new();
    for mut conv in conversations {
        let conv_id = conv["id"].as_str().unwrap_or("");

        let mut msg_stmt = conn
            .prepare(
                "SELECT role, content, thinking, created_at FROM message WHERE conversation_id = ?1 ORDER BY created_at ASC",
            )
            .map_err(|e| e.to_string())?;

        let messages: Vec<serde_json::Value> = msg_stmt
            .query_map(params![conv_id], |row| {
                Ok(serde_json::json!({
                    "role": row.get::<_, String>(0)?,
                    "content": row.get::<_, String>(1)?,
                    "thinking": row.get::<_, Option<String>>(2)?,
                    "createdAt": row.get::<_, String>(3)?,
                }))
            })
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        conv["messages"] = serde_json::Value::Array(messages);
        result.push(conv);
    }

    Ok(serde_json::json!({
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "conversations": result,
    }))
}
