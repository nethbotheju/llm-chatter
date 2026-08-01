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
  IAppConfigService,
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
  CreateMcpServerInput,
  DiscoverMcpToolsInput,
  DiscoveredTool,
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
} from "@llm-chatter/contracts";

async function assertOk(res: Response): Promise<void> {
  if (res.ok) return;
  let message = `Request failed (${res.status})`;
  try {
    const body = await res.json();
    if (body && typeof body.error === "string") message = body.error;
  } catch {
    // non-JSON response; keep default message
  }
  throw new Error(message);
}

class WebProviderService implements IProviderService {
  async getAll(): Promise<Provider[]> {
    const res = await fetch("/api/providers");
    await assertOk(res);
    const data = await res.json();
    return data.map(parseProvider);
  }
  async create(input: CreateProviderInput): Promise<Provider> {
    const res = await fetch("/api/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseProvider(await res.json());
  }
  async update(input: UpdateProviderInput): Promise<Provider> {
    const res = await fetch("/api/providers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseProvider(await res.json());
  }
  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/providers?id=${id}`, { method: "DELETE" });
    await assertOk(res);
  }
  async validate(input: ValidateProviderInput): Promise<{ valid: boolean; error?: string }> {
    const res = await fetch("/api/providers/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return res.json();
  }
}

class WebModelService implements IModelService {
  async getAll(providerId?: string, includeDisabled?: boolean): Promise<Model[]> {
    const params = new URLSearchParams();
    if (providerId) params.set("providerId", providerId);
    if (includeDisabled) params.set("all", "true");
    const res = await fetch(`/api/models?${params}`);
    await assertOk(res);
    const data = await res.json();
    return data.map(parseModel);
  }
  async create(input: CreateModelInput): Promise<Model> {
    const res = await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseModel(await res.json());
  }
  async update(input: UpdateModelInput): Promise<Model> {
    const res = await fetch("/api/models", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseModel(await res.json());
  }
  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/models?id=${id}`, { method: "DELETE" });
    await assertOk(res);
  }
}

class WebAssistantService implements IAssistantService {
  async getAll(): Promise<Assistant[]> {
    const res = await fetch("/api/assistants");
    await assertOk(res);
    const data = await res.json();
    return data.map(parseAssistant);
  }
  async get(id: string): Promise<Assistant> {
    const res = await fetch(`/api/assistants?id=${id}`);
    await assertOk(res);
    return parseAssistant(await res.json());
  }
  async create(input: CreateAssistantInput): Promise<Assistant> {
    const res = await fetch("/api/assistants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseAssistant(await res.json());
  }
  async update(input: UpdateAssistantInput): Promise<Assistant> {
    const res = await fetch("/api/assistants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseAssistant(await res.json());
  }
  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/assistants?id=${id}`, { method: "DELETE" });
    await assertOk(res);
  }
}

class WebConversationService implements IConversationService {
  async getAll(): Promise<ConversationWithCount[]> {
    const res = await fetch("/api/conversations");
    await assertOk(res);
    return parseConversationsWithCount(await res.json());
  }
  async get(id: string): Promise<ConversationDetail> {
    const res = await fetch(`/api/conversations?id=${id}`);
    await assertOk(res);
    return parseConversationDetail(await res.json());
  }
  async create(input: CreateConversationInput): Promise<ConversationDetail> {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseConversationDetail(await res.json());
  }
  async update(id: string, title: string): Promise<ConversationDetail> {
    const res = await fetch("/api/conversations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    await assertOk(res);
    return parseConversationDetail(await res.json());
  }
  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    await assertOk(res);
  }
  async deleteAll(): Promise<void> {
    const res = await fetch("/api/conversations?all=true", { method: "DELETE" });
    await assertOk(res);
  }
}

class WebMessageService implements IMessageService {
  async get(conversationId: string): Promise<Message[]> {
    const res = await fetch(`/api/conversations?id=${conversationId}`);
    await assertOk(res);
    const conv = await res.json();
    return parseMessages(conv.messages || []);
  }
  async create(conversationId: string, role: string, parts: string, metadata?: string): Promise<Message> {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, parts, metadata }),
    });
    await assertOk(res);
    return parseMessage(await res.json());
  }
  async update(conversationId: string, messageId: string, parts: string): Promise<void> {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, parts }),
    });
    await assertOk(res);
  }
  async delete(conversationId: string, messageId: string): Promise<void> {
    const res = await fetch(`/api/conversations/${conversationId}/messages?messageId=${messageId}`, {
      method: "DELETE",
    });
    await assertOk(res);
  }
}

class WebSearchService implements ISearchService {
  async search(query: string): Promise<SearchResult[]> {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    await assertOk(res);
    const data = await res.json();
    return parseSearchResults(data.results || []);
  }
}

class WebExportService implements IExportService {
  async export(): Promise<ExportData> {
    const res = await fetch("/api/export");
    await assertOk(res);
    return parseExportData(await res.json());
  }
}

class WebStatsService implements IStatsService {
  async get(): Promise<Stats> {
    const res = await fetch("/api/stats");
    await assertOk(res);
    return parseStats(await res.json());
  }
}

class WebResetService implements IResetService {
  async reset(): Promise<void> {
    const res = await fetch("/api/reset", { method: "POST" });
    await assertOk(res);
  }
}

class WebProviderCatalogService implements IProviderCatalogService {
  async listProviders(query?: string): Promise<ProviderCatalogItem[]> {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const res = await fetch(`/api/catalog/providers?${params}`);
    await assertOk(res);
    const data = await res.json();
    return parseProviderCatalogItems(data);
  }
  async listModels(catalogProviderId: string): Promise<ModelCatalogItem[]> {
    const res = await fetch(
      `/api/catalog/providers/${encodeURIComponent(catalogProviderId)}/models`,
    );
    await assertOk(res);
    const data = await res.json();
    return parseModelCatalogItems(data);
  }
  async importProvider(input: CatalogImportInput): Promise<CatalogImportResult> {
    const res = await fetch("/api/catalog/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseCatalogImportResult(await res.json());
  }
  async syncProvider(providerId: string): Promise<CatalogSyncResult> {
    const res = await fetch("/api/catalog/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ providerId }),
    });
    await assertOk(res);
    return parseCatalogSyncResult(await res.json());
  }
  async syncAll(): Promise<CatalogSyncResult[]> {
    const res = await fetch("/api/catalog/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    await assertOk(res);
    return (await res.json()) as CatalogSyncResult[];
  }
}

class WebMcpServerService implements IMcpServerService {
  async getAll(): Promise<McpServer[]> {
    const res = await fetch("/api/mcp-servers");
    await assertOk(res);
    return parseMcpServers(await res.json());
  }
  async create(input: CreateMcpServerInput): Promise<McpServer> {
    const res = await fetch("/api/mcp-servers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseMcpServer(await res.json());
  }
  async update(input: UpdateMcpServerInput): Promise<McpServer> {
    const res = await fetch("/api/mcp-servers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return parseMcpServer(await res.json());
  }
  async delete(id: string): Promise<void> {
    const res = await fetch(`/api/mcp-servers?id=${id}`, { method: "DELETE" });
    await assertOk(res);
  }
  async discover(input: DiscoverMcpToolsInput): Promise<DiscoveredTool[]> {
    const res = await fetch("/api/mcp-servers/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    await assertOk(res);
    return (await res.json()) as DiscoveredTool[];
  }
}

class WebAppConfigService implements IAppConfigService {
  async getAll(): Promise<Record<string, unknown>> {
    const res = await fetch("/api/app-config");
    await assertOk(res);
    return (await res.json()) as Record<string, unknown>;
  }
  async get<T = unknown>(key: string): Promise<T | null> {
    const all = await this.getAll();
    return (all[key] as T) ?? null;
  }
  async set(key: string, value: unknown): Promise<void> {
    const res = await fetch("/api/app-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    await assertOk(res);
  }
  async remove(key: string): Promise<void> {
    const res = await fetch(`/api/app-config?key=${encodeURIComponent(key)}`, {
      method: "DELETE",
    });
    await assertOk(res);
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
export const webAppConfigService = new WebAppConfigService();
