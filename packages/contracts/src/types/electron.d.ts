export interface ElectronAPI {
  providers: {
    getAll: () => Promise<unknown[]>;
    create: (input: unknown) => Promise<unknown>;
    update: (input: unknown) => Promise<unknown>;
    delete: (id: string) => Promise<void>;
    validate: (input: unknown) => Promise<{ valid: boolean; error?: string }>;
  };
  models: {
    getAll: (args?: {
      providerId?: string;
      includeDisabled?: boolean;
    }) => Promise<unknown[]>;
    create: (input: unknown) => Promise<unknown>;
    update: (input: unknown) => Promise<unknown>;
    delete: (id: string) => Promise<void>;
  };
  assistants: {
    getAll: () => Promise<unknown[]>;
    get: (id: string) => Promise<unknown>;
    create: (input: unknown) => Promise<unknown>;
    update: (input: unknown) => Promise<unknown>;
    delete: (id: string) => Promise<void>;
  };
  conversations: {
    getAll: () => Promise<unknown[]>;
    get: (id: string) => Promise<unknown>;
    create: (input: unknown) => Promise<unknown>;
    update: (id: string, title: string) => Promise<unknown>;
    delete: (id: string) => Promise<void>;
    deleteAll: () => Promise<void>;
  };
  messages: {
    get: (conversationId: string) => Promise<unknown[]>;
    create: (input: unknown) => Promise<unknown>;
    update: (input: unknown) => Promise<void>;
    delete: (input: unknown) => Promise<void>;
  };
  search: {
    messages: (query: string) => Promise<unknown[]>;
  };
  export: {
    data: () => Promise<unknown>;
  };
  stats: {
    get: () => Promise<unknown>;
  };
  reset: {
    data: () => Promise<void>;
  };
  appConfig: {
    getAll: () => Promise<Record<string, unknown>>;
    set: (input: { key: string; value: unknown }) => Promise<void>;
    remove: (key: string) => Promise<void>;
  };
  catalog: {
    listProviders: (query?: string) => Promise<unknown[]>;
    listModels: (catalogProviderId: string) => Promise<unknown[]>;
    importProvider: (input: {
      catalogId: string;
      apiKey: string;
      baseUrlOverride?: string | null;
    }) => Promise<unknown>;
    syncProvider: (providerId: string) => Promise<unknown>;
    syncAll: () => Promise<unknown[]>;
  };
  mcpServers: {
    getAll: () => Promise<unknown[]>;
    create: (input: unknown) => Promise<unknown>;
    update: (input: unknown) => Promise<unknown>;
    delete: (id: string) => Promise<void>;
    discover: (input: unknown) => Promise<unknown[]>;
  };
  chat?: {
    resolve: (input: {
      modelId: string;
      conversationId?: string | null;
    }) => Promise<{
      model: string;
      provider: { type: string; apiKey: string; baseUrl: string | null };
      assistantConfig: {
        systemPrompt: string;
        temperature: number;
        topP: number;
      };
      modelSupportsTools: boolean;
      acceptedAttachmentKinds: ("image" | "pdf")[];
    }>;
    start: (payload: unknown) => Promise<string>;
    abort: (streamId: string) => void;
    onChunk: (
      streamId: string,
      handler: (chunk: unknown) => void,
    ) => () => void;
    onError: (
      streamId: string,
      handler: (error: unknown) => void,
    ) => () => void;
    onDone: (
      streamId: string,
      handler: () => void,
    ) => () => void;
  };
  dialogs: {
    saveExport: (payload: {
      defaultName: string;
      json: string;
    }) => Promise<{ canceled: boolean; filePath?: string }>;
  };
  notifications: {
    show: (payload: {
      title: string;
      body: string;
      silent?: boolean;
    }) => Promise<void>;
  };
  autoLaunch: {
    get: () => Promise<boolean>;
    set: (enabled: boolean) => Promise<boolean>;
  };
  onShortcut: (
    name: string,
    handler: () => void,
  ) => () => void;
  offShortcut: (name: string) => void;
  onAction: (
    name: string,
    handler: () => void,
  ) => () => void;
  offAction: (name: string) => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
