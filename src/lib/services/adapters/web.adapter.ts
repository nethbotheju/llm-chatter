import type {
  IProviderService,
  IModelService,
  IAssistantService,
  IConversationService,
  IMessageService,
  ISearchService,
  IExportService,
  IStatsService,
  IResetService,
  IProviderCatalogService,
  IMcpServerService,
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
  CreateProviderInput,
  UpdateProviderInput,
  CreateModelInput,
  UpdateModelInput,
  CreateAssistantInput,
  UpdateAssistantInput,
  CreateConversationInput,
  ValidateProviderInput,
  ProviderCatalogItem,
  ModelCatalogItem,
  CatalogImportInput,
  CatalogImportResult,
  CatalogSyncResult,
  McpServer,
  UpdateMcpServerInput,
} from "../types";
import {
  parseProvider,
  parseModel,
  parseAssistant,
  parseConversationDetail,
  parseConversationsWithCount,
  parseMessage,
  parseMessages,
  parseSearchResults,
  parseExportData,
  parseStats,
  parseProviderCatalogItems,
  parseModelCatalogItems,
  parseCatalogImportResult,
  parseCatalogSyncResult,
  parseMcpServer,
  parseMcpServers,
} from "@/lib/contracts";

class WebProviderService implements IProviderService {
  async getAll(): Promise<Provider[]> {
    const res = await fetch("/api/providers");
    const data = await res.json();
    return data.map(parseProvider);
  }
  async create(input: CreateProviderInput): Promise<Provider> {
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseProvider(await res.json());
  }
  async update(input: UpdateProviderInput): Promise<Provider> {
    const res = await fetch("/api/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseProvider(await res.json());
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
    const data = await res.json();
    return data.map(parseModel);
  }
  async create(input: CreateModelInput): Promise<Model> {
    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create model");
    }
    return parseModel(await res.json());
  }
  async update(input: UpdateModelInput): Promise<Model> {
    const res = await fetch("/api/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to update model");
    }
    return parseModel(await res.json());
  }
  async delete(id: string): Promise<void> {
    await fetch(`/api/models?id=${id}`, { method: "DELETE" });
  }
}

class WebAssistantService implements IAssistantService {
  async getAll(): Promise<Assistant[]> {
    const res = await fetch("/api/assistants");
    const data = await res.json();
    return data.map(parseAssistant);
  }
  async get(id: string): Promise<Assistant> {
    const res = await fetch(`/api/assistants?id=${id}`);
    return parseAssistant(await res.json());
  }
  async create(input: CreateAssistantInput): Promise<Assistant> {
    const res = await fetch("/api/assistants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseAssistant(await res.json());
  }
  async update(input: UpdateAssistantInput): Promise<Assistant> {
    const res = await fetch("/api/assistants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseAssistant(await res.json());
  }
  async delete(id: string): Promise<void> {
    await fetch(`/api/assistants?id=${id}`, { method: "DELETE" });
  }
}

class WebConversationService implements IConversationService {
  async getAll(): Promise<ConversationWithCount[]> {
    const res = await fetch("/api/conversations");
    return parseConversationsWithCount(await res.json());
  }
  async get(id: string): Promise<ConversationDetail> {
    const res = await fetch(`/api/conversations?id=${id}`);
    return parseConversationDetail(await res.json());
  }
  async create(input: CreateConversationInput): Promise<ConversationDetail> {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseConversationDetail(await res.json());
  }
  async update(id: string, title: string): Promise<ConversationDetail> {
    const res = await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    return parseConversationDetail(await res.json());
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
    return parseMessages(conv.messages || []);
  }
  async create(conversationId: string, role: string, parts: string, metadata?: string): Promise<Message> {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, parts, metadata }),
    });
    return parseMessage(await res.json());
  }
  async update(conversationId: string, messageId: string, parts: string): Promise<void> {
    await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, parts }),
    });
  }
  async delete(conversationId: string, messageId: string): Promise<void> {
    await fetch(`/api/conversations/${conversationId}/messages?messageId=${messageId}`, {
      method: "DELETE",
    });
  }
}

class WebSearchService implements ISearchService {
  async search(query: string): Promise<SearchResult[]> {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return parseSearchResults(data.results || []);
  }
}

class WebExportService implements IExportService {
  async export(): Promise<ExportData> {
    const res = await fetch("/api/export");
    return parseExportData(await res.json());
  }
}

class WebStatsService implements IStatsService {
  async get(): Promise<Stats> {
    const res = await fetch("/api/stats");
    return parseStats(await res.json());
  }
}

class WebResetService implements IResetService {
  async reset(): Promise<void> {
    await fetch("/api/reset", { method: "POST" });
  }
}

class WebProviderCatalogService implements IProviderCatalogService {
  async listProviders(query?: string): Promise<ProviderCatalogItem[]> {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const res = await fetch(`/api/catalog/providers?${params}`);
    const data = await res.json();
    return parseProviderCatalogItems(data);
  }
  async listModels(catalogProviderId: string): Promise<ModelCatalogItem[]> {
    const res = await fetch(
      `/api/catalog/providers/${encodeURIComponent(catalogProviderId)}/models`,
    );
    const data = await res.json();
    return parseModelCatalogItems(data);
  }
  async importProvider(input: CatalogImportInput): Promise<CatalogImportResult> {
    const res = await fetch("/api/catalog/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to import provider");
    }
    return parseCatalogImportResult(await res.json());
  }
  async syncProvider(providerId: string): Promise<CatalogSyncResult> {
    const res = await fetch("/api/catalog/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to sync provider");
    }
    return parseCatalogSyncResult(await res.json());
  }
  async syncAll(): Promise<CatalogSyncResult[]> {
    const res = await fetch("/api/catalog/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to sync providers");
    }
    return (await res.json()) as CatalogSyncResult[];
  }
}

class WebMcpServerService implements IMcpServerService {
  async getAll(): Promise<McpServer[]> {
    const res = await fetch("/api/mcp-servers");
    const data = await res.json();
    return parseMcpServers(data);
  }
  async update(input: UpdateMcpServerInput): Promise<McpServer> {
    const res = await fetch("/api/mcp-servers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return parseMcpServer(await res.json());
  }
}

export const webProviderService = new WebProviderService();
export const webModelService = new WebModelService();
export const webAssistantService = new WebAssistantService();
export const webConversationService = new WebConversationService();
export const webMessageService = new WebMessageService();
export const webSearchService = new WebSearchService();
export const webExportService = new WebExportService();
export const webStatsService = new WebStatsService();
export const webResetService = new WebResetService();
export const webProviderCatalogService = new WebProviderCatalogService();
export const webMcpServerService = new WebMcpServerService();
