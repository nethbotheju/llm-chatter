"use client";

import { useCallback, useMemo, useRef } from "react";
import type { UIMessage, ChatTransport } from "ai";
import type { UseChatOptions } from "@ai-sdk/react";
import { isTauri } from "@/lib/services";

export function useChatOptions(
  transport: ChatTransport<UIMessage> | undefined,
  fetchConversations: () => Promise<void>,
  currentConversationId: string | null,
): UseChatOptions<UIMessage> {
  const currentConversationIdRef = useRef(currentConversationId);
  currentConversationIdRef.current = currentConversationId;

  const onFinish = useCallback(async (options: { message: UIMessage; isAbort: boolean; isError: boolean }) => {
    await fetchConversations();

    if (isTauri() && !options.isAbort && !options.isError && currentConversationIdRef.current) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("save_assistant_message", {
          input: {
            conversationId: currentConversationIdRef.current,
            messageId: options.message.id,
            role: options.message.role,
            parts: JSON.stringify(options.message.parts),
            metadata: options.message.metadata ? JSON.stringify(options.message.metadata) : null,
          },
        });
      } catch (error) {
        console.error("Failed to save assistant message:", error);
      }
    }
  }, [fetchConversations]);

  return useMemo(() => ({ transport, onFinish }), [transport, onFinish]);
}
