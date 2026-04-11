use crate::db::DbState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
pub struct Stats {
    pub conversations: i64,
    pub messages: i64,
}

#[tauri::command]
pub fn get_stats(state: State<DbState>) -> Result<Stats, String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    let conversations: i64 = conn
        .query_row("SELECT COUNT(*) FROM conversation", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    let messages: i64 = conn
        .query_row("SELECT COUNT(*) FROM message", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    Ok(Stats {
        conversations,
        messages,
    })
}

#[tauri::command]
pub fn reset_data(state: State<DbState>) -> Result<(), String> {
    let conn = state.0.lock().map_err(|e| e.to_string())?;

    conn.execute("DELETE FROM message", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM conversation", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM model", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM assistant", [])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM provider", [])
        .map_err(|e| e.to_string())?;

    Ok(())
}
