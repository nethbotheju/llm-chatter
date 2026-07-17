export type ProviderType = 
  | "openai" 
  | "anthropic" 
  | "google" 
  | "openai-compatible" 
  | "anthropic-compatible";

export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl?: string;
  apiKey?: string;
  enabled: boolean;
}

export interface ModelConfig {
  id: string;
  name: string;
  providerId: string;
  capabilities: string[];
  enabled: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  attachments?: Array<{ type: string; url: string }>;
  createdAt: Date;
}

export interface ChatConversation {
  id: string;
  title?: string;
  assistantId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
