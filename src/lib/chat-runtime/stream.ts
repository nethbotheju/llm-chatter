import { streamText, convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { getRuntimeModel } from "./provider-client";
import type { ChatRuntimeInput } from "./types";

export async function streamChatRuntime(
  input: ChatRuntimeInput,
  options?: { signal?: AbortSignal },
) {
  const {
    messages,
    model: modelName,
    provider,
    assistantConfig,
  } = input;

  const model = getRuntimeModel({
    model: modelName,
    provider,
  });

  const modelMessages = await convertToModelMessages(
    messages as UIMessage[],
  );

  const system = assistantConfig?.systemPrompt || undefined;
  const temperature = assistantConfig?.temperature ?? 0.7;
  const topP = assistantConfig?.topP ?? 1;

  const result = streamText({
    model,
    system,
    messages: modelMessages,
    temperature,
    topP,
    abortSignal: options?.signal,
  });

  return result;
}
