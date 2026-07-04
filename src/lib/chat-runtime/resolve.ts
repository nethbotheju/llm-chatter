import { providerTypeSchema } from "../contracts";
import type { ChatProviderConfigDTO, ChatAssistantConfigDTO } from "../contracts";
import { ChatError } from "./errors";
import {
  getAcceptedAttachmentKinds,
  type AttachmentKind,
} from "../models";

export interface ChatConfigInput {
  modelId: string;
  conversationId?: string | null;
}

export interface ChatConfigProviderRow {
  type: string;
  enabled: boolean;
  baseUrl: string | null;
  apiKeyEncrypted: string | null;
}

export interface ChatConfigModelRow {
  name: string;
  enabled: boolean;
  capabilities?: string | null;
  metadata?: string | null;
  provider: ChatConfigProviderRow | null;
}

export interface ChatConfigAssistantRow {
  systemPrompt: string;
  temperature: number;
  topP: number;
}

export interface ChatConfigConversationRow {
  assistant: ChatConfigAssistantRow | null;
}

export interface ChatConfigStore {
  findModelWithProvider(modelId: string): Promise<ChatConfigModelRow | null>;
  findConversationWithAssistant(conversationId: string): Promise<ChatConfigConversationRow | null>;
  decrypt(encrypted: string): string;
}

export interface ResolvedChatConfig {
  model: string;
  provider: ChatProviderConfigDTO;
  assistantConfig: ChatAssistantConfigDTO;
  modelSupportsTools: boolean;
  acceptedAttachmentKinds: AttachmentKind[];
}

const DEFAULT_ASSISTANT_CONFIG: ChatAssistantConfigDTO = {
  systemPrompt: "",
  temperature: 0.7,
  topP: 1,
};

export async function resolveChatConfig(
  input: ChatConfigInput,
  store: ChatConfigStore,
): Promise<ResolvedChatConfig> {
  const model = await store.findModelWithProvider(input.modelId);
  if (!model || !model.provider) {
    throw new ChatError({
      code: "MODEL_NOT_FOUND",
      message: "Model not found",
      status: 404,
      retryable: false,
    });
  }

  if (!model.provider.enabled || !model.enabled) {
    throw new ChatError({
      code: "MODEL_DISABLED",
      message: "Model or provider is disabled",
      status: 400,
      retryable: false,
    });
  }

  const apiKeyEncrypted = model.provider.apiKeyEncrypted;
  if (!apiKeyEncrypted) {
    throw new ChatError({
      code: "API_KEY_NOT_CONFIGURED",
      message: "Provider API key is not configured",
      status: 400,
      retryable: false,
    });
  }

  const provider: ChatProviderConfigDTO = {
    type: providerTypeSchema.parse(model.provider.type),
    apiKey: store.decrypt(apiKeyEncrypted),
    baseUrl: model.provider.baseUrl,
  };

  const capabilities = parseCapabilities(model.capabilities);
  const modelSupportsTools = capabilities.includes("tools");
  const acceptedAttachmentKinds = getAcceptedAttachmentKinds(
    model.capabilities ?? "",
    model.metadata,
  );

  let assistantConfig: ChatAssistantConfigDTO = { ...DEFAULT_ASSISTANT_CONFIG };
  if (input.conversationId) {
    const conversation = await store.findConversationWithAssistant(input.conversationId);
    if (conversation?.assistant) {
      assistantConfig = {
        systemPrompt: conversation.assistant.systemPrompt,
        temperature: conversation.assistant.temperature,
        topP: conversation.assistant.topP,
      };
    }
  }

  return { model: model.name, provider, assistantConfig, modelSupportsTools, acceptedAttachmentKinds };
}

function parseCapabilities(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === "string") : [];
  } catch {
    return [];
  }
}
