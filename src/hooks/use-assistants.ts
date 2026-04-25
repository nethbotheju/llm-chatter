"use client";

import { useState, useCallback } from "react";
import { getAssistantService, ensureInit } from "@/lib/services";
import type { Assistant } from "@/lib/services";

export function useAssistants() {
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [currentAssistant, setCurrentAssistant] = useState<Assistant | null>(null);

  const fetchAssistants = useCallback(async () => {
    try {
      await ensureInit();
      const service = getAssistantService();
      let data = await service.getAll();

      if (data.length === 0) {
        await service.create({
          name: "General",
          systemPrompt:
            "You are a helpful, harmless, and honest AI assistant. Provide clear, accurate, and thoughtful responses.",
          temperature: 0.7,
          topP: 1.0,
          isDefault: true,
          enabled: true,
        });
        data = await service.getAll();
      }

      setAssistants(data);
      setCurrentAssistant((prev) => {
        if (!prev) {
          const enabled = data.filter((a: Assistant) => a.enabled);
          return enabled.find((a: Assistant) => a.isDefault) || enabled[0] || null;
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to fetch assistants:", error);
    }
  }, []);

  const selectAssistant = useCallback((assistant: Assistant) => {
    setCurrentAssistant(assistant);
  }, []);

  return {
    assistants,
    currentAssistant,
    setCurrentAssistant,
    selectAssistant,
    fetchAssistants,
  };
}
