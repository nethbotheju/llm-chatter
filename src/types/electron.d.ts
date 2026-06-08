export {};

declare global {
  interface Window {
    electronAPI?: {
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
      // Phase 3: chat streaming
      chat?: {
        _placeholder?: boolean;
      };
    };
  }
}
