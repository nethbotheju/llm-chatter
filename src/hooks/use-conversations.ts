"use client";

import { useState, useCallback } from "react";
import { getConversationService, ensureInit } from "@/lib/services";
import type { ConversationWithCount } from "@/lib/services";

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationWithCount[]>([]);

  const fetchConversations = useCallback(async () => {
    try {
      await ensureInit();
      const data = await getConversationService().getAll();
      setConversations(data);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    }
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await ensureInit();
      await getConversationService().delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  }, []);

  return {
    conversations,
    fetchConversations,
    deleteConversation,
  };
}
