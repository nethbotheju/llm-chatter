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
    _placeholder: true,
  },
});
