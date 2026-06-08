export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function isElectron(): boolean {
  return typeof window !== "undefined" && "electronAPI" in window;
}

export function isWeb(): boolean {
  return !isTauri() && !isElectron();
}

export type RuntimeMode = "web" | "desktop-tauri" | "desktop-electron";

export function getRuntimeMode(): RuntimeMode {
  if (isTauri()) return "desktop-tauri";
  if (isElectron()) return "desktop-electron";
  return "web";
}
