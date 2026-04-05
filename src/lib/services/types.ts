export interface Provider {
  id: string;
  name: string;
  type: "openai" | "anthropic" | "google" | "openai-compatible" | "anthropic-compatible";
  baseUrl?: string | null;
  hasApiKey: boolean;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  provider: {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
  };
}

export interface Assistant {
  id: string;
  name: string;
  image?: string | null;
  systemPrompt: string;
  temperature: number;
  topP: number;
  enabled: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  assistantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends Conversation {
  messages: Message[];
  assistant: Assistant | null;
}

export interface ConversationWithCount extends Conversation {
  _count: { messages: number };
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string | null;
  attachments?: string | null;
  createdAt: string;
}

export interface SearchResult {
  conversationId: string;
  conversationTitle: string;
  messageId: string;
  snippet: string;
  createdAt: string;
}

export interface ExportData {
  exportedAt: string;
  conversations: Array<{
    id: string;
    title: string | null;
    assistant: string;
    createdAt: string;
    messages: Array<{
      role: string;
      content: string;
      thinking?: string | null;
      createdAt: string;
    }>;
  }>;
}

export interface Stats {
  conversations: number;
  messages: number;
}

export interface ChatMessageInput {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

export interface CreateProviderInput {
  name: string;
  type: string;
  baseUrl?: string;
  apiKey?: string;
  enabled?: boolean;
}

export interface UpdateProviderInput {
  id: string;
  name?: string;
  type?: string;
  baseUrl?: string;
  apiKey?: string;
  enabled?: boolean;
}

export interface CreateModelInput {
  name: string;
  providerId: string;
  capabilities?: string[];
  enabled?: boolean;
}

export interface UpdateModelInput {
  id: string;
  name?: string;
  capabilities?: string[];
  enabled?: boolean;
}

export interface CreateAssistantInput {
  name: string;
  systemPrompt: string;
  temperature?: number;
  topP?: number;
  isDefault?: boolean;
  enabled?: boolean;
}

export interface UpdateAssistantInput {
  id: string;
  name?: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  isDefault?: boolean;
  enabled?: boolean;
  image?: string | null;
}

export interface CreateConversationInput {
  assistantId?: string;
  title?: string;
}

export interface ValidateProviderInput {
  providerId?: string;
  name?: string;
  type?: string;
  baseUrl?: string;
  apiKey?: string;
}
