"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import type { UIMessage } from "ai";
import { getConversationService, ensureInit } from "@/lib/services";
import type { Assistant } from "@/lib/services";

export function useConversationMessages(
  setMessages: (messages: UIMessage[]) => void,
  setCurrentAssistant: (assistant: Assistant | null) => void,
  setCurrentConversationId: (id: string | null) => void,
  currentConversationId: string | null,
) {
  const pathname = usePathname();
  const pathConversationId = pathname.match(/\/c\/([^/]+)/)?.[1] || null;
  const isNewChat = pathname === "/";

  const conversationIdRef = useRef<string | null>(currentConversationId);
  conversationIdRef.current = currentConversationId;

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

  useEffect(() => {
    if (pathConversationId && pathConversationId !== conversationIdRef.current) {
      conversationIdRef.current = pathConversationId;
      setCurrentConversationId(pathConversationId);
      fetchConversationMessages(pathConversationId);
    } else if (isNewChat && conversationIdRef.current !== null) {
      conversationIdRef.current = null;
      setCurrentConversationId(null);
    }
  }, [pathConversationId, isNewChat, fetchConversationMessages, setCurrentConversationId]);

  return { pathConversationId, isNewChat };
}
