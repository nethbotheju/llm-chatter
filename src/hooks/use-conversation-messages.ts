"use client";

import { useEffect, useRef, useCallback } from "react";
import type { UIMessage } from "ai";
import { getConversationService, ensureInit } from "@/lib/services";
import type { Assistant } from "@/lib/services";

export function useConversationMessages(
  setMessages: (messages: UIMessage[]) => void,
  setCurrentAssistant: (assistant: Assistant | null) => void,
  setCurrentConversationId: (id: string | null) => void,
  currentConversationId: string | null,
) {
  const prevConversationIdRef = useRef<string | null>(null);

  const fetchConversationMessages = useCallback(async (id: string) => {
    try {
      await ensureInit();
      const data = await getConversationService().get(id);
      if (data.messages) {
        const uiMessages: UIMessage[] = data.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system",
          parts: JSON.parse(m.parts),
          ...(m.metadata ? { metadata: JSON.parse(m.metadata) } : {}),
        }));
        setMessages(uiMessages);
      }
      if (data.assistant) {
        setCurrentAssistant(data.assistant);
      }
    } catch (error) {
      console.error("Failed to fetch conversation:", error);
    }
  }, [setMessages, setCurrentAssistant]);

  // React to currentConversationId changes directly (set by both URL navigation
  // and manual state updates via window.history.pushState/replaceState).
  // This avoids relying on usePathname() which doesn't update with pushState
  // in static export builds.
  useEffect(() => {
    if (currentConversationId === prevConversationIdRef.current) return;
    prevConversationIdRef.current = currentConversationId;

    if (currentConversationId) {
      fetchConversationMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId, fetchConversationMessages, setMessages]);

  // On initial mount, sync from the URL in case the user landed directly on /c/{id}
  useEffect(() => {
    const pathConversationId = window.location.pathname.match(/\/c\/([^/]+)/)?.[1] || null;
    if (pathConversationId && !currentConversationId) {
      setCurrentConversationId(pathConversationId);
    }
    prevConversationIdRef.current = currentConversationId;
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isNewChat = currentConversationId === null;

  return { isNewChat };
}
