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

function getAPI() {
  const api = window.electronAPI;
  if (!api) throw new Error("Electron API not available");
  return api;
}

class ElectronProviderService implements IProviderService {
  async getAll(): Promise<Provider[]> {
    const data = await getAPI().providers.getAll();
    return (data as unknown[]).map(parseProvider);
  }
  async create(input: CreateProviderInput): Promise<Provider> {
    return parseProvider(await getAPI().providers.create(input));
  }
  async update(input: UpdateProviderInput): Promise<Provider> {
    return parseProvider(await getAPI().providers.update(input));
  }
  async delete(id: string): Promise<void> {
    await getAPI().providers.delete(id);
  }
  async validate(input: ValidateProviderInput): Promise<{ valid: boolean; error?: string }> {
    return getAPI().providers.validate(input);
  }
}

class ElectronModelService implements IModelService {
  async getAll(providerId?: string, includeDisabled?: boolean): Promise<Model[]> {
    const data = await getAPI().models.getAll({ providerId, includeDisabled });
    return (data as unknown[]).map(parseModel);
  }
  async create(input: CreateModelInput): Promise<Model> {
    return parseModel(await getAPI().models.create(input));
  }
  async update(input: UpdateModelInput): Promise<Model> {
    return parseModel(await getAPI().models.update(input));
  }
  async delete(id: string): Promise<void> {
    await getAPI().models.delete(id);
  }
}

class ElectronAssistantService implements IAssistantService {
  async getAll(): Promise<Assistant[]> {
    const data = await getAPI().assistants.getAll();
    return (data as unknown[]).map(parseAssistant);
  }
  async get(id: string): Promise<Assistant> {
    return parseAssistant(await getAPI().assistants.get(id));
  }
  async create(input: CreateAssistantInput): Promise<Assistant> {
    return parseAssistant(await getAPI().assistants.create(input));
  }
  async update(input: UpdateAssistantInput): Promise<Assistant> {
    return parseAssistant(await getAPI().assistants.update(input));
  }
  async delete(id: string): Promise<void> {
    await getAPI().assistants.delete(id);
  }
}

class ElectronConversationService implements IConversationService {
  async getAll(): Promise<ConversationWithCount[]> {
    const data = await getAPI().conversations.getAll();
    return parseConversationsWithCount(data);
  }
  async get(id: string): Promise<ConversationDetail> {
    const data = await getAPI().conversations.get(id);
    return parseConversationDetail(data);
  }
  async create(input: CreateConversationInput): Promise<ConversationDetail> {
    const data = await getAPI().conversations.create(input);
    return parseConversationDetail(data);
  }
  async update(id: string, title: string): Promise<ConversationDetail> {
    const data = await getAPI().conversations.update(id, title);
    return parseConversationDetail(data);
  }
  async delete(id: string): Promise<void> {
    await getAPI().conversations.delete(id);
  }
  async deleteAll(): Promise<void> {
    await getAPI().conversations.deleteAll();
  }
}

class ElectronMessageService implements IMessageService {
  async get(conversationId: string): Promise<Message[]> {
    const data = await getAPI().messages.get(conversationId);
    return parseMessages(data);
  }
  async create(conversationId: string, role: string, parts: string, metadata?: string): Promise<Message> {
    const data = await getAPI().messages.create({
      conversationId,
      role,
      parts,
      metadata: metadata || null,
    });
    return parseMessage(data);
  }
  async update(conversationId: string, messageId: string, parts: string): Promise<void> {
    await getAPI().messages.update({ messageId, conversationId, parts });
  }
  async delete(conversationId: string, messageId: string): Promise<void> {
    await getAPI().messages.delete({ messageId, conversationId });
  }
}

class ElectronSearchService implements ISearchService {
  async search(query: string): Promise<SearchResult[]> {
    const data = await getAPI().search.messages(query);
    return parseSearchResults(data);
  }
}

class ElectronExportService implements IExportService {
  async export(): Promise<ExportData> {
    return parseExportData(await getAPI().export.data());
  }
}

class ElectronStatsService implements IStatsService {
  async get(): Promise<Stats> {
    return parseStats(await getAPI().stats.get());
  }
}

class ElectronResetService implements IResetService {
  async reset(): Promise<void> {
    await getAPI().reset.data();
  }
}

class ElectronProviderCatalogService implements IProviderCatalogService {
  async listProviders(query?: string): Promise<ProviderCatalogItem[]> {
    const data = await getAPI().catalog!.listProviders(query);
    return parseProviderCatalogItems(data);
  }
  async listModels(catalogProviderId: string): Promise<ModelCatalogItem[]> {
    const data = await getAPI().catalog!.listModels(catalogProviderId);
    return parseModelCatalogItems(data);
  }
  async importProvider(input: CatalogImportInput): Promise<CatalogImportResult> {
    return parseCatalogImportResult(await getAPI().catalog!.importProvider(input));
  }
  async syncProvider(providerId: string): Promise<CatalogSyncResult> {
    return parseCatalogSyncResult(await getAPI().catalog!.syncProvider(providerId));
  }
  async syncAll(): Promise<CatalogSyncResult[]> {
    const data = await getAPI().catalog!.syncAll();
    return (data as unknown[]).map((r) => parseCatalogSyncResult(r));
  }
}

class ElectronMcpServerService implements IMcpServerService {
  async getAll(): Promise<McpServer[]> {
    const data = await getAPI().mcpServers.getAll();
    return parseMcpServers(data);
  }
  async update(input: UpdateMcpServerInput): Promise<McpServer> {
    return parseMcpServer(await getAPI().mcpServers.update(input));
  }
}

export const electronProviderService = new ElectronProviderService();
export const electronModelService = new ElectronModelService();
export const electronAssistantService = new ElectronAssistantService();
export const electronConversationService = new ElectronConversationService();
export const electronMessageService = new ElectronMessageService();
export const electronSearchService = new ElectronSearchService();
export const electronExportService = new ElectronExportService();
export const electronStatsService = new ElectronStatsService();
export const electronResetService = new ElectronResetService();
export const electronProviderCatalogService = new ElectronProviderCatalogService();
export const electronMcpServerService = new ElectronMcpServerService();
