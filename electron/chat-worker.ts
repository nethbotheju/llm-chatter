import type { UIMessage } from "ai";
import { streamChatRuntime, ChatError } from "./chat-runtime";
import type { ResolvedToolSource, ChatToolStore } from "./chat-runtime";

interface StartPayload {
  messages: { id: string; role: string; parts: unknown }[];
  model: string;
  provider: { type: string; apiKey: string; baseUrl?: string | null };
  assistantConfig?: { systemPrompt: string; temperature: number; topP: number };
  messageId: string;
  modelSupportsTools?: boolean;
  toolSources?: ResolvedToolSource[];
}

let abortController = new AbortController();

process.on("uncaughtException", (err) => {
  process.parentPort.postMessage({ type: "error", payload: { code: "WORKER_CRASH", message: String(err?.message ?? err), stack: err?.stack } });
});

process.parentPort.on("message", (e: { data: unknown }) => {
  const msg = e.data as { type: string; payload?: StartPayload };
  if (msg.type === "abort") {
    abortController.abort();
    return;
  }

  if (msg.type !== "start" || !msg.payload) return;

  abortController = new AbortController();

  const { messages, model, provider, assistantConfig, messageId, modelSupportsTools, toolSources } = msg.payload;
  let finalMessage: UIMessage | undefined;

  const toolStore: ChatToolStore | undefined = toolSources
    ? { listEnabledToolSources: async () => toolSources }
    : undefined;

  (async () => {
    try {
      const result = await streamChatRuntime(
        {
          messages: messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant" | "system",
            parts: typeof m.parts === "string" ? JSON.parse(m.parts as string) : m.parts,
          })),
          model,
          provider: {
            type: provider.type as "openai" | "anthropic" | "google" | "openai-compatible" | "anthropic-compatible",
            apiKey: provider.apiKey,
            baseUrl: provider.baseUrl ?? undefined,
          },
          assistantConfig: assistantConfig
            ? {
                systemPrompt: assistantConfig.systemPrompt,
                temperature: assistantConfig.temperature,
                topP: assistantConfig.topP,
              }
            : undefined,
          modelSupportsTools,
          toolStore,
        },
        { signal: abortController.signal },
      );

      const stream = result.toUIMessageStream({
        generateMessageId: () => messageId,
        messageMetadata: () => ({ modelName: model }),
        sendReasoning: true,
        onFinish: ({ responseMessage }) => {
          finalMessage = responseMessage;
        },
      });
      const reader = stream.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        process.parentPort.postMessage({ type: "chunk", payload: value });
      }

      process.parentPort.postMessage({
        type: "done",
        payload: {
          parts: finalMessage?.parts ?? [],
          metadata: finalMessage?.metadata ?? null,
        },
      });
    } catch (err) {
      const error =
        err instanceof ChatError
          ? err.toDTO()
          : { code: "UNKNOWN", message: String(err) };
      process.parentPort.postMessage({ type: "error", payload: error });
    }
  })();
});
