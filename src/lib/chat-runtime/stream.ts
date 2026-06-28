import { streamText, convertToModelMessages, stepCountIs } from "ai";
import type { UIMessage, Tool } from "ai";
import { getRuntimeModel } from "./provider-client";
import { getBuiltinTools } from "../builtin-tools/registry";
import type { ChatRuntimeInput } from "./types";
import { MAX_TOOL_STEPS } from "./types";

export async function streamChatRuntime(
  input: ChatRuntimeInput,
  options?: { signal?: AbortSignal },
) {
  const {
    messages,
    model: modelName,
    provider,
    assistantConfig,
    modelSupportsTools,
    toolStore,
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

  const tools = await resolveTools(modelSupportsTools ?? false, toolStore);

  const result = streamText({
    model,
    system,
    messages: modelMessages,
    temperature,
    topP,
    abortSignal: options?.signal,
    ...(tools && Object.keys(tools).length > 0
      ? { tools, stopWhen: stepCountIs(MAX_TOOL_STEPS) }
      : {}),
  });

  return result;
}

async function resolveTools(
  modelSupportsTools: boolean,
  toolStore: ChatRuntimeInput["toolStore"],
): Promise<Record<string, Tool> | undefined> {
  if (!modelSupportsTools || !toolStore) return undefined;

  const sources = await toolStore.listEnabledToolSources();
  const merged: Record<string, Tool> = {};

  for (const source of sources) {
    if (!source.enabled) continue;
    if (source.transport === "builtin" && source.builtinConfig) {
      const builtinTools = getBuiltinTools({
        enabled: source.builtinConfig.enabled,
        configs: source.builtinConfig.configs,
      });
      Object.assign(merged, builtinTools);
    }
  }

  return merged;
}
