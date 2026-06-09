export {};

declare global {
  interface Window {
    electronAPI: {
      providers: {
        getAll: () => Promise<unknown[]>;
        create: (input: unknown) => Promise<unknown>;
        update: (input: unknown) => Promise<unknown>;
        delete: (id: string) => Promise<void>;
        validate: (input: unknown) => Promise<{ valid: boolean; error?: string }>;
      };
      models: {
        getAll: (args?: unknown) => Promise<unknown[]>;
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
      chat: {
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
    };
  }
}
