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
} from "./interfaces";

export type {
  IProviderService,
  IModelService,
  IAssistantService,
  IConversationService,
  IMessageService,
  ISearchService,
  IExportService,
  IStatsService,
  IResetService,
};

export type * from "./types";

import { isElectron } from "@/lib/runtime";

let _provider: IProviderService | null = null;
let _model: IModelService | null = null;
let _assistant: IAssistantService | null = null;
let _conversation: IConversationService | null = null;
let _message: IMessageService | null = null;
let _search: ISearchService | null = null;
let _export: IExportService | null = null;
let _stats: IStatsService | null = null;
let _reset: IResetService | null = null;

async function loadAdapter() {
  if (isElectron()) {
    const adapter = await import("./adapters/electron.adapter");
    _provider = adapter.electronProviderService;
    _model = adapter.electronModelService;
    _assistant = adapter.electronAssistantService;
    _conversation = adapter.electronConversationService;
    _message = adapter.electronMessageService;
    _search = adapter.electronSearchService;
    _export = adapter.electronExportService;
    _stats = adapter.electronStatsService;
    _reset = adapter.electronResetService;
  } else {
    const adapter = await import("./adapters/web.adapter");
    _provider = adapter.webProviderService;
    _model = adapter.webModelService;
    _assistant = adapter.webAssistantService;
    _conversation = adapter.webConversationService;
    _message = adapter.webMessageService;
    _search = adapter.webSearchService;
    _export = adapter.webExportService;
    _stats = adapter.webStatsService;
    _reset = adapter.webResetService;
  }
}

let initialized = false;
const initPromise = loadAdapter().then(() => {
  initialized = true;
});

async function ensureInit() {
  if (!initialized) await initPromise;
}

export function getProviderService(): IProviderService {
  if (!_provider) throw new Error("Services not initialized");
  return _provider;
}
export function getModelService(): IModelService {
  if (!_model) throw new Error("Services not initialized");
  return _model;
}
export function getAssistantService(): IAssistantService {
  if (!_assistant) throw new Error("Services not initialized");
  return _assistant;
}
export function getConversationService(): IConversationService {
  if (!_conversation) throw new Error("Services not initialized");
  return _conversation;
}
export function getMessageService(): IMessageService {
  if (!_message) throw new Error("Services not initialized");
  return _message;
}
export function getSearchService(): ISearchService {
  if (!_search) throw new Error("Services not initialized");
  return _search;
}
export function getExportService(): IExportService {
  if (!_export) throw new Error("Services not initialized");
  return _export;
}
export function getStatsService(): IStatsService {
  if (!_stats) throw new Error("Services not initialized");
  return _stats;
}
export function getResetService(): IResetService {
  if (!_reset) throw new Error("Services not initialized");
  return _reset;
}

export { ensureInit };
export { isElectron };
