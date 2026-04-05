import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
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
  parseChatEvent,
} from "@/lib/contracts";

interface TauriConversationRow {
  id: string;
  title: string | null;
  assistant_id: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface TauriConversationDetail {
  id: string;
  title: string | null;
  assistant_id: string;
  created_at: string;
  updated_at: string;
  messages: TauriMessageRow[];
  assistant: Record<string, unknown> | null;
}

interface TauriMessageRow {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  thinking: string | null;
  attachments: string | null;
  created_at: string;
}

interface TauriModelRow {
  id: string;
  name: string;
  provider_id: string;
  capabilities: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  provider: {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
  };
}

interface TauriAssistantRow {
  id: string;
  name: string;
  image: string | null;
  system_prompt: string;
  temperature: number;
  top_p: number;
  enabled: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

function mapConversation(row: TauriConversationRow): ConversationWithCount {
  return {
    id: row.id,
    title: row.title,
    assistantId: row.assistant_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _count: { messages: row.message_count },
  };
}

function mapMessage(row: TauriMessageRow): Message {
  return parseMessage({
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role as Message["role"],
    content: row.content,
    thinking: row.thinking,
    attachments: row.attachments,
    createdAt: row.created_at,
  });
}

function mapModel(row: TauriModelRow): Model {
  return parseModel({
    id: row.id,
    name: row.name,
    providerId: row.provider_id,
    capabilities: row.capabilities,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    provider: row.provider,
  });
}

function mapAssistant(row: TauriAssistantRow): Assistant {
  return parseAssistant({
    id: row.id,
    name: row.name,
    image: row.image,
    systemPrompt: row.system_prompt,
    temperature: row.temperature,
    topP: row.top_p,
    enabled: row.enabled,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

function mapConversationDetail(row: TauriConversationDetail): ConversationDetail {
  const assistant = row.assistant
    ? {
        id: (row.assistant as Record<string, unknown>).id as string,
        name: (row.assistant as Record<string, unknown>).name as string,
        systemPrompt: (row.assistant as Record<string, unknown>).systemPrompt as string,
        temperature: (row.assistant as Record<string, unknown>).temperature as number,
        topP: (row.assistant as Record<string, unknown>).topP as number,
        enabled: true,
        isDefault: false,
        createdAt: "",
        updatedAt: "",
      }
    : null;

  return parseConversationDetail({
    id: row.id,
    title: row.title,
    assistantId: row.assistant_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: (row.messages || []).map(mapMessage),
    assistant,
  });
}

class TauriProviderService implements IProviderService {
  private mapProvider(row: Record<string, unknown>): Provider {
    return parseProvider({
      id: String(row.id),
      name: String(row.name),
      type: String(row.provider_type ?? row.type) as Provider["type"],
      baseUrl: (row.base_url ?? row.baseUrl ?? null) as string | null,
      hasApiKey: Boolean(row.has_api_key ?? row.hasApiKey),
      enabled: Boolean(row.enabled),
      createdAt: String(row.created_at ?? row.createdAt ?? ""),
      updatedAt: String(row.updated_at ?? row.updatedAt ?? ""),
    });
  }

  async getAll(): Promise<Provider[]> {
    const rows = await invoke<Record<string, unknown>[]>("get_providers");
    return rows.map((row) => this.mapProvider(row));
  }

  async create(input: CreateProviderInput): Promise<Provider> {
    const row = await invoke<Record<string, unknown>>("create_provider", { input });
    return this.mapProvider(row);
  }

  async update(input: UpdateProviderInput): Promise<Provider> {
    const row = await invoke<Record<string, unknown>>("update_provider", { input });
    return this.mapProvider(row);
  }
  async delete(id: string): Promise<void> {
    await invoke("delete_provider", { id });
  }
  async validate(input: ValidateProviderInput): Promise<{ valid: boolean; error?: string }> {
    return invoke("validate_provider", { input });
  }
}

class TauriModelService implements IModelService {
  async getAll(providerId?: string, includeDisabled?: boolean): Promise<Model[]> {
    const rows = await invoke<TauriModelRow[]>("get_models", { providerId: providerId || null, includeDisabled: includeDisabled || false });
    return rows.map(mapModel);
  }
  async create(input: CreateModelInput): Promise<Model> {
    const row = await invoke<TauriModelRow>("create_model", { input });
    return mapModel(row);
  }
  async update(input: UpdateModelInput): Promise<Model> {
    const row = await invoke<TauriModelRow>("update_model", { input });
    return mapModel(row);
  }
  async delete(id: string): Promise<void> {
    await invoke("delete_model", { id });
  }
}

class TauriAssistantService implements IAssistantService {
  async getAll(): Promise<Assistant[]> {
    const result = await invoke<Assistant[] | Assistant>("get_assistants");
    const rows = Array.isArray(result) ? result : [result];
    return rows.map((r) => mapAssistant(r as unknown as TauriAssistantRow));
  }
  async get(id: string): Promise<Assistant> {
    const row = await invoke<TauriAssistantRow>("get_assistants", { id });
    return mapAssistant(row);
  }
  async create(input: CreateAssistantInput): Promise<Assistant> {
    const row = await invoke<TauriAssistantRow>("create_assistant", { input });
    return mapAssistant(row);
  }
  async update(input: UpdateAssistantInput): Promise<Assistant> {
    const row = await invoke<TauriAssistantRow>("update_assistant", { input });
    return mapAssistant(row);
  }
  async delete(id: string): Promise<void> {
    await invoke("delete_assistant", { id });
  }
}

class TauriConversationService implements IConversationService {
  async getAll(): Promise<ConversationWithCount[]> {
    const rows = await invoke<TauriConversationRow[]>("get_conversations");
    return parseConversationsWithCount(rows.map(mapConversation));
  }
  async get(id: string): Promise<ConversationDetail> {
    const row = await invoke<TauriConversationDetail>("get_conversation", { id });
    return mapConversationDetail(row);
  }
  async create(input: CreateConversationInput): Promise<ConversationDetail> {
    const row = await invoke<TauriConversationDetail>("create_conversation", { input });
    return mapConversationDetail(row);
  }
  async update(id: string, title: string): Promise<ConversationDetail> {
    const row = await invoke<TauriConversationDetail>("update_conversation", { input: { id, title } });
    return mapConversationDetail(row);
  }
  async delete(id: string): Promise<void> {
    await invoke("delete_conversations", { id });
  }
  async deleteAll(): Promise<void> {
    await invoke("delete_conversations", { all: true });
  }
}

class TauriMessageService implements IMessageService {
  async get(conversationId: string): Promise<Message[]> {
    const rows = await invoke<TauriMessageRow[]>("get_messages", { conversationId });
    return parseMessages(rows.map(mapMessage));
  }
  async create(conversationId: string, role: string, content: string, thinking?: string, attachments?: string): Promise<Message> {
    const row = await invoke<TauriMessageRow>("create_message", {
      input: { conversationId, role, content, thinking: thinking || null, attachments: attachments || null },
    });
    return mapMessage(row);
  }
  async update(conversationId: string, messageId: string, content: string): Promise<void> {
    await invoke("update_message", { input: { messageId, conversationId, content } });
  }
  async delete(conversationId: string, messageId: string): Promise<void> {
    await invoke("delete_message", { messageId, conversationId });
  }
}

class TauriChatService implements IChatService {
  private unlisten: UnlistenFn | null = null;
  private unlistenError: UnlistenFn | null = null;
  private unlistenDone: UnlistenFn | null = null;

  async send(
    messages: ChatMessageInput[],
    modelId: string,
    conversationId: string | null,
    onToken: (token: string) => void,
    onDone: (fullContent: string) => void,
    onError: (error: string) => void,
  ): Promise<void> {
    let fullContent = "";
    let doneText: string | null = null;
    let runtimeError: string | null = null;

    this.unlisten = await listen<string>("chat-token", (event) => {
      const parsed = parseChatEvent({ type: "token", token: event.payload });
      if (parsed.type === "token") {
        fullContent += parsed.token;
        onToken(parsed.token);
      }
    });

    this.unlistenDone = await listen<string>("chat-done", (event) => {
      const parsed = parseChatEvent({ type: "done", text: event.payload, finishReason: "stop" });
      if (parsed.type === "done") {
        doneText = parsed.text;
      }
    });

    this.unlistenError = await listen<string>("chat-error", (event) => {
      const parsed = parseChatEvent({
        type: "error",
        error: {
          code: "CHAT_RUNTIME_ERROR",
          message: event.payload,
          status: null,
          retryable: false,
          details: null,
        },
      });
      if (parsed.type === "error") {
        runtimeError = parsed.error.message;
      }
    });

    try {
      await invoke("send_chat", {
        input: {
          messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content })),
          modelId,
          conversationId: conversationId || null,
        },
      });

      if (runtimeError) {
        onError(runtimeError);
        return;
      }

      const finalText = doneText ?? fullContent;
      if (!finalText.trim()) {
        onError("No response from provider. Check model ID/provider compatibility and API key.");
        return;
      }

      onDone(finalText);
    } catch (error) {
      onError(String(error));
    } finally {
      if (this.unlisten) {
        this.unlisten();
        this.unlisten = null;
      }
      if (this.unlistenDone) {
        this.unlistenDone();
        this.unlistenDone = null;
      }
      if (this.unlistenError) {
        this.unlistenError();
        this.unlistenError = null;
      }
    }
  }

  abort(): void {
    invoke("abort_chat").catch(() => {});
  }
}

class TauriSearchService implements ISearchService {
  async search(query: string): Promise<SearchResult[]> {
    const result = await invoke<{ results: SearchResult[] }>("search_messages", { query });
    return parseSearchResults(result.results || []);
  }
}

class TauriExportService implements IExportService {
  async export(): Promise<ExportData> {
    return parseExportData(await invoke("export_data"));
  }
}

class TauriStatsService implements IStatsService {
  async get(): Promise<Stats> {
    return parseStats(await invoke("get_stats"));
  }
}

class TauriResetService implements IResetService {
  async reset(): Promise<void> {
    await invoke("reset_data");
  }
}

export const tauriProviderService = new TauriProviderService();
export const tauriModelService = new TauriModelService();
export const tauriAssistantService = new TauriAssistantService();
export const tauriConversationService = new TauriConversationService();
export const tauriMessageService = new TauriMessageService();
export const tauriChatService = new TauriChatService();
export const tauriSearchService = new TauriSearchService();
export const tauriExportService = new TauriExportService();
export const tauriStatsService = new TauriStatsService();
export const tauriResetService = new TauriResetService();
