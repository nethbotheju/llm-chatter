import { contextBridge } from "electron";

// Placeholder for Phase 2. We expose a single empty object so the renderer
// can check `typeof window.electronAPI === "object"` and pick the right adapter.
contextBridge.exposeInMainWorld("electronAPI", {
  _phase: 1,
});
