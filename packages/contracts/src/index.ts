export type { ElectronAPI } from "./types/electron";

export * from "./schemas";

import type {
  ProviderDTO,
  ModelDTO,
  AssistantDTO,
  ConversationDTO,
  ConversationDetailDTO,
  ConversationWithCountDTO,
  MessageDTO,
  SearchResultDTO,
  ExportDataDTO,
  StatsDTO,
  ChatMessageInputDTO,
  CreateProviderInputDTO,
  UpdateProviderInputDTO,
  CreateModelInputDTO,
  UpdateModelInputDTO,
  CreateAssistantInputDTO,
  UpdateAssistantInputDTO,
  CreateConversationInputDTO,
  ValidateProviderInputDTO,
  ProviderCatalogItemDTO,
  ModelCatalogItemDTO,
  CatalogImportInputDTO,
  CatalogImportResultDTO,
  CatalogSyncResultDTO,
  McpServerDTO,
  CreateMcpServerInputDTO,
  UpdateMcpServerInputDTO,
  DiscoverMcpToolsInputDTO,
} from "./schemas";

export type Provider = ProviderDTO;
export type Model = ModelDTO;
export type Assistant = AssistantDTO;
export type Conversation = ConversationDTO;
export type ConversationDetail = ConversationDetailDTO;
export type ConversationWithCount = ConversationWithCountDTO;
export type Message = MessageDTO;
export type SearchResult = SearchResultDTO;
export type ExportData = ExportDataDTO;
export type Stats = StatsDTO;
export type ChatMessageInput = ChatMessageInputDTO;
export type CreateProviderInput = CreateProviderInputDTO;
export type UpdateProviderInput = UpdateProviderInputDTO;
export type CreateModelInput = CreateModelInputDTO;
export type UpdateModelInput = UpdateModelInputDTO;
export type CreateAssistantInput = CreateAssistantInputDTO;
export type UpdateAssistantInput = UpdateAssistantInputDTO;
export type CreateConversationInput = CreateConversationInputDTO;
export type ValidateProviderInput = ValidateProviderInputDTO;
export type ProviderCatalogItem = ProviderCatalogItemDTO;
export type ModelCatalogItem = ModelCatalogItemDTO;
export type CatalogImportInput = CatalogImportInputDTO;
export type CatalogImportResult = CatalogImportResultDTO;
export type CatalogSyncResult = CatalogSyncResultDTO;
export type McpServer = McpServerDTO;
export type CreateMcpServerInput = CreateMcpServerInputDTO;
export type UpdateMcpServerInput = UpdateMcpServerInputDTO;
export type DiscoverMcpToolsInput = DiscoverMcpToolsInputDTO;

export interface DiscoveredTool {
  name: string;
  description?: string;
}

export * from "./types/models";
export const REDACTED = "__redacted__";
export const ENC_PREFIX = "enc:";

export type ConfigFieldType = "text" | "number" | "boolean" | "select" | "secret";

export interface SelectOption {
  label: string;
  value: string;
}

export interface ConfigField {
  key: string;
  label: string;
  description?: string;
  type: ConfigFieldType;
  options?: SelectOption[];
  default: unknown;
  placeholder?: string;
  showWhen?: { field: string; equals: unknown };
}

export function fieldVisible(
  field: ConfigField,
  values: Record<string, unknown>,
): boolean {
  if (!field.showWhen) return true;
  return values[field.showWhen.field] === field.showWhen.equals;
}

export interface BuiltinToolMeta {
  id: string;
  name: string;
  description: string;
  configFields: ConfigField[];
  defaultConfig: Record<string, unknown>;
}

export interface BuiltinConfig {
  enabled: string[];
  configs: Record<string, Record<string, unknown>>;
}

export const EMPTY_BUILTIN_CONFIG: BuiltinConfig = { enabled: [], configs: {} };

export * from "./builtin-tools/catalog";
export * from "./builtin-tools/config-schema";
export * from "./builtin-tools/tools/web-search/config";
export * from "./builtin-tools/tools/web-fetch/config";
