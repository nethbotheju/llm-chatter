"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UIMessage, ChatTransport } from "ai";
import type { UseChatOptions } from "@ai-sdk/react";
import { isElectron } from "@/lib/services";

export function useChatOptions(
  transport: ChatTransport<UIMessage> | undefined,
  fetchConversations: () => Promise<void>,
  currentConversationId: string | null,
): UseChatOptions<UIMessage> {
  const currentConversationIdRef = useRef(currentConversationId);
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  });

  const onFinish = useCallback(async (options: { message: UIMessage; isAbort: boolean; isError: boolean }) => {
    await fetchConversations();

    if (!options.isAbort && !options.isError && currentConversationIdRef.current) {
      try {
        if (isElectron()) {
          await window.electronAPI!.messages.create({
            conversationId: currentConversationIdRef.current,
            role: options.message.role,
            parts: JSON.stringify(options.message.parts),
            metadata: options.message.metadata ? JSON.stringify(options.message.metadata) : null,
          });

          const preview = options.message.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as { text: string }).text)
            .join("")
            .slice(0, 120);
          await window.electronAPI!.notifications.show({
            title: "New response",
            body: preview || "(empty response)",
          });
        }
      } catch (error) {
        console.error("Failed to save assistant message:", error);
      }
    }
  }, [fetchConversations]);

  return useMemo(() => ({ transport, onFinish }), [transport, onFinish]);
}
