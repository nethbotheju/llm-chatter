use std::sync::Mutex;
use std::time::Duration;

use reqwest::header::{HeaderMap, AUTHORIZATION};
use serde::Serialize;
use tauri::Manager;
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Clone, Serialize)]
pub struct DesktopRuntimeConfig {
    pub port: u16,
    pub token: String,
}

impl Default for DesktopRuntimeConfig {
    fn default() -> Self {
        Self {
            port: 0,
            token: String::new(),
        }
    }
}

struct SidecarProcess {
    config: DesktopRuntimeConfig,
    child: Option<CommandChild>,
}

pub struct DesktopRuntimeState {
    process: Mutex<SidecarProcess>,
    http_client: reqwest::Client,
    db_path: String,
    master_secret: String,
}

pub fn init_runtime_state(app: &impl Manager<tauri::Wry>, db_path: String, master_secret: String) {
    app.manage(DesktopRuntimeState {
        process: Mutex::new(SidecarProcess {
            config: DesktopRuntimeConfig::default(),
            child: None,
        }),
        http_client: reqwest::Client::new(),
        db_path,
        master_secret,
    });
}

async fn is_sidecar_healthy(http_client: &reqwest::Client, port: u16, token: &str) -> bool {
    let url = format!("http://127.0.0.1:{}/health", port);
    let mut headers = HeaderMap::new();
    if !token.is_empty() {
        headers.insert(AUTHORIZATION, format!("Bearer {}", token).parse().unwrap());
    }

    http_client
        .get(&url)
        .headers(headers)
        .timeout(Duration::from_secs(2))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

pub async fn ensure_sidecar_started(app: &tauri::AppHandle) -> Result<DesktopRuntimeConfig, String> {
    let state = app.state::<DesktopRuntimeState>();

    let cached = {
        let proc = state.process.lock().map_err(|e| e.to_string())?;
        if proc.config.port > 0 && !proc.config.token.is_empty() {
            Some((proc.config.port, proc.config.token.clone()))
        } else {
            None
        }
    };

    if let Some((port, token)) = cached {
        if is_sidecar_healthy(&state.http_client, port, &token).await {
            let proc = state.process.lock().map_err(|e| e.to_string())?;
            return Ok(proc.config.clone());
        }
    }

    let token = uuid::Uuid::new_v4().to_string();

    let sidecar_command = app
        .shell()
        .sidecar("desktop-runtime")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?
        .env("DESKTOP_RUNTIME_TOKEN", &token)
        .env("DESKTOP_RUNTIME_PORT", "0")
        .env("DESKTOP_RUNTIME_DB_PATH", &state.db_path)
        .env("DESKTOP_RUNTIME_MASTER_SECRET", &state.master_secret);

    let (mut rx, child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let mut resolved_port: Option<u16> = None;
    let mut diagnostics: Vec<String> = Vec::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line = String::from_utf8_lossy(&line);
                let trimmed = line.trim().to_string();
                if trimmed.is_empty() {
                    continue;
                }
                if let Some(port_str) = trimmed.strip_prefix("DESKTOP_RUNTIME_READY:") {
                    if let Ok(port) = port_str.parse::<u16>() {
                        resolved_port = Some(port);
                        break;
                    }
                }
                diagnostics.push(trimmed);
            }
            CommandEvent::Stderr(line) => {
                let line = String::from_utf8_lossy(&line);
                let trimmed = line.trim().to_string();
                if !trimmed.is_empty() {
                    diagnostics.push(format!("[stderr] {}", trimmed));
                }
            }
            CommandEvent::Terminated(status) => {
                return Err(format!(
                    "Sidecar exited prematurely with status: {}. Output: {}",
                    status.code.map_or("unknown".to_string(), |c| c.to_string()),
                    diagnostics.join(" | ")
                ));
            }
            _ => {}
        }
    }

    let port = resolved_port.ok_or_else(|| {
        if diagnostics.is_empty() {
            "Sidecar did not report a port".to_string()
        } else {
            format!("Sidecar did not report a port. Output: {}", diagnostics.join(" | "))
        }
    })?;

    let runtime = DesktopRuntimeConfig { port, token };

    {
        let mut proc = state.process.lock().map_err(|e| e.to_string())?;
        proc.config = runtime.clone();
        proc.child = Some(child);
    }

    Ok(runtime)
}

pub fn kill_sidecar(app: &impl Manager<tauri::Wry>) {
    let state = app.state::<DesktopRuntimeState>();
    if let Ok(mut proc) = state.process.lock() {
        if let Some(child) = proc.child.take() {
            let _ = child.kill();
        }
        proc.config.port = 0;
        proc.config.token.clear();
    }
}

#[tauri::command]
pub async fn get_sidecar_config(app: tauri::AppHandle) -> Result<DesktopRuntimeConfig, String> {
    ensure_sidecar_started(&app).await
}
