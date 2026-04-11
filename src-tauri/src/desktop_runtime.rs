use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

use eventsource_stream::Eventsource;
use futures_util::{StreamExt, TryStreamExt};
use reqwest::header::{HeaderMap, AUTHORIZATION};
use serde_json::Value;
use tauri::Manager;
use tauri::path::BaseDirectory;

const DESKTOP_RUNTIME_ENTRY_RELATIVE: &str = "desktop-runtime/dist/server.cjs";

#[derive(Debug, Clone)]
pub struct DesktopRuntimeConfig {
    pub port: u16,
    pub token: String,
    pub pid: Option<u32>,
}

impl Default for DesktopRuntimeConfig {
    fn default() -> Self {
        Self {
            port: 0,
            token: String::new(),
            pid: None,
        }
    }
}

pub struct DesktopRuntimeState {
    pub config: Mutex<DesktopRuntimeConfig>,
    pub http_client: reqwest::Client,
}

pub fn init_runtime_state(app: &impl Manager<tauri::Wry>) {
    app.manage(DesktopRuntimeState {
        config: Mutex::new(DesktopRuntimeConfig::default()),
        http_client: reqwest::Client::new(),
    });
}

fn find_workspace_root(start: &PathBuf) -> Option<PathBuf> {
    let mut current = start.clone();
    for _ in 0..10 {
        let package_json = current.join("package.json");
        let cjs_entry = current.join(DESKTOP_RUNTIME_ENTRY_RELATIVE);
        let js_entry = current.join("desktop-runtime/dist/server.js");
        if package_json.exists() && (cjs_entry.exists() || js_entry.exists()) {
            return Some(current);
        }
        if !current.pop() {
            break;
        }
    }
    None
}

fn resolve_desktop_runtime_entry(app: &tauri::AppHandle) -> Option<PathBuf> {
    // Dev mode: walk up from cwd
    if let Ok(cwd) = std::env::current_dir() {
        if let Some(root) = find_workspace_root(&cwd) {
            let entry = root.join(DESKTOP_RUNTIME_ENTRY_RELATIVE);
            if entry.exists() {
                return Some(entry);
            }
        }
    }

    // Dev mode: walk up from executable directory
    if let Ok(exe) = std::env::current_exe() {
        if let Some(exe_dir) = exe.parent() {
            if let Some(root) = find_workspace_root(&exe_dir.to_path_buf()) {
                let entry = root.join(DESKTOP_RUNTIME_ENTRY_RELATIVE);
                if entry.exists() {
                    return Some(entry);
                }
            }
        }
    }

    // Production: Tauri bundles "../desktop-runtime/dist" as a resource,
    // replacing "../" with "_up_". resolve() handles this mapping.
    if let Ok(resolved) = app.path().resolve("../desktop-runtime/dist/server.cjs", BaseDirectory::Resource) {
        if resolved.exists() {
            return Some(resolved);
        }
    }

    None
}

fn resolve_node_runtime_path() -> Option<PathBuf> {
    if let Ok(path) = which::which("node") {
        return Some(path);
    }

    let candidates: &[&str] = if cfg!(target_os = "macos") {
        &["/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"]
    } else if cfg!(target_os = "windows") {
        &["C:\\Program Files\\nodejs\\node.exe", "C:\\Program Files (x86)\\nodejs\\node.exe"]
    } else {
        &["/usr/local/bin/node", "/usr/bin/node"]
    };

    for candidate in candidates {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Some(path);
        }
    }

    None
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
        let config = state.config.lock().map_err(|e| e.to_string())?;
        if config.port > 0 && !config.token.is_empty() {
            Some((config.port, config.token.clone()))
        } else {
            None
        }
    };

    if let Some((port, token)) = cached {
        if is_sidecar_healthy(&state.http_client, port, &token).await {
            let config = state.config.lock().map_err(|e| e.to_string())?;
            return Ok(config.clone());
        }
    }

    let entry_path = resolve_desktop_runtime_entry(app)
        .ok_or("Could not find desktop-runtime entry (server.cjs/server.js)")?;

    let node_path = resolve_node_runtime_path()
        .ok_or("Could not find Node.js runtime. Please install Node.js.")?;

    let token = uuid::Uuid::new_v4().to_string();

    let mut child = std::process::Command::new(&node_path)
        .arg(&entry_path)
        .env("DESKTOP_RUNTIME_TOKEN", &token)
        .env("DESKTOP_RUNTIME_PORT", "0")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    let pid = child.id();

    let stdout = child.stdout.take().ok_or("Failed to capture sidecar stdout")?;
    let reader = std::io::BufReader::new(stdout);
    let mut resolved_port: Option<u16> = None;
    let mut diagnostics: Vec<String> = Vec::new();

    use std::io::BufRead;
    for line in reader.lines() {
        let line = line.map_err(|e| format!("Failed to read sidecar output: {}", e))?;
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

    let port = resolved_port.ok_or_else(|| {
        if diagnostics.is_empty() {
            "Sidecar did not report a port".to_string()
        } else {
            format!("Sidecar did not report a port. Output: {}", diagnostics.join(" | "))
        }
    })?;

    let runtime = DesktopRuntimeConfig {
        port,
        token,
        pid: Some(pid),
    };

    {
        let mut config = state.config.lock().map_err(|e| e.to_string())?;
        *config = runtime.clone();
    }

    Ok(runtime)
}

pub fn kill_sidecar(app: &impl Manager<tauri::Wry>) {
    let state = app.state::<DesktopRuntimeState>();
    if let Ok(mut config) = state.config.lock() {
        if let Some(pid) = config.pid.take() {
            #[cfg(unix)]
            {
                unsafe {
                    libc::kill(pid as i32, libc::SIGTERM);
                }
            }
            #[cfg(windows)]
            {
                let _ = std::process::Command::new("taskkill")
                    .args(["/PID", &pid.to_string(), "/F"])
                    .output();
            }
        }
        config.port = 0;
        config.token.clear();
    }
}

pub async fn stream_chat_via_sidecar(
    app: &tauri::AppHandle,
    body: &Value,
    mut on_event: impl FnMut(Value) -> Result<(), String>,
) -> Result<(), String> {
    let state = app.state::<DesktopRuntimeState>();
    let runtime = ensure_sidecar_started(app).await?;
    let url = format!("http://127.0.0.1:{}/chat", runtime.port);

    let mut headers = HeaderMap::new();
    headers.insert(AUTHORIZATION, format!("Bearer {}", runtime.token).parse().unwrap());
    headers.insert(reqwest::header::CONTENT_TYPE, "application/json".parse().unwrap());

    let resp = state
        .http_client
        .post(&url)
        .headers(headers)
        .json(body)
        .timeout(Duration::from_secs(300))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to sidecar: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!(
            "Sidecar error ({}): {}",
            status,
            text.chars().take(300).collect::<String>()
        ));
    }

    let mut stream = resp
        .bytes_stream()
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
        .eventsource();

    while let Some(event) = stream.next().await {
        match event {
            Ok(sse_event) => {
                if let Ok(value) = serde_json::from_str::<Value>(&sse_event.data) {
                    on_event(value)?;
                }
            }
            Err(e) => {
                return Err(format!("SSE parse error: {}", e));
            }
        }
    }

    Ok(())
}
