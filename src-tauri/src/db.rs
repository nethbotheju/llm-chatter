use rusqlite::{params, Connection, Row};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct DbState(pub Mutex<Connection>);

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provider {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub provider_type: String,
    pub base_url: Option<String>,
    pub api_key_encrypted: Option<String>,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Provider {
    pub fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            provider_type: row.get("type")?,
            base_url: row.get("base_url")?,
            api_key_encrypted: row.get("api_key_encrypted")?,
            enabled: row.get("enabled")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Model {
    pub id: String,
    pub name: String,
    pub provider_id: String,
    pub capabilities: String,
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Model {
    pub fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            provider_id: row.get("provider_id")?,
            capabilities: row.get("capabilities")?,
            enabled: row.get("enabled")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Assistant {
    pub id: String,
    pub name: String,
    pub image: Option<String>,
    pub system_prompt: String,
    pub temperature: f64,
    pub top_p: f64,
    pub enabled: bool,
    pub is_default: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl Assistant {
    pub fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Self {
            id: row.get("id")?,
            name: row.get("name")?,
            image: row.get("image")?,
            system_prompt: row.get("system_prompt")?,
            temperature: row.get("temperature")?,
            top_p: row.get("top_p")?,
            enabled: row.get("enabled")?,
            is_default: row.get("is_default")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: Option<String>,
    pub assistant_id: String,
    pub created_at: String,
    pub updated_at: String,
}

impl Conversation {
    pub fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Self {
            id: row.get("id")?,
            title: row.get("title")?,
            assistant_id: row.get("assistant_id")?,
            created_at: row.get("created_at")?,
            updated_at: row.get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub thinking: Option<String>,
    pub attachments: Option<String>,
    pub created_at: String,
}

impl Message {
    pub fn from_row(row: &Row) -> Result<Self, rusqlite::Error> {
        Ok(Self {
            id: row.get("id")?,
            conversation_id: row.get("conversation_id")?,
            role: row.get("role")?,
            content: row.get("content")?,
            thinking: row.get("thinking")?,
            attachments: row.get("attachments")?,
            created_at: row.get("created_at")?,
        })
    }
}

fn get_db_path(app: &AppHandle) -> std::path::PathBuf {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");
    std::fs::create_dir_all(&app_data_dir).ok();
    app_data_dir.join("ilm-chatter.db")
}

fn seed_default_assistants(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    let existing_count: i64 =
        conn.query_row("SELECT COUNT(*) FROM assistant", [], |row| row.get(0))?;

    if existing_count > 0 {
        return Ok(());
    }

    let defaults = [
        (
            "General",
            "You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and thoughtful responses.",
            0.7_f64,
            1.0_f64,
            true,
        ),
        (
            "Code Expert",
            "You are an expert software developer. Provide clean, efficient, and well-documented code. Explain your reasoning and consider edge cases.",
            0.3_f64,
            0.95_f64,
            false,
        ),
        (
            "Creative Writer",
            "You are a creative writing assistant. Be imaginative, expressive, and help craft engaging content. Think outside the box.",
            0.9_f64,
            1.0_f64,
            false,
        ),
        (
            "Analyst",
            "You are a data analyst and critical thinker. Provide structured, logical analysis. Be thorough and consider multiple perspectives.",
            0.5_f64,
            0.9_f64,
            false,
        ),
    ];

    for (name, system_prompt, temperature, top_p, is_default) in defaults {
        conn.execute(
            "INSERT INTO assistant (id, name, system_prompt, temperature, top_p, is_default, enabled) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
            params![uuid::Uuid::new_v4().to_string(), name, system_prompt, temperature, top_p, is_default],
        )?;
    }

    Ok(())
}

pub fn init_database(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let db_path = get_db_path(app);
    let conn = Connection::open(&db_path)?;

    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;")?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS provider (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            base_url TEXT,
            api_key_encrypted TEXT,
            enabled BOOLEAN NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS model (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider_id TEXT NOT NULL REFERENCES provider(id) ON DELETE CASCADE,
            capabilities TEXT NOT NULL DEFAULT '[\"chat\"]',
            enabled BOOLEAN NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(provider_id, name)
        );

        CREATE TABLE IF NOT EXISTS assistant (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            image TEXT,
            system_prompt TEXT NOT NULL DEFAULT '',
            temperature REAL NOT NULL DEFAULT 0.7,
            top_p REAL NOT NULL DEFAULT 1.0,
            enabled BOOLEAN NOT NULL DEFAULT 1,
            is_default BOOLEAN NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS conversation (
            id TEXT PRIMARY KEY,
            title TEXT,
            assistant_id TEXT NOT NULL REFERENCES assistant(id),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_conversation_assistant_id ON conversation(assistant_id);
        CREATE INDEX IF NOT EXISTS idx_conversation_created_at ON conversation(created_at);

        CREATE TABLE IF NOT EXISTS message (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL REFERENCES conversation(id) ON DELETE CASCADE,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            thinking TEXT,
            attachments TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_message_conversation_id ON message(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_message_created_at ON message(created_at);",
    )?;

    seed_default_assistants(&conn)?;

    let conn = Mutex::new(conn);
    app.manage(DbState(conn));

    Ok(())
}
