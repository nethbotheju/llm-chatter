use crate::db::{Conversation, DbState, Message};
use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Serialize)]
pub struct ConversationWithCount {
    #[serde(flatten)]
    pub conversation: Conversation,
    pub message_count: i64,
}

#[tauri::command]
pub fn get_conversations(state: State<DbState>) -> Result<Vec<ConversationWithCount>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT c.id, c.title, c.assistant_id, c.created_at, c.updated_at, COUNT(m.id) as msg_count \
             FROM conversation c LEFT JOIN message m ON c.id = m.conversation_id \
             GROUP BY c.id ORDER BY c.updated_at DESC",
        )
        .map_err(|e| e.to_string())?;

    let results = stmt
        .query_map([], |row| {
            Ok(ConversationWithCount {
                conversation: Conversation::from_row(row)?,
                message_count: row.get("msg_count")?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(results)
}

#[derive(Serialize)]
pub struct ConversationDetail {
    #[serde(flatten)]
    pub conversation: Conversation,
    pub messages: Vec<Message>,
    pub assistant: serde_json::Value,
}

fn query_messages(
    conn: &rusqlite::Connection,
    conversation_id: &str,
) -> Result<Vec<Message>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, conversation_id, role, content, thinking, attachments, created_at \
             FROM message WHERE conversation_id = ?1 ORDER BY created_at ASC",
        )
        .map_err(|e| e.to_string())?;

    let messages: Vec<Message> = stmt
        .query_map(params![conversation_id], |row| Message::from_row(row))
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;

    Ok(messages)
}

fn fetch_conversation_detail(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<ConversationDetail, String> {
    let conv: Conversation = conn
        .query_row(
            "SELECT id, title, assistant_id, created_at, updated_at FROM conversation WHERE id = ?1",
            params![id],
            |row| Conversation::from_row(row),
        )
        .map_err(|e| e.to_string())?;

    let assistant: serde_json::Value = conn
        .query_row(
            "SELECT id, name, system_prompt, temperature, top_p FROM assistant WHERE id = ?1",
            params![conv.assistant_id],
            |row| {
                Ok(serde_json::json!({
                    "id": row.get::<_, String>(0)?,
                    "name": row.get::<_, String>(1)?,
                    "systemPrompt": row.get::<_, String>(2)?,
                    "temperature": row.get::<_, f64>(3)?,
                    "topP": row.get::<_, f64>(4)?,
                }))
            },
        )
        .unwrap_or(serde_json::json!(null));

    let messages = query_messages(conn, id)?;

    Ok(ConversationDetail {
        conversation: conv,
        messages,
        assistant,
    })
}

#[tauri::command]
pub fn get_conversation(id: String, state: State<DbState>) -> Result<ConversationDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    fetch_conversation_detail(&conn, &id)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateConversationInput {
    pub assistant_id: Option<String>,
    pub title: Option<String>,
}

#[tauri::command]
pub fn create_conversation(
    input: CreateConversationInput,
    state: State<DbState>,
) -> Result<ConversationDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();

    let assistant_id = match input.assistant_id {
        Some(aid) => aid,
        None => conn
            .query_row(
                "SELECT id FROM assistant WHERE is_default = 1 LIMIT 1",
                [],
                |row| row.get::<_, String>(0),
            )
            .map_err(|_| "No assistant available".to_string())?,
    };

    conn.execute(
        "INSERT INTO conversation (id, title, assistant_id) VALUES (?1, ?2, ?3)",
        params![id, input.title, assistant_id],
    )
    .map_err(|e| e.to_string())?;

    fetch_conversation_detail(&conn, &id)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateConversationInput {
    pub id: String,
    pub title: Option<String>,
}

#[tauri::command]
pub fn update_conversation(
    input: UpdateConversationInput,
    state: State<DbState>,
) -> Result<ConversationDetail, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if let Some(ref title) = input.title {
        conn.execute(
            "UPDATE conversation SET title = ?1, updated_at = datetime('now') WHERE id = ?2",
            params![title, input.id],
        )
        .map_err(|e| e.to_string())?;
    }

    fetch_conversation_detail(&conn, &input.id)
}

#[tauri::command]
pub fn delete_conversations(
    id: Option<String>,
    all: Option<bool>,
    state: State<DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    if all == Some(true) {
        conn.execute("DELETE FROM message", [])
            .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM conversation", [])
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let id = id.ok_or("ID is required")?;
    conn.execute("DELETE FROM conversation WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_messages(
    conversation_id: String,
    state: State<DbState>,
) -> Result<Vec<Message>, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    query_messages(&conn, &conversation_id)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateMessageInput {
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub thinking: Option<String>,
    pub attachments: Option<String>,
}

#[tauri::command]
pub fn create_message(input: CreateMessageInput, state: State<DbState>) -> Result<Message, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO message (id, conversation_id, role, content, thinking, attachments) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, input.conversation_id, input.role, input.content, input.thinking, input.attachments],
    )
    .map_err(|e| e.to_string())?;

    conn.execute(
        "UPDATE conversation SET updated_at = datetime('now') WHERE id = ?1",
        params![input.conversation_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(Message {
        id,
        conversation_id: input.conversation_id,
        role: input.role,
        content: input.content,
        thinking: input.thinking,
        attachments: input.attachments,
        created_at: String::new(),
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateMessageInput {
    pub message_id: String,
    pub conversation_id: String,
    pub content: String,
}

#[tauri::command]
pub fn update_message(input: UpdateMessageInput, state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE message SET content = ?1 WHERE id = ?2 AND conversation_id = ?3",
        params![input.content, input.message_id, input.conversation_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn delete_message(
    message_id: String,
    conversation_id: String,
    state: State<DbState>,
) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM message WHERE id = ?1 AND conversation_id = ?2",
        params![message_id, conversation_id],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
