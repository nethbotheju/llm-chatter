import { streamText } from "ai";
import {
  parseChatRequest,
  type ChatEventDTO,
  type ChatRequestDTO,
} from "../contracts";
import { ChatError, toChatError } from "./errors";
import { getRuntimeModel } from "./provider-client";
import type {
  ChatRuntimeEventStream,
  ChatRuntimeInput,
  ChatRuntimeOptions,
  ChatRuntimeOutput,
} from "./types";

function normalizeInput(input: ChatRuntimeInput): ChatRequestDTO {
  return parseChatRequest(input);
}

export async function runChatRuntime(
  input: ChatRuntimeInput,
  options?: ChatRuntimeOptions,
): Promise<ChatRuntimeOutput> {
  const normalized = normalizeInput(input);

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
    }

    const finishReason = (await result.finishReason) ?? null;
    const output = {
      text,
      finishReason: finishReason ? String(finishReason) : null,
    };

    options?.onDone?.(output);
    return output;
  } catch (error) {
    const chatError = toChatError(error);
    options?.onError?.(chatError.toDTO());
    throw chatError;
  }
}

export async function* streamChatRuntimeEvents(
  input: ChatRuntimeInput,
  options?: ChatRuntimeOptions,
): ChatRuntimeEventStream {
  const normalized = normalizeInput(input);

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

    throw new ChatError(chatError.toDTO());
  }
}

export type {
  ChatRuntimeInput,
  ChatRuntimeOutput,
  ChatRuntimeOptions,
  ChatRuntimeEventStream,
} from "./types";
export { ChatError } from "./errors";
