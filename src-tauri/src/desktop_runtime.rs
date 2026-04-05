use serde_json::Value;
use std::collections::HashSet;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;

pub struct DesktopRuntimeState(pub Mutex<DesktopRuntimeConfig>);

#[derive(Debug, Clone)]
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

pub fn init_runtime_state(app: &tauri::AppHandle) {
    app.manage(DesktopRuntimeState(Mutex::new(DesktopRuntimeConfig::default())));
}

fn find_workspace_root(start: &std::path::Path) -> Option<PathBuf> {
    let mut current = start.to_path_buf();
    loop {
        let package_json = current.join("package.json");
        let desktop_entry = current.join("desktop-runtime").join("dist").join("server.cjs");
        if package_json.exists() && desktop_entry.exists() {
            return Some(current);
        }

        if !current.pop() {
            break;
        }
    }
    None
}

fn resolve_desktop_runtime_entry(app: &tauri::AppHandle) -> Option<PathBuf> {
    if let Ok(cwd) = std::env::current_dir() {
        if let Some(root) = find_workspace_root(&cwd) {
            return Some(root.join("desktop-runtime").join("dist").join("server.cjs"));
        }
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            if let Some(root) = find_workspace_root(exe_dir) {
                return Some(root.join("desktop-runtime").join("dist").join("server.cjs"));
            }
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir
            .join("_up_")
            .join("desktop-runtime")
            .join("dist")
            .join("server.cjs");
        if bundled.exists() {
            return Some(bundled);
        }

        if let Some(root) = find_workspace_root(&resource_dir) {
            return Some(root.join("desktop-runtime").join("dist").join("server.cjs"));
        }
    }

    None
}

fn guess_desktop_runtime_entry_paths(app: &tauri::AppHandle) -> Vec<PathBuf> {
    let mut candidates: Vec<PathBuf> = Vec::new();

    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd.join("desktop-runtime").join("dist").join("server.js"));
        candidates.push(cwd.join("desktop-runtime").join("dist").join("server.cjs"));
        candidates.push(cwd.join("..").join("desktop-runtime").join("dist").join("server.js"));
        candidates.push(cwd.join("..").join("desktop-runtime").join("dist").join("server.cjs"));
        candidates.push(cwd.join("..").join("..").join("desktop-runtime").join("dist").join("server.js"));
        candidates.push(cwd.join("..").join("..").join("desktop-runtime").join("dist").join("server.cjs"));
    }

    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            candidates.push(exe_dir.join("desktop-runtime").join("dist").join("server.js"));
            candidates.push(exe_dir.join("desktop-runtime").join("dist").join("server.cjs"));
            candidates.push(exe_dir.join("..").join("desktop-runtime").join("dist").join("server.js"));
            candidates.push(exe_dir.join("..").join("desktop-runtime").join("dist").join("server.cjs"));
            candidates.push(exe_dir.join("..").join("..").join("desktop-runtime").join("dist").join("server.js"));
            candidates.push(exe_dir.join("..").join("..").join("desktop-runtime").join("dist").join("server.cjs"));
            candidates.push(exe_dir.join("..").join("..").join("..").join("desktop-runtime").join("dist").join("server.js"));
            candidates.push(exe_dir.join("..").join("..").join("..").join("desktop-runtime").join("dist").join("server.cjs"));
        }
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.push(
            resource_dir
                .join("_up_")
                .join("desktop-runtime")
                .join("dist")
                .join("server.js"),
        );
        candidates.push(
            resource_dir
                .join("_up_")
                .join("desktop-runtime")
                .join("dist")
                .join("server.cjs"),
        );
        candidates.push(resource_dir.join("desktop-runtime").join("dist").join("server.js"));
        candidates.push(resource_dir.join("desktop-runtime").join("dist").join("server.cjs"));
        candidates.push(resource_dir.join("..").join("desktop-runtime").join("dist").join("server.js"));
        candidates.push(resource_dir.join("..").join("desktop-runtime").join("dist").join("server.cjs"));
        candidates.push(resource_dir.join("..").join("..").join("desktop-runtime").join("dist").join("server.js"));
        candidates.push(resource_dir.join("..").join("..").join("desktop-runtime").join("dist").join("server.cjs"));
    }

    let mut deduped = Vec::new();
    let mut seen = HashSet::new();

    for path in candidates {
        let key = path.to_string_lossy().to_string();
        if seen.insert(key) {
            deduped.push(path);
        }
    }

    deduped
}

fn resolve_node_runtime_path() -> Option<PathBuf> {
    let candidates = [
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
        "/usr/bin/node",
    ];

    for candidate in candidates {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return Some(path);
        }
    }

    None
}

pub async fn ensure_sidecar_started(app: &tauri::AppHandle) -> Result<DesktopRuntimeConfig, String> {
    let state = app.state::<DesktopRuntimeState>();
    {
        let current = state.0.lock().map_err(|e| e.to_string())?;
        if current.port > 0 && !current.token.is_empty() {
            return Ok(current.clone());
        }
    }

    let token = uuid::Uuid::new_v4().to_string();
    let mut command = app
        .shell()
        .sidecar("desktop-runtime")
        .map_err(|e| format!("failed to create sidecar command: {}", e))?;

    command = command
        .env("DESKTOP_RUNTIME_TOKEN", &token)
        .env("DESKTOP_RUNTIME_PORT", "0");

    if let Some(entry) = resolve_desktop_runtime_entry(app) {
        command = command.env("DESKTOP_RUNTIME_ENTRY", entry.to_string_lossy().to_string());
    } else {
        let guessed = guess_desktop_runtime_entry_paths(app)
            .into_iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect::<Vec<String>>()
            .join(":");
        if !guessed.is_empty() {
            command = command.env("DESKTOP_RUNTIME_ENTRY_CANDIDATES", guessed);
        }
    }

    if let Some(node_path) = resolve_node_runtime_path() {
        command = command.env("DESKTOP_RUNTIME_NODE", node_path.to_string_lossy().to_string());
    }

    let (mut rx, _child) = command
        .spawn()
        .map_err(|e| format!("failed to spawn desktop-runtime sidecar: {}", e))?;

    let mut port: Option<u16> = None;
    let mut diagnostics: Vec<String> = Vec::new();
    let deadline = std::time::Duration::from_secs(10);
    let start = std::time::Instant::now();

    while start.elapsed() < deadline {
        match tokio::time::timeout(std::time::Duration::from_millis(500), rx.recv()).await {
            Ok(Some(event)) => {
                match event {
                    tauri_plugin_shell::process::CommandEvent::Stdout(line) => {
                        let output = String::from_utf8_lossy(&line).trim().to_string();
                        if !output.is_empty() {
                            diagnostics.push(format!("stdout:{}", output));
                        }
                        if let Some(value) = output.strip_prefix("DESKTOP_RUNTIME_READY:") {
                            if let Ok(parsed) = value.parse::<u16>() {
                                port = Some(parsed);
                                break;
                            }
                        }
                    }
                    tauri_plugin_shell::process::CommandEvent::Stderr(line) => {
                        let output = String::from_utf8_lossy(&line).trim().to_string();
                        if !output.is_empty() {
                            diagnostics.push(format!("stderr:{}", output));
                        }
                    }
                    tauri_plugin_shell::process::CommandEvent::Error(error) => {
                        diagnostics.push(format!("error:{}", error));
                    }
                    tauri_plugin_shell::process::CommandEvent::Terminated(payload) => {
                        diagnostics.push(format!(
                            "terminated:code={:?},signal={:?}",
                            payload.code, payload.signal
                        ));
                    }
                    _ => {}
                }
            }
            Ok(None) => break,
            Err(_) => continue,
        }
    }

    let resolved_port = port.ok_or_else(|| {
        if diagnostics.is_empty() {
            "desktop-runtime sidecar did not report a port".to_string()
        } else {
            format!(
                "desktop-runtime sidecar did not report a port. diagnostics: {}",
                diagnostics.join(" | ")
            )
        }
    })?;
    let runtime = DesktopRuntimeConfig {
        port: resolved_port,
        token,
    };

    {
        let mut current = state.0.lock().map_err(|e| e.to_string())?;
        *current = runtime.clone();
    }

    Ok(runtime)
}

pub async fn stream_chat_via_sidecar(
    app: &tauri::AppHandle,
    body: &Value,
    mut on_event: impl FnMut(Value) -> Result<(), String>,
) -> Result<(), String> {
    let runtime = ensure_sidecar_started(app).await?;
    let url = format!("http://127.0.0.1:{}/chat", runtime.port);
    let auth = format!("Bearer {}", runtime.token);

    let resp = reqwest::Client::new()
        .post(&url)
        .header("Authorization", auth)
        .header("Content-Type", "application/json")
        .json(body)
        .send()
        .await
        .map_err(|e| format!("sidecar request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(format!(
            "sidecar request failed ({}): {}",
            status,
            text.chars().take(300).collect::<String>()
        ));
    }

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();

    use futures_util::StreamExt;

    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("sidecar stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&chunk));

        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].trim().to_string();
            buffer = buffer[pos + 1..].to_string();

            if line.is_empty() {
                continue;
            }

            if let Some(data) = line.strip_prefix("data: ") {
                if let Ok(event) = serde_json::from_str::<Value>(data) {
                    on_event(event)?;
                }
            }
        }
    }

    Ok(())
}
