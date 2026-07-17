import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { decrypt } from "./encryption";

export interface Provider {
  id: string;
  name: string;
  type: string;
  baseUrl: string | null;
  apiKeyEncrypted: string | null;
  catalogId: string | null;
  lastSyncedAt: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export function getProviderClient(provider: Provider): any {
  const apiKey = provider.apiKeyEncrypted 
    ? decrypt(provider.apiKeyEncrypted) 
    : undefined;

  switch (provider.type) {
    case "openai":
      return createOpenAI({
        apiKey,
        baseURL: provider.baseUrl || undefined,
      });
    
    case "openai-compatible": {
      // Use chat completions API for compatible providers
      const client = createOpenAI({
        apiKey,
        baseURL: provider.baseUrl || undefined,
      });
      return (modelId: string) => client.chat(modelId);
    }
    
    case "anthropic":
      return createAnthropic({
        apiKey,
        baseURL: provider.baseUrl || undefined,
      });
    
    case "anthropic-compatible": {
      const client = createAnthropic({
        apiKey,
        baseURL: provider.baseUrl || undefined,
      });
      return (modelId: string) => client.messages(modelId);
    }
    
    case "google":
      return createGoogleGenerativeAI({
        apiKey,
        baseURL: provider.baseUrl || undefined,
      });
    
    default:
      throw new Error(`Unknown provider type: ${provider.type}`);
  }
}
