"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { UIMessage, ChatTransport } from "ai";
import type { UseChatOptions } from "@ai-sdk/react";
import { isElectron } from "@llm-chatter/services";

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

    if (!options.isAbort && !options.isError && currentConversationIdRef.current && isElectron()) {
      try {
        const preview = options.message.parts
          .filter((p) => p.type === "text")
          .map((p) => (p as { text: string }).text)
          .join("")
          .slice(0, 120);
        await window.electronAPI!.notifications.show({
          title: "New response",
          body: preview || "(empty response)",
        });
      } catch (error) {
        console.error("Failed to show notification:", error);
      }
    }
  }, [fetchConversations]);

  return useMemo(
    () => ({ transport, onFinish, experimental_throttle: 50 }),
    [transport, onFinish],
  );
}
