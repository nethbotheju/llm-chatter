"use client";

import { useState, useCallback } from "react";
import {
  getModelService,
  getAppConfigService,
  ensureInit,
} from "@/lib/services";
import type { Model } from "@/lib/services";
import { parseModelCapabilities } from "@/lib/models";

const SELECTED_MODEL_KEY = "selected-model-id";

export function useModels() {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModelId, setSelectedModelIdState] = useState<string | null>(null);

  const setSelectedModelId = useCallback((id: string) => {
    setSelectedModelIdState(id);
    void getAppConfigService().set(SELECTED_MODEL_KEY, id);
  }, []);

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const hasVisionModel = selectedModel
    ? parseModelCapabilities(selectedModel.capabilities).includes("vision")
    : false;

  const fetchModels = useCallback(async () => {
    try {
      await ensureInit();
      const [data, storedId] = await Promise.all([
        getModelService().getAll(),
        getAppConfigService().get<string>(SELECTED_MODEL_KEY),
      ]);
      setModels(data);

      setSelectedModelIdState((prev) => {
        if (storedId && data.some((m) => m.id === storedId)) {
          return storedId;
        }
        if (prev && data.some((m) => m.id === prev)) {
          return prev;
        }
        if (data.length > 0) {
          void getAppConfigService().set(SELECTED_MODEL_KEY, data[0].id);
          return data[0].id;
        }
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
