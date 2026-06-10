export function isElectron(): boolean {
  return typeof window !== "undefined" && "electronAPI" in window;
}

export function isWeb(): boolean {
  return !isElectron();
}

export type RuntimeMode = "web" | "desktop";

export function getRuntimeMode(): RuntimeMode {
  return isElectron() ? "desktop" : "web";
}
