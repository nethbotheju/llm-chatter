import type { ModelMessage } from "ai";
import type {
  ChatAssistantConfigDTO,
  ChatEventDTO,
  ChatRequestDTO,
} from "../contracts";

export function buildRuntimeMessages(input: ChatRequestDTO): ModelMessage[] {
  const assistantConfig: ChatAssistantConfigDTO = {
    systemPrompt: input.assistantConfig?.systemPrompt ?? "",
    temperature: input.assistantConfig?.temperature ?? 0.7,
    topP: input.assistantConfig?.topP ?? 1,
  };

  const baseMessages: ModelMessage[] = input.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

  if (!assistantConfig.systemPrompt) {
    return baseMessages;
  }

  return [
    {
      role: "system",
      content: assistantConfig.systemPrompt,
    },
    ...baseMessages,
  ];
}

export function isAbortEvent(event: ChatEventDTO): boolean {
  return event.type === "abort";
}
