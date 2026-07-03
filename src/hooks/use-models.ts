"use client";

import { useState, useCallback } from "react";
import { getModelService, ensureInit } from "@/lib/services";
import type { Model } from "@/lib/services";
import { parseModelCapabilities } from "@/lib/models";

const STORAGE_KEY = "llm-chatter:selected-model-id";

function getStoredModelId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function persistModelId(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

export function useModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelIdState] = useState<string | null>(null);

  const setSelectedModelId = useCallback((id: string) => {
    setSelectedModelIdState(id);
    persistModelId(id);
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const hasVisionModel = selectedModel
    ? parseModelCapabilities(selectedModel.capabilities).includes("vision")
    : false;

  const fetchModels = useCallback(async () => {
    try {
      await ensureInit();
      const data = await getModelService().getAll();
      setModels(data);

      const storedId = getStoredModelId();
      setSelectedModelIdState((prev) => {
        // Honor the persisted selection if the model still exists.
        if (storedId && data.some((m) => m.id === storedId)) {
          return storedId;
        }
        // Keep an in-memory selection if it is still valid.
        if (prev && data.some((m) => m.id === prev)) {
          return prev;
        }
        // Otherwise default to the first model and persist that choice.
        if (data.length > 0) {
          persistModelId(data[0].id);
          return data[0].id;
        }
        persistModelId(null);
        return null;
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
