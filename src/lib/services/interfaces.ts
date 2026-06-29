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
} from "./types";

export interface IProviderService {
  getAll(): Promise<Provider[]>;
  create(input: CreateProviderInput): Promise<Provider>;
  update(input: UpdateProviderInput): Promise<Provider>;
  delete(id: string): Promise<void>;
  validate(input: ValidateProviderInput): Promise<{ valid: boolean; error?: string }>;
}

export interface IModelService {
  getAll(providerId?: string, includeDisabled?: boolean): Promise<Model[]>;
  create(input: CreateModelInput): Promise<Model>;
  update(input: UpdateModelInput): Promise<Model>;
  delete(id: string): Promise<void>;
}

export interface IAssistantService {
  getAll(): Promise<Assistant[]>;
  get(id: string): Promise<Assistant>;
  create(input: CreateAssistantInput): Promise<Assistant>;
  update(input: UpdateAssistantInput): Promise<Assistant>;
  delete(id: string): Promise<void>;
}

export interface IConversationService {
  getAll(): Promise<ConversationWithCount[]>;
  get(id: string): Promise<ConversationDetail>;
  create(input: CreateConversationInput): Promise<ConversationDetail>;
  update(id: string, title: string): Promise<ConversationDetail>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

export interface IMessageService {
  get(conversationId: string): Promise<Message[]>;
  create(conversationId: string, role: string, parts: string, metadata?: string): Promise<Message>;
  update(conversationId: string, messageId: string, parts: string): Promise<void>;
  delete(conversationId: string, messageId: string): Promise<void>;
}
export interface ISearchService {
  search(query: string): Promise<SearchResult[]>;
}

export interface IExportService {
  export(): Promise<ExportData>;
}

export interface IStatsService {
  get(): Promise<Stats>;
}

export interface IResetService {
  reset(): Promise<void>;
}

export interface IMcpServerService {
  getAll(): Promise<McpServer[]>;
  create(input: CreateMcpServerInput): Promise<McpServer>;
  update(input: UpdateMcpServerInput): Promise<McpServer>;
  delete(id: string): Promise<void>;
  discover(input: DiscoverMcpToolsInput): Promise<DiscoveredTool[]
>;
}

export interface IProviderCatalogService {
  listProviders(query?: string): Promise<ProviderCatalogItem[]>;
  listModels(catalogProviderId: string): Promise<ModelCatalogItem[]>;
  importProvider(input: CatalogImportInput): Promise<CatalogImportResult>;
  syncProvider(providerId: string): Promise<CatalogSyncResult>;
  syncAll(): Promise<CatalogSyncResult[]>;
}
