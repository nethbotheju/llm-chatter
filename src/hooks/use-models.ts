"use client";

import { useState, useCallback } from "react";
import { getModelService, ensureInit } from "@/lib/services";
import type { Model } from "@/lib/services";
import { parseModelCapabilities } from "@/lib/models";

export function useModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const hasVisionModel = selectedModel
    ? parseModelCapabilities(selectedModel.capabilities).includes("vision")
    : false;

  const fetchModels = useCallback(async () => {
    try {
      await ensureInit();
      const data = await getModelService().getAll();
      setModels(data);
      setSelectedModelId((prev) => {
        if (data.length > 0 && !prev) {
          return data[0].id;
        }
        return prev;
      });
    } catch (error) {
      console.error("Failed to fetch models:", error);
    }
  }, []);

  return {
    models,
    selectedModelId,
    setSelectedModelId,
    selectedModel,
    hasVisionModel,
    fetchModels,
  };
}
