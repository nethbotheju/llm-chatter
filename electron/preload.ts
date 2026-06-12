import { contextBridge, ipcRenderer } from "electron";

const invoke = (channel: string, ...args: unknown[]) =>
  ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld("electronAPI", {
  providers: {
    getAll: () => invoke("providers:getAll"),
    create: (input: unknown) => invoke("providers:create", input),
    update: (input: unknown) => invoke("providers:update", input),
    delete: (id: string) => invoke("providers:delete", id),
    validate: (input: unknown) => invoke("providers:validate", input),
  },
  models: {
    getAll: (args?: unknown) => invoke("models:getAll", args),
    create: (input: unknown) => invoke("models:create", input),
    update: (input: unknown) => invoke("models:update", input),
    delete: (id: string) => invoke("models:delete", id),
  },
  assistants: {
    getAll: () => invoke("assistants:getAll"),
    get: (id: string) => invoke("assistants:get", id),
    create: (input: unknown) => invoke("assistants:create", input),
    update: (input: unknown) => invoke("assistants:update", input),
    delete: (id: string) => invoke("assistants:delete", id),
  },
  conversations: {
    getAll: () => invoke("conversations:getAll"),
    get: (id: string) => invoke("conversations:get", id),
    create: (input: unknown) => invoke("conversations:create", input),
    update: (id: string, title: string) =>
      invoke("conversations:update", { id, title }),
    delete: (id: string) => invoke("conversations:delete", id),
    deleteAll: () => invoke("conversations:deleteAll"),
  },
  messages: {
    get: (conversationId: string) => invoke("messages:get", conversationId),
    create: (input: unknown) => invoke("messages:create", input),
    update: (input: unknown) => invoke("messages:update", input),
    delete: (input: unknown) => invoke("messages:delete", input),
  },
  search: {
    messages: (query: string) => invoke("search:messages", query),
  },
  export: {
    data: () => invoke("export:data"),
  },
  stats: {
    get: () => invoke("stats:get"),
  },
  reset: {
    data: () => invoke("reset:data"),
  },
  // Phase 3: chat streaming
  chat: {
    resolve: (input: { modelId: string; conversationId?: string | null }) =>
      invoke("chat:resolve", input),
    start: (payload: unknown): Promise<string> =>
      invoke("chat:start", payload),
    abort: (streamId: string) => invoke("chat:abort", streamId),
    onChunk: (streamId: string, handler: (chunk: unknown) => void) => {
      const channel = `chat:chunk:${streamId}`;
      const listener = (_e: Electron.IpcRendererEvent, chunk: unknown) =>
        handler(chunk);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
    onError: (streamId: string, handler: (error: unknown) => void) => {
      const channel = `chat:error:${streamId}`;
      const listener = (_e: Electron.IpcRendererEvent, err: unknown) =>
        handler(err);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
    onDone: (streamId: string, handler: () => void) => {
      const channel = `chat:done:${streamId}`;
      const listener = () => handler();
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },
  // Phase 4: native integrations
  dialogs: {
    saveExport: (payload: { defaultName: string; json: string }) =>
      invoke("dialogs:saveExport", payload),
  },
  notifications: {
    show: (payload: { title: string; body: string; silent?: boolean }) =>
      invoke("notifications:show", payload),
  },
  autoLaunch: {
    get: () => invoke("autoLaunch:get"),
    set: (enabled: boolean) => invoke("autoLaunch:set", enabled),
  },
  onShortcut: (name: string, handler: () => void) => {
    const channel = `shortcut:${name}`;
    const listener = () => handler();
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  offShortcut: (name: string) => {
    ipcRenderer.removeAllListeners(`shortcut:${name}`);
  },
  onAction: (name: string, handler: () => void) => {
    const channel = `action:${name}`;
    const listener = () => handler();
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  },
  offAction: (name: string) => {
    ipcRenderer.removeAllListeners(`action:${name}`);
  },
});
