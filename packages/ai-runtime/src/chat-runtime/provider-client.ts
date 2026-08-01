import type { LanguageModel } from "ai";
import { wrapLanguageModel, extractReasoningMiddleware } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { ChatProviderConfigDTO } from "@llm-chatter/contracts";
import { ChatError } from "./errors";

interface ProviderClientInput {
  model: string;
  provider: ChatProviderConfigDTO;
}

export function getRuntimeModel(input: ProviderClientInput): LanguageModel {
  const { model, provider } = input;
  const baseURL = provider.baseUrl?.trim() || undefined;

  switch (provider.type) {
    case "openai": {
      return createOpenAI({ apiKey: provider.apiKey, baseURL })(model);
    }
    case "openai-compatible": {
      if (!baseURL) {
        throw new ChatError({
          code: "MISSING_BASE_URL",
          message: "OpenAI-compatible providers require a base URL",
          status: 400,
          retryable: false,
        });
      }
      const baseModel = createOpenAICompatible({
        name: "openai-compatible",
        apiKey: provider.apiKey,
        baseURL,
      })(model);
      return wrapLanguageModel({
        model: baseModel,
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      });
    }
    case "anthropic": {
      return createAnthropic({ apiKey: provider.apiKey, baseURL })(model);
    }
    case "anthropic-compatible": {
      return createAnthropic({ apiKey: provider.apiKey, baseURL }).messages(model);
    }
    case "google": {
      return createGoogleGenerativeAI({
        apiKey: provider.apiKey,
        baseURL,
      })(model);
    }
    default:
      throw new ChatError({
        code: "UNSUPPORTED_PROVIDER",
        message: `Unsupported provider type: ${provider.type}`,
        status: 400,
        retryable: false,
      });
  }
}
