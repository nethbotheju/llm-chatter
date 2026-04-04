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
  compact?: boolean;
}

export function ModelSelector({
  models,
  selectedModelId,
  onSelectModel,
  disabled,
  className,
  compact = false,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedModel = models.find((m) => m.id === selectedModelId);

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
      <div className="flex items-center gap-2 text-sm text-[var(--on-surface-variant)]">
        <span>No models available.</span>
        <Link
          href="/settings/providers"
          className="inline-flex items-center text-[var(--primary)] hover:underline"
        >
          <Settings className="mr-1 h-3 w-3" />
          Configure providers
        </Link>
      </div>
    );
  }

  if (compact) {
    return (
      <div ref={ref} className={cn("relative", className)}>
        <button
          type="button"
          onClick={() => !disabled && setOpen(!open)}
          disabled={disabled}
          className="flex items-center gap-1 text-sm font-semibold text-white transition-colors hover:text-[var(--primary)] disabled:opacity-50"
        >
          {selectedModel ? selectedModel.name : "Select a model"}
          <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-2 min-w-[220px] overflow-auto rounded-xl border border-white/10 bg-[var(--surface-container-highest)] shadow-2xl">
            {Object.entries(groupedModels).map(([providerId, { provider, models: providerModels }]) => (
              <div key={providerId}>
                <div className="sticky top-0 border-b border-white/5 bg-[var(--surface-container)] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[var(--on-surface-variant)]">
                  {provider?.name || "Unknown"}
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
                      "flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-[var(--surface-container-high)]",
                      model.id === selectedModelId
                        ? "text-[var(--primary)]"
                        : "text-[var(--on-surface)]"
                    )}
                  >
                    <span>{model.name}</span>
                    {model.id === selectedModelId && (
                      <Check className="h-4 w-4" />
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

  // Full dropdown (non-compact)
  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          open && "ring-1 ring-[var(--primary)]"
        )}
      >
        <span className="truncate text-[var(--on-surface)]">
          {selectedModel ? (
            <span>
              <span className="text-[var(--on-surface-variant)]">{selectedModel.provider?.name} / </span>
              {selectedModel.name}
            </span>
          ) : (
            "Select a model"
          )}
        </span>
        <ChevronDown className={cn("ml-2 h-4 w-4 text-[var(--on-surface-variant)]", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg border border-white/10 bg-[var(--surface-container-highest)] shadow-2xl">
          {Object.entries(groupedModels).map(([providerId, { provider, models: providerModels }]) => (
            <div key={providerId}>
              <div className="sticky top-0 border-b border-white/5 bg-[var(--surface-container)] px-3 py-1.5 text-xs font-medium text-[var(--on-surface-variant)]">
                {provider?.name || "Unknown Provider"}
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
                    "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-container-high)]",
                    model.id === selectedModelId && "bg-[var(--surface-container-high)] text-[var(--primary)]"
                  )}
                >
                  <span>{model.name}</span>
                  {model.id === selectedModelId && (
                    <Check className="h-4 w-4" />
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
