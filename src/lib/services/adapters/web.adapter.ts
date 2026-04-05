import type {
  IProviderService,
  IModelService,
  IAssistantService,
  IConversationService,
  IMessageService,
  IChatService,
  ISearchService,
  IExportService,
  IStatsService,
  IResetService,
} from "../interfaces";
import type {
  Provider,
  Model,
  Assistant,
  ConversationWithCount,
  ConversationDetail,
  Message,
  SearchResult,
  ExportData,
  Stats,
  ChatMessageInput,
  CreateProviderInput,
  UpdateProviderInput,
  CreateModelInput,
  UpdateModelInput,
  CreateAssistantInput,
  UpdateAssistantInput,
  CreateConversationInput,
  ValidateProviderInput,
} from "../types";

class WebProviderService implements IProviderService {
  async getAll(): Promise<Provider[]> {
    const res = await fetch("/api/providers");
    return res.json();
  }
  async create(input: CreateProviderInput): Promise<Provider> {
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  async update(input: UpdateProviderInput): Promise<Provider> {
    const res = await fetch("/api/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  async delete(id: string): Promise<void> {
    await fetch(`/api/providers?id=${id}`, { method: "DELETE" });
  }
  async validate(input: ValidateProviderInput): Promise<{ valid: boolean; error?: string }> {
    const res = await fetch("/api/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
}

class WebModelService implements IModelService {
  async getAll(providerId?: string, includeDisabled?: boolean): Promise<Model[]> {
    const params = new URLSearchParams();
    if (providerId) params.set("providerId", providerId);
    if (includeDisabled) params.set("all", "true");
    const res = await fetch(`/api/models?${params}`);
    return res.json();
  }
  async create(input: CreateModelInput): Promise<Model> {
    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  async update(input: UpdateModelInput): Promise<Model> {
    const res = await fetch("/api/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  async delete(id: string): Promise<void> {
    await fetch(`/api/models?id=${id}`, { method: "DELETE" });
  }
}

class WebAssistantService implements IAssistantService {
  async getAll(): Promise<Assistant[]> {
    const res = await fetch("/api/assistants");
    return res.json();
  }
  async get(id: string): Promise<Assistant> {
    const res = await fetch(`/api/assistants?id=${id}`);
    return res.json();
  }
  async create(input: CreateAssistantInput): Promise<Assistant> {
    const res = await fetch("/api/assistants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  async update(input: UpdateAssistantInput): Promise<Assistant> {
    const res = await fetch("/api/assistants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  async delete(id: string): Promise<void> {
    await fetch(`/api/assistants?id=${id}`, { method: "DELETE" });
  }
}

class WebConversationService implements IConversationService {
  async getAll(): Promise<ConversationWithCount[]> {
    const res = await fetch("/api/conversations");
    return res.json();
  }
  async get(id: string): Promise<ConversationDetail> {
    const res = await fetch(`/api/conversations?id=${id}`);
    return res.json();
  }
  async create(input: CreateConversationInput): Promise<ConversationDetail> {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return res.json();
  }
  async update(id: string, title: string): Promise<ConversationDetail> {
    const res = await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    return res.json();
  }
  async delete(id: string): Promise<void> {
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
  }
  async deleteAll(): Promise<void> {
    await fetch("/api/conversations?all=true", { method: "DELETE" });
  }
}

class WebMessageService implements IMessageService {
  async get(conversationId: string): Promise<Message[]> {
    const conv = await fetch(`/api/conversations?id=${conversationId}`).then((r) => r.json());
    return conv.messages || [];
  }
  async create(conversationId: string, role: string, content: string, thinking?: string, attachments?: string): Promise<Message> {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, content, thinking, attachments }),
    });
    return res.json();
  }
  async update(conversationId: string, messageId: string, content: string): Promise<void> {
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, content }),
    });
  }
  async delete(conversationId: string, messageId: string): Promise<void> {
    await fetch(`/api/conversations/${conversationId}/messages?messageId=${messageId}`, {
      method: "DELETE",
    });
  }
}

class WebChatService implements IChatService {
  async send(
    messages: ChatMessageInput[],
    modelId: string,
    conversationId: string | null,
    onToken: (token: string) => void,
    onDone: (fullContent: string) => void,
    onError: (error: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, modelId, conversationId }),
        signal,
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let fullContent = "";
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullContent += chunk;
        onToken(chunk);
      }

      onDone(fullContent);
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      onError((error as Error).message || "Chat error");
    }
  }
  abort(): void {
    // Handled via AbortSignal
  }
}

class WebSearchService implements ISearchService {
  async search(query: string): Promise<SearchResult[]> {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.results || [];
  }
}

class WebExportService implements IExportService {
  async export(): Promise<ExportData> {
    const res = await fetch("/api/export");
    return res.json();
  }
}

class WebStatsService implements IStatsService {
  async get(): Promise<Stats> {
    const res = await fetch("/api/stats");
    return res.json();
  }
}

class WebResetService implements IResetService {
  async reset(): Promise<void> {
    await fetch("/api/reset", { method: "POST" });
  }
}

export const webProviderService = new WebProviderService();
export const webModelService = new WebModelService();
export const webAssistantService = new WebAssistantService();
export const webConversationService = new WebConversationService();
export const webMessageService = new WebMessageService();
export const webChatService = new WebChatService();
export const webSearchService = new WebSearchService();
export const webExportService = new WebExportService();
export const webStatsService = new WebStatsService();
export const webResetService = new WebResetService();
