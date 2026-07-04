import type { UIMessage } from "ai";
import type { ChatProviderConfigDTO, ChatAssistantConfigDTO } from "../contracts";
import type { BuiltinConfig } from "../builtin-tools";
import type { AttachmentKind } from "../models";

export interface ChatRuntimeInput {
  messages: UIMessage[];
  model: string;
  provider: ChatProviderConfigDTO;
  assistantConfig?: ChatAssistantConfigDTO;
  modelSupportsTools?: boolean;
  acceptedAttachmentKinds?: AttachmentKind[];
  toolStore?: ChatToolStore;
}

export type McpTransport = "builtin" | "stdio" | "http" | "sse";

export interface ResolvedToolSource {
  id: string;
  slug: string;
  transport: McpTransport;
  enabled: boolean;
  isBuiltin: boolean;
  builtinConfig?: BuiltinConfig;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface ChatToolStore {
  listEnabledToolSources(): Promise<ResolvedToolSource[]>;
}

export const MAX_TOOL_STEPS = 8;
