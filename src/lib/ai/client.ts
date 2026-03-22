import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { Provider } from "@prisma/client";
import { decrypt } from "./encryption";

export function getProviderClient(provider: Provider) {
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
