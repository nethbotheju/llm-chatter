import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";

interface ElectronBody {
  modelId: string;
  conversationId?: string | null;
}

function getElectronChat() {
  const api = window.electronAPI?.chat;
  if (!api) throw new Error("Electron chat API not available");
  return api;
}

export class ElectronChatTransport implements ChatTransport<UIMessage> {
  async sendMessages({
    messages,
    body,
    abortSignal,
  }: {
    trigger: "submit-message" | "regenerate-message";
    chatId: string;
    messageId: string | undefined;
    messages: UIMessage[];
    abortSignal: AbortSignal | undefined;
    body?: object;
    headers?: Record<string, string> | Headers;
    metadata?: unknown;
  }): Promise<ReadableStream<UIMessageChunk>> {
    const { modelId, conversationId } = body as ElectronBody;
    const chat = getElectronChat();

    const config = await chat.resolve({
      modelId,
      conversationId: conversationId ?? null,
    });

    const streamId = await chat.start({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        parts: JSON.stringify(m.parts),
      })),
      model: config.model,
      provider: config.provider,
      assistantConfig: config.assistantConfig,
    });

    return new ReadableStream<UIMessageChunk>({
      start: (controller) => {
        const offChunk = chat.onChunk(streamId, (chunk: unknown) => {
          controller.enqueue(chunk as UIMessageChunk);
        });

        const offError = chat.onError(streamId, (err: unknown) => {
          cleanup();
          controller.error(err);
        });

        const offDone = chat.onDone(streamId, () => {
          cleanup();
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        });

        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          offChunk();
          offError();
          offDone();
        };

        abortSignal?.addEventListener("abort", () => {
          chat.abort(streamId);
          cleanup();
        });
      },
      cancel: () => {
        chat.abort(streamId);
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    return null;
  }
}
