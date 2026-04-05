use crate::db::DbState;
use rusqlite::params;
use tauri::State;

#[tauri::command]
pub fn search_messages(query: String, state: State<DbState>) -> Result<serde_json::Value, String> {
    if query.len() < 2 {
        return Ok(serde_json::json!({"results": []}));
    }

    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let pattern = format!("%{}%", query);

    let mut stmt = conn
        .prepare(
            "SELECT m.id, m.content, m.created_at, c.id, c.title \
             FROM message m JOIN conversation c ON m.conversation_id = c.id \
             WHERE m.content LIKE ?1 ORDER BY m.created_at DESC LIMIT 50",
        )
        .map_err(|e| e.to_string())?;

    let results: Vec<serde_json::Value> = stmt
        .query_map(params![pattern], |row| {
            let msg_id: String = row.get(0)?;
            let content: String = row.get(1)?;
            let created_at: String = row.get(2)?;
            let conv_id: String = row.get(3)?;
            let conv_title: String = row.get(4).unwrap_or_else(|_| "Untitled".to_string());

            let snippet = get_snippet(&content, &query, 150);

            Ok(serde_json::json!({
                "messageId": msg_id,
                "snippet": snippet,
                "createdAt": created_at,
                "conversationId": conv_id,
                "conversationTitle": conv_title,
            }))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    Ok(serde_json::json!({"results": results}))
}

fn get_snippet(content: &str, query: &str, length: usize) -> String {
    let lower_content = content.to_lowercase();
    let lower_query = query.to_lowercase();

    if let Some(idx) = lower_content.find(&lower_query) {
        let start = idx.saturating_sub(length / 2);
        let end = (idx + query.len() + length / 2).min(content.len());

        let mut snippet = String::new();
        if start > 0 {
            snippet.push_str("...");
        }
        snippet.push_str(&content[start..end]);
        if end < content.len() {
            snippet.push_str("...");
        }
        snippet
    } else {
        let end = length.min(content.len());
        let mut snippet = content[..end].to_string();
        if content.len() > length {
            snippet.push_str("...");
        }
        snippet
    }
}
