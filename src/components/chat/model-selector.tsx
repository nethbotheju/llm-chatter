"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Model {
  id: string;
  name: string;
  providerId: string;
  capabilities: string;
  enabled: boolean;
  provider?: {
    id: string;
    name: string;
    type: string;
    enabled: boolean;
  };
}

interface ModelSelectorProps {
  models: Model[];
  selectedModelId: string | null;
  onSelectModel: (modelId: string) => void;
  disabled?: boolean;
  className?: string;
}

const providerTypeLabels: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  "openai-compatible": "Custom",
  "anthropic-compatible": "Custom",
};

const providerTypeColors: Record<string, string> = {
  openai: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  anthropic: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  google: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "openai-compatible": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "anthropic-compatible": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export function ModelSelector({
  models,
  selectedModelId,
  onSelectModel,
  disabled,
  className,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId);

  // Group models by provider
  const groupedModels = models.reduce(
    (acc, model) => {
      const providerKey = model.provider?.id || "unknown";
      if (!acc[providerKey]) {
        acc[providerKey] = {
          provider: model.provider,
          models: [],
        };
      }
      acc[providerKey].models.push(model);
      return acc;
    },
    {} as Record<string, { provider?: Model["provider"]; models: Model[] }>
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (models.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>No models available.</span>
        <Link
          href="/settings/providers"
          className="inline-flex items-center text-primary hover:underline"
        >
          <Settings className="mr-1 h-3 w-3" />
          Configure providers
        </Link>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-1 ring-ring"
        )}
      >
        <span className="truncate">
          {selectedModel ? (
            <span>
              <span className="text-muted-foreground">{selectedModel.provider?.name} / </span>
              {selectedModel.name}
            </span>
          ) : (
            "Select a model"
          )}
        </span>
        <ChevronDown className={cn("ml-2 h-4 w-4 opacity-50", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-md border bg-popover shadow-lg">
          {Object.entries(groupedModels).map(([providerId, { provider, models: providerModels }]) => (
            <div key={providerId}>
              <div className="sticky top-0 flex items-center justify-between bg-muted/50 px-3 py-1.5 text-xs font-medium">
                <span>{provider?.name || "Unknown Provider"}</span>
                {provider?.type && (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium",
                      providerTypeColors[provider.type] || "bg-muted"
                    )}
                  >
                    {providerTypeLabels[provider.type] || provider.type}
                  </span>
                )}
              </div>
              {providerModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(model.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted",
                    model.id === selectedModelId && "bg-muted"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {model.name}
                    {model.capabilities && (
                      <span className="text-xs text-muted-foreground">
                        {JSON.parse(model.capabilities).join(", ")}
                      </span>
                    )}
                  </span>
                  {model.id === selectedModelId && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
