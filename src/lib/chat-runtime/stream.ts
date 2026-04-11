import { streamText } from "ai";
import type { ChatEventDTO } from "../contracts";
import { parseChatRequest } from "../contracts";
import { toChatError } from "./errors";
import { getRuntimeModel } from "./provider-client";
import type {
  ChatRuntimeEventStream,
  ChatRuntimeInput,
  ChatRuntimeOptions
} from "./types";

export async function* streamChatRuntimeEvents(
  input: ChatRuntimeInput,
  options?: ChatRuntimeOptions,
): ChatRuntimeEventStream {
  const normalized = parseChatRequest(input);

  try {
    const model = getRuntimeModel({
      model: normalized.model,
      provider: normalized.provider,
    });

    const messages = normalized.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const system = normalized.assistantConfig?.systemPrompt || undefined;
    const temperature = normalized.assistantConfig?.temperature ?? 0.7;
    const topP = normalized.assistantConfig?.topP ?? 1;

    const result = streamText({
      model,
      system,
      messages,
      temperature,
      topP,
      abortSignal: options?.signal,
    });

    let text = "";

    for await (const token of result.textStream) {
      text += token;
      options?.onToken?.(token);
      const event: ChatEventDTO = { type: "token", token };
      yield event;
    }

    const finishReason = (await result.finishReason) ?? null;
    const doneEvent: ChatEventDTO = {
      type: "done",
      text,
      finishReason: finishReason ? String(finishReason) : null,
    };

    options?.onDone?.({
      text,
      finishReason: doneEvent.finishReason ?? null,
    });

    yield doneEvent;
  } catch (error) {
    const chatError = toChatError(error);
    if (chatError.code === "CHAT_ABORTED") {
      options?.onAbort?.();
      yield { type: "abort" };
      return;
    }

    const errorEvent: ChatEventDTO = {
      type: "error",
      error: chatError.toDTO(),
    };
    options?.onError?.(chatError.toDTO());
    yield errorEvent;
  }
}
